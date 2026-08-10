/**
 * Vitest 根配置（单元 + 组件测试统一入口）
 *
 * 参考：docs/测试策略与计划-2026-08-04.md §5.1
 * - 单元测试：tests/unit/**（引擎纯函数 + lib 工具）
 * - 组件测试：tests/components/**（Testing Library + jsdom）
 * - 覆盖率只关注核心引擎 lib/engine/**
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // 与 tsconfig.json 的 paths 保持一致
      '@': path.resolve(__dirname),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom', // 组件测试需要 DOM；纯函数测试不受影响
    include: ['tests/unit/**/*.test.ts', 'tests/components/**/*.test.tsx'],
    setupFiles: ['tests/helpers/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['lib/engine/**'], // 只覆盖核心引擎（测试策略 P-1：不追求高覆盖率）
    },
  },
});
