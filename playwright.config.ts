/**
 * Playwright E2E 配置
 *
 * 参考：docs/测试策略与计划-2026-08-04.md §5.2
 * - 覆盖 T-03（核心流程）/ T-04（隐私）/ T-05（性能）/ T-06（错误路径）
 * - webServer 复用本地 dev server（3000 端口已存在则复用）
 * - 性能用例（T-05）建议针对生产构建运行（见 performance.spec.ts 头部注释）
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000, // 单个用例最长 60 秒（测试策略 P-4）
  retries: 1, // 失败重试 1 次
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000, // dev server 首次编译可能较慢
  },
});
