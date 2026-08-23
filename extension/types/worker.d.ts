/**
 * Vite build-time module declarations
 *
 * WXT 项目使用 Vite 构建，部分 import 语法是 build-time 解析的（tsc 不知道），
 * 需要在此显式声明让 TypeScript 通过。
 *
 * 参考：https://vitejs.dev/guide/features.html#import-with-query-suffixes
 */

declare module '*?worker' {
  /**
   * 默认导出一个 Worker 构造器。
   * Vite 在 build 时会把 ?worker 指向的模块编译为独立 worker bundle。
   */
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare module '*?url' {
  const src: string;
  export default src;
}

declare module '*?raw' {
  const src: string;
  export default src;
}