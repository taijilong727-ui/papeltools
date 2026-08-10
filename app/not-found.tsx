import Link from 'next/link';

/**
 * 全局 404 页面
 *
 * 静态导出模式下作为兜底：用户访问不存在的路径时显示。
 * 实际 [locale] 路由内的 notFound() 由 app/[locale]/not-found.tsx 处理。
 */
export default function NotFound() {
  return (
    <html lang="en">
      <body
        style={{
          background: '#f6f2ea',
          color: '#1d1b17',
          fontFamily: 'Georgia, serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <h1 style={{ fontSize: '72px', margin: 0, fontWeight: 500, letterSpacing: '-0.02em' }}>
            404
          </h1>
          <p style={{ fontSize: '18px', marginTop: '16px', color: '#6f6a5e' }}>
            That page does not exist — but the converter does.
          </p>
          <Link
            href="/en/"
            style={{
              display: 'inline-block',
              marginTop: '24px',
              padding: '12px 22px',
              background: '#a8432c',
              color: '#fbf8f1',
              borderRadius: '2px',
              textDecoration: 'none',
              fontFamily: 'Georgia, serif',
            }}
          >
            ← Back to converter
          </Link>
        </div>
      </body>
    </html>
  );
}