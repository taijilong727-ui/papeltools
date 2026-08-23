import { defineBackground } from 'wxt/utils/define-background';

/**
 * Papel Tools — MV3 Service Worker
 *
 * 职责：
 * - 注册"用 Papel 转为 Markdown"右键菜单（contexts: 'link'）
 * - 点击菜单项时打开 convert.html（扩展页）
 *
 * 权限说明：仅使用 contextMenus 一个权限，零 host_permissions（§三决策）。
 *   - downloads 权限已移除（2026-08-16 review）：markdown-assembler.ts 使用
 *     DOM <a download> 触发下载，扩展页内可用；chrome.downloads API 冗余。
 *   - 主入口是 popup 工具栏图标（"Open converter"按钮），右键菜单作为补充。
 *
 * 注意：WXT 在 build 时会在 NodeJS 环境 import 此文件以读取 manifest 元数据，
 * 故所有运行时代码必须放在 defineBackground 的 main 回调内（顶层代码会失败）。
 */
export default defineBackground(() => {
  // 安装时注册右键菜单（重复注册会被 Chrome 自动忽略）
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'convert-pdf',
      title: '用 Papel 转为 Markdown',
      contexts: ['link'],
    });
  });

  // 右键菜单点击 → 打开扩展转换页（unlisted page）
  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === 'convert-pdf') {
      chrome.tabs.create({ url: chrome.runtime.getURL('/convert.html') });
    }
  });
});