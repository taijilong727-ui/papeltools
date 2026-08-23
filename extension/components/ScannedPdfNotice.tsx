/**
 * ScannedPdfNotice — 扫描件提示卡片
 *
 * MVP 行为：检测到扫描型 PDF（无文本层）时不启用 OCR，
 * 引导用户访问 papeltools.com 使用网页版（网页版支持 OCR：eng / spa / por）。
 *
 * 与主仓库 ConverterSection.awaiting_ocr 的差异：
 * - 主仓库：提供 OCR 按钮（eng/spa/por）+ dismiss
 * - 扩展 MVP：不提供 OCR 按钮（WASM / CSP 复杂度推迟到 v1.1），
 *   直接引导回网站 + 提供 dismiss 回 idle。
 *
 * 外链目标：https://papeltools.com/en/（已锁定决策）
 */

interface ScannedPdfNoticeProps {
  filename: string;
  onDismiss: () => void;
}

export function ScannedPdfNotice({ filename, onDismiss }: ScannedPdfNoticeProps) {
  return (
    <div className="scanned-notice" role="status" aria-live="polite">
      <div className="scanned-notice__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <div className="scanned-notice__body">
        <strong className="scanned-notice__title">Scanned PDF detected</strong>
        <p className="scanned-notice__text">
          <span className="scanned-notice__filename">{filename}</span> appears
          to be a scanned document without a text layer. This extension does
          not include OCR in the current version.
        </p>
        <p className="scanned-notice__text">
          For OCR-enabled conversion (English / Spanish / Portuguese, fully
          client-side), please open{' '}
          <a
            href="https://papeltools.com/en/"
            target="_blank"
            rel="noopener noreferrer"
            className="scanned-notice__link"
          >
            papeltools.com
          </a>{' '}
          in your browser.
        </p>
      </div>

      <button
        type="button"
        className="scanned-notice__close"
        onClick={onDismiss}
        aria-label="Dismiss scanned PDF notice and return to start"
      >
        Dismiss
      </button>
    </div>
  );
}