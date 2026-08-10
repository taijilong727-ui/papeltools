/**
 * 组件测试专用配置
 *
 * 用途：单独运行组件测试（不跑单元测试）：
 *   vitest run -c tests/vitest.config.ts
 * 或 npm run test:components
 *
 * 参考：docs/具体架构分析-2026-08-04.md §四 目录结构（tests/vitest.config.ts）
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 本配置文件位于 tests/ 下，需回退一级到项目根
      '@': path.resolve(__dirname, '..'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/components/**/*.test.tsx'],
    setupFiles: ['tests/helpers/setup.ts'],
  },
});
