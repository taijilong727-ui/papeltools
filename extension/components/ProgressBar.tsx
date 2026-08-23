import type { ConversionProgress, ConversionStage } from '../lib/engine';

/**
 * ProgressBar — 转换进度显示
 *
 * 显示：
 * - 文件名（截断）
 * - 当前阶段标签（parsing / extracting-text / ocr / assembling / done / error / cancelled）
 * - 逐页进度（currentPage / totalPages）
 * - 进度条（百分比填充）
 * - 取消按钮（仅 converting 时显示）
 *
 * 阶段文案硬编码英文（MVP 单语；v1.1 三语化参考 next-intl 字典结构）。
 */

interface ProgressBarProps {
  progress: ConversionProgress | null;
  filename: string;
  onCancel: () => void;
}

const STAGE_LABELS: Record<ConversionStage, string> = {
  idle: 'Preparing',
  parsing: 'Parsing',
  'extracting-text': 'Extracting text',
  ocr: 'OCR',
  assembling: 'Finalizing Markdown',
  done: 'Done',
  error: 'Error',
  cancelled: 'Cancelled',
};

/**
 * 计算进度百分比
 *
 * - 已完成（stage='done'）→ 100%
 * - 已知总页数 → currentPage / totalPages
 * - 未知总页数（如解析阶段） → 0%（进度条占位待命）
 */
function computePercent(progress: ConversionProgress | null): number {
  if (!progress) return 0;
  if (progress.stage === 'done') return 100;
  const total = progress.totalPages;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((progress.currentPage / total) * 100));
}

export function ProgressBar({ progress, filename, onCancel }: ProgressBarProps) {
  const stage = progress?.stage ?? 'idle';
  const label = STAGE_LABELS[stage];
  const total = progress?.totalPages ?? 0;
  const current = progress?.currentPage ?? 0;
  const percent = computePercent(progress);
  const showPageCount = total > 0 && stage !== 'done';

  return (
    <div className="progress" role="region" aria-label="Conversion progress">
      <div className="progress__meta">
        <span className="progress__filename" title={filename}>
          [{filename}]
        </span>
        <span className="progress__stage" aria-live="polite">
          {label}
          {showPageCount ? ` (${current}/${total})` : ''}
        </span>
      </div>

      <div
        className="progress__bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${label}, ${percent}% complete`}
      >
        <div className="progress__bar-fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="progress__actions">
        <button
          type="button"
          className="progress__cancel"
          onClick={onCancel}
          aria-label="Cancel conversion and return to start"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}