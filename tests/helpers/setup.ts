/**
 * Vitest 全局 setup — 注入 jest-dom 匹配器
 *
 * 组件测试断言（toBeInTheDocument / toHaveTextContent 等）依赖此文件。
 * 由根 vitest.config.ts 与 tests/vitest.config.ts 的 setupFiles 引用。
 */
import '@testing-library/jest-dom/vitest';
