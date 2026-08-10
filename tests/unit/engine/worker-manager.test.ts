/**
 * WorkerManager 单元测试 — Worker 生命周期 / 崩溃重试（M-08）/ 取消
 *
 * 对应测试策略：验收 A-07（Worker 崩溃恢复：自动重试 1 次，仍失败展示错误码）
 *
 * jsdom 无 Worker 实现，测试用 FakeWorker 桩替代，模拟 postMessage 回传。
 *
 * ⚠️ 已知问题（docs/代码审查与修复方案-2026-08-05.md §2.3）：
 * dispatch() 用 postMessage(request, [request.buffer]) 转移 buffer，
 * 崩溃重试时 buffer 已 detached → 第二次 postMessage 抛 DataCloneError。
 * 因此"崩溃后重试成功"用例在修复 2.3 前为红（TDD 用例），修复后转绿。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorkerManager } from '@/lib/engine/worker-manager';
import type { ConversionResult } from '@/lib/engine/types';

/** 最小 Worker 桩：记录 postMessage，允许测试手动触发 message/error 事件 */
class FakeWorker {
  public listeners: Record<string, Array<(e: unknown) => void>> = { message: [], error: [] };
  public posted: unknown[] = [];
  public terminated = false;

  constructor(_url?: string | URL, _options?: WorkerOptions) {}

  addEventListener(type: string, cb: (e: unknown) => void): void {
    this.listeners[type] ??= [];
    this.listeners[type].push(cb);
  }
  removeEventListener(type: string, cb: (e: unknown) => void): void {
    this.listeners[type] = (this.listeners[type] ?? []).filter((f) => f !== cb);
  }
  postMessage(msg: unknown): void {
    this.posted.push(msg);
  }
  terminate(): void {
    this.terminated = true;
  }

  /** 测试辅助：模拟 worker 回传消息 */
  emitMessage(data: unknown): void {
    this.listeners.message.forEach((cb) => cb({ data } as MessageEvent));
  }
  /** 测试辅助：模拟 worker 崩溃 */
  emitError(message = 'worker exploded'): void {
    this.listeners.error.forEach((cb) => cb({ message } as ErrorEvent));
  }
}

describe('WorkerManager — M-08 崩溃重试与生命周期', () => {
  let worker: FakeWorker;
  let manager: WorkerManager;

  function makeResult(overrides: Partial<ConversionResult> = {}): ConversionResult {
    return {
      markdown: '# ok',
      filename: 'out.md',
      metadata: { pages: 1, words: 2, chars: 4, tokens: 2, durationMs: 10 },
      ...overrides,
    };
  }

  beforeEach(() => {
    worker = new FakeWorker();
    vi.stubGlobal('Worker', vi.fn(() => worker));
    manager = new WorkerManager();
  });

  afterEach(() => {
    manager.destroy();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('正常流程：worker 回传 done → onDone 回调 + 进度回调', () => {
    const onDone = vi.fn();
    const onProgress = vi.fn();
    manager.convert(new ArrayBuffer(8), {}, 'test.pdf', { onDone, onProgress });

    const id = (worker.posted[0] as { id: string }).id;
    worker.emitMessage({ type: 'progress', id, progress: { stage: 'parsing', currentPage: 1, totalPages: 3 } });
    worker.emitMessage({ type: 'done', id, result: makeResult() });

    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ stage: 'parsing' }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ markdown: '# ok' }));
  });

  it('正常流程：worker 回传 error → onError 回调（ConversionError 带 code）', () => {
    const onError = vi.fn();
    manager.convert(new ArrayBuffer(8), {}, 'test.pdf', { onError });

    const id = (worker.posted[0] as { id: string }).id;
    worker.emitMessage({ type: 'error', id, code: 'corrupted_pdf', message: 'corrupt' });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'corrupted_pdf' }));
  });

  it('过期消息（id 不匹配当前任务）被忽略', () => {
    const onDone = vi.fn();
    const onError = vi.fn();
    manager.convert(new ArrayBuffer(8), {}, 'a.pdf', { onDone, onError });

    worker.emitMessage({ type: 'done', id: 'stale-id', result: makeResult() });
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('M-08 崩溃重试：worker error 事件 → 重建 Worker + 重试 1 次成功', () => {
    vi.useFakeTimers();
    const onDone = vi.fn();
    const onError = vi.fn();
    const onProgress = vi.fn();
    manager.convert(new ArrayBuffer(8), {}, 'test.pdf', { onDone, onError, onProgress });

    const id = (worker.posted[0] as { id: string }).id;
    // 第一次崩溃
    worker.emitError('script error');
    expect(worker.terminated).toBe(true); // 旧 worker 被销毁

    // 延迟 100ms 后重建并重发任务
    vi.advanceTimersByTime(100);
    // worker 已被重建：posted 应有第二条 convert 请求
    expect(worker.posted).toHaveLength(2);
    expect(worker.posted[1]).toMatchObject({ type: 'convert', id });
    // 通知 UI "自动重试中"
    expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({ stage: 'parsing' }));

    // 重试成功
    worker.emitMessage({ type: 'done', id, result: makeResult() });
    expect(onDone).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    // ✅ 关联审查 2.3：用 pendingBufferCopy 备份副本（原 buffer 转移后 detached 不可用），
    //    修复前此处会因 DataCloneError 走 onError('unknown')，现已稳定通过
  });

  it('M-08 重试耗尽：仍失败 → onError worker_crashed', () => {
    vi.useFakeTimers();
    const onError = vi.fn();
    manager.convert(new ArrayBuffer(8), {}, 'test.pdf', { onError });

    const id = (worker.posted[0] as { id: string }).id;
    // 第一次崩溃（触发重试）
    worker.emitError('crash 1');
    vi.advanceTimersByTime(100);
    // 重试期间再次崩溃（超过 maxRetries=1）
    worker.emitError('crash 2');

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'worker_crashed' }));
    // 不再调度重试（无第三次 convert 请求）
    vi.advanceTimersByTime(500);
    expect(worker.posted.filter((m) => (m as { type?: string }).type === 'convert')).toHaveLength(2);
  });

  it('取消：cancel() → 向 worker 发送 cancel 消息（不触发 onError）', () => {
    const onError = vi.fn();
    const onDone = vi.fn();
    const { cancel } = manager.convert(new ArrayBuffer(8), {}, 'test.pdf', { onError, onDone });

    cancel();
    // 1. 通知 worker 终止
    expect(worker.posted.some((m) => (m as { type?: string }).type === 'cancel')).toBe(true);
    // 2. 取消不是错误：UI 通过 status 流转感知，不再走 onError 回调（审查 3.7 + 第二轮 P1）
    expect(onError).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('环境不支持 Worker 时抛出 ConversionError', () => {
    vi.stubGlobal('Worker', undefined);
    const onError = vi.fn();
    manager.convert(new ArrayBuffer(8), {}, 'test.pdf', { onError });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'unknown' }));
  });
});
