/**
 * PrivacyBadge — 顶部隐私徽章
 *
 * 强化"零上传"核心叙事：与主仓库 web 转换页一致，
 * 顶部固定显示"Files never leave your device · 100% client-side"。
 *
 * 设计：胶囊形 + 小绿点 + 等宽字体。
 */

export function PrivacyBadge() {
  return (
    <div
      className="privacy-badge"
      role="status"
      aria-label="Files never leave your device. 100% client-side conversion."
    >
      <span className="privacy-badge__dot" aria-hidden="true" />
      <span className="privacy-badge__text">
        Files never leave your device · 100% client-side
      </span>
    </div>
  );
}