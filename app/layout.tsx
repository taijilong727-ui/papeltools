import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * 根布局 — 仅作为类型壳
 *
 * 真正的页面布局在 app/[locale]/layout.tsx，
 * 因为 next-intl 需要 [locale] 动态段在文档结构最外层。
 * 此处不渲染 <html>/<body>，避免与 [locale]/layout 嵌套冲突。
 *
 * 访问 `/` 时由 middleware（或 [locale]/page.tsx 静态生成）跳转到 `/en/`。
 */
export const metadata: Metadata = {
  metadataBase: new URL('https://papeltools.com'),
  title: {
    default: 'Papel Tools — PDF to Markdown, in your browser',
    template: '%s · Papel Tools',
  },
  description:
    'Convert PDF to Markdown 100% in your browser. Files never leave your device. Free, no signup, no limits. Built for humans and AI agents.',
  applicationName: 'Papel Tools',
  authors: [{ name: 'Papel Tools' }],
  generator: 'Next.js',
  keywords: [
    'pdf to markdown',
    'pdf converter',
    'markdown converter',
    'in-browser',
    'privacy',
    'no upload',
    'AI agent',
    'MCP',
  ],
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'Papel Tools',
    locale: 'en_US',
    url: 'https://papeltools.com',
    title: 'Papel Tools — PDF to Markdown, in your browser',
    description:
      'Convert PDF to Markdown 100% in your browser. Files never leave your device. Free, no signup, no limits.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Papel Tools — PDF to Markdown, in your browser',
    description:
      'Convert PDF to Markdown 100% in your browser. Files never leave your device.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#f6f2ea',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 不返回 <html>/<body> — 它们由 [locale]/layout.tsx 渲染
  return children;
}