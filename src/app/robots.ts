import { headers } from 'next/headers'

// Ver nota en sitemap.ts: el dominio depende del tenant (custom domain),
// no se puede fijar con un env var estático compartido por todo el deploy.
function getBaseUrl(): string {
  try {
    const h = headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    if (host && !host.includes('localhost') && !host.startsWith('127.')) {
      const proto = h.get('x-forwarded-proto') ?? 'https'
      return `${proto}://${host}`
    }
  } catch {}
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export default function robots() {
  const BASE_URL = getBaseUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/checkout', '/carrito', '/cuenta', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
