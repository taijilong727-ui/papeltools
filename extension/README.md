# Papel Tools — Chrome Extension

> Privacy-first PDF to Markdown converter running 100% in your browser. Files never leave your device.

This is the Chrome MV3 extension for [Papel Tools](https://papeltools.com). It reuses the same conversion engine (`@pdf2md/core` + `pdf.js` v5) as the web version, packaged as a standalone extension via [WXT](https://wxt.dev).

---

## Features

- **Zero uploads** — all conversion runs in a local Web Worker via `@pdf2md/core`. No network requests.
- **Drag-and-drop or click-to-browse** PDF upload.
- **Real-time progress** + cancel support (`AbortSignal`).
- **Markdown preview** with `.md` download and clipboard copy.
- **Token / page / word / duration** metadata.
- **Worker crash auto-retry** — failed conversions transparently restart with the original buffer.

---

## MVP Limitations

- **No OCR support.** Scanned PDFs return a "scanned PDF detected" message and link you to [papeltools.com/en/](https://papeltools.com/en/), which runs Tesseract.js locally in the same zero-upload manner. OCR + WASM support is planned for v1.1.
- **English UI only.** Trilingual UI is planned for v1.1.
- **Single file at a time.** Batch conversion is planned for v1.1.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | [WXT](https://wxt.dev) 0.21+ (Vite-based) |
| Manifest | MV3 (service worker) |
| UI | React 19 + inline CSS |
| Conversion | `@pdf2md/core` v0.3 + `pdf.js` v5.2 |
| Worker | Native Web Worker (no service worker — SW idle timeout kills long conversions) |

---

## Permissions

Only one permission — required for the MVP:

- `contextMenus` — to register the right-click "Convert with Papel Tools" menu on PDF links.

> **Note on `downloads` permission**: Chrome Web Store reviews flag unused permissions. The extension saves generated `.md` files via the DOM `<a download>` API (works in extension pages), so the `downloads` permission is **not** required. If you need `saveAs` dialogs or custom save paths in a future version, switch to `chrome.downloads.download` and add the permission back.

**Zero `host_permissions`** — the extension never reads anything from web pages you visit. It only accesses the file you explicitly drop into the converter UI.

---

## Load into Chrome (Dev Mode)

1. Click the **toolbar icon** (puzzle piece if not pinned) → **Open converter** button.
   - This is the **primary entry point** for the MVP.
2. The "Convert with Papel Tools" right-click menu on PDF links is a secondary entry.

> **Why popup first?** The context menu only appears on `<a href="*.pdf">` links (not on already-downloaded PDFs or the Chrome PDF viewer). The popup works for any PDF file you have on disk.

Build and load:

```bash
cd extension
npm install
npm run build
```

The output is written to a Chromium-targeted build directory. Open `chrome://extensions/`, toggle **Developer mode** on, and click **Load unpacked** to select that directory.

---

## Development

```bash
cd extension
npm install
npm run dev          # WXT dev server with hot reload
npm run typecheck    # tsc --noEmit + wxt prepare
npm run build        # production build
npm run zip          # production build + .zip packaging (for Chrome Web Store upload)
npm run compile      # regenerate WXT type definitions
```

Generate icons from the source SVG (requires `sharp` installed in the workspace root):

```bash
node scripts/generate-icons.mjs
```

---

## Architecture

The extension follows the same conversion pipeline as the web version:

```
extension page (convert.html)
  ↓ drag PDF
React UI (convert/main.tsx)
  ↓ postMessage ArrayBuffer
Web Worker (workers/converter.worker.ts)
  ↓ @pdf2md/core convert()
  ↓ pdf.js Worker (via ?worker import)
Markdown → React UI → preview / download / copy
```

The background service worker (`entrypoints/background.ts`) only handles the right-click context menu — it does **not** do any conversion (MV3 service workers idle out after ~30s, which would kill large PDFs).

---

## Project Layout

```
extension/
├── package.json                    # WXT + React 19 + pdfjs-dist + @pdf2md/core
├── wxt.config.ts                   # MV3 manifest, zero host_permissions
├── tsconfig.json                   # strict + lib: ESNext, DOM, WebWorker
├── README.md                       # this file
├── LICENSE                         # MIT
├── SYNC_NOTES.md                   # engine drift vs main repo
├── scripts/
│   └── generate-icons.mjs          # sharp-based icon generator
├── public/
│   ├── icon-16.png                 # toolbar icon (16x16)
│   ├── icon-32.png                 # toolbar icon (32x32)
│   ├── icon-48.png                 # toolbar icon (48x48)
│   └── icon-128.png                # Chrome Web Store listing (128x128)
├── types/
│   └── worker.d.ts                 # Vite ?worker / ?url module declarations
├── lib/engine/                     # Reused from main repo (9 non-OCR files)
│   ├── converter.ts                # Main-thread entry; 'use client' stripped
│   ├── errors.ts
│   ├── file-validator.ts
│   ├── index.ts
│   ├── markdown-assembler.ts
│   ├── text-pipeline.ts
│   ├── token-estimator.ts
│   ├── types.ts
│   └── worker-manager.ts
├── workers/
│   └── converter.worker.ts         # Vite ?worker syntax for pdf.js
├── components/                     # React 19 UI (extension page only)
│   ├── App.tsx                     # State machine: idle/converting/done/error/scanned
│   ├── Dropzone.tsx                # Drag + click file picker
│   ├── ProgressBar.tsx             # Progress + cancel
│   ├── ResultDisplay.tsx           # Markdown preview + Copy + Download
│   ├── ScannedPdfNotice.tsx        # Scanned PDF → links to papeltools.com/en/
│   └── PrivacyBadge.tsx            # "Files never leave your device" badge
├── styles/
│   └── globals.css                 # Design tokens (paper / ink / accent palette)
└── entrypoints/
    ├── background.ts               # MV3 SW: contextMenus only (defineBackground wrapper)
    ├── convert/                    # Folder mode (avoid WXT duplicate entrypoint detection)
    │   ├── index.html              # Convert page HTML shell
    │   └── main.tsx                # Convert page React (runs directly, no wrapper)
    └── popup/                      # Folder mode (avoid WXT duplicate entrypoint detection)
        ├── index.html              # Popup HTML shell
        └── main.tsx                # Popup React (runs directly, no wrapper)
```

> **Why the folder pattern?** WXT 0.21 rejects `entrypoints/popup.html` + `entrypoints/popup.tsx` as a duplicate name — it sees them as two separate entrypoints. The `popup/index.html` + `popup/main.tsx` folder layout is recognized as a single composite entrypoint. The same convention is used by WXT's own starter template.
>
> **Why no `defineUnlistedScript` wrapper for HTML pages?** HTML pages execute their referenced scripts automatically on load. `defineUnlistedScript` is for scripts you run manually (e.g. via `chrome.tabs.executeScript`). The WXT official React template uses the same direct-execution pattern.

---

## Engine Sync

The `lib/engine/` directory is a physical copy of the main repo's engine (`@pdf2md/core` wrapping + worker lifecycle + bootstrap). Four files have intentional drift (e.g. the `'use client'` directive is stripped, OCR is removed). See [SYNC_NOTES.md](./SYNC_NOTES.md) for the full drift map and the manual cherry-pick SOP.

---

## License

MIT for code, all rights reserved for the "Papel Tools" brand and `papeltools.com` domain. See [LICENSE](./LICENSE).
