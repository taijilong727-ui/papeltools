/**
 * ESLint flat config（ESLint 9 / Next.js 16）
 *
 * 背景：Next.js 16 移除了 `next lint` 命令，必须直接用 eslint CLI + flat config。
 * 组合 eslint-config-next 的两个 flat 预设：
 * - core-web-vitals（Next.js 核心规则 + react-hooks）
 * - typescript（TypeScript 规则，需显式引入，因项目开启 strict）
 *
 * 参考：https://nextjs.org/docs/app/api-reference/config/eslint#flat-config
 */

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  // 全局忽略：构建产物、依赖、测试临时文件
  globalIgnores([
    '.next/**',
    'out/**',
    'node_modules/**',
    'next-env.d.ts',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
    // OCR 运行时资源（scripts/download-ocr-models.ts 下载的压缩产物）
    'public/ocr/**',
    // 工具脚本输出
    'scripts/*.mjs',
  ]),
  ...nextVitals,
  ...nextTs,
  // 项目级覆盖：统一中文注释偏好、放宽规则
  {
    rules: {
      // 组件文件允许任何命名导出（本项目组件均具名导出）
      'import/no-anonymous-default-export': 'off',
    },
  },
]);
