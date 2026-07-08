import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/components/shop/CartContext'
import CookieBanner from '@/components/layout/CookieBanner'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const supabase = await createServerSupabase()
    const [{ data: tenant }, { data: config }] = await Promise.all([
      supabase.from('tenants').select('name').eq('id', TENANT_ID()).maybeSingle(),
      supabase.from('store_config').select('logo_url, favicon_url').eq('tenant_id', TENANT_ID()).maybeSingle(),
    ])
    const storeName = tenant?.name ?? 'Tienda'
    const faviconUrl = (config as any)?.favicon_url ?? config?.logo_url ?? null
    return {
      title: { default: storeName, template: `%s | ${storeName}` },
      description: 'Estilo que trasciende tendencia.',
      ...(faviconUrl ? { icons: { icon: faviconUrl, apple: faviconUrl } } : {}),
    }
  } catch {
    return {
      title: { default: 'Tienda', template: '%s | Tienda' },
      description: 'Estilo que trasciende tendencia.',
    }
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="overflow-x-hidden">
        <CartProvider>
          {children}
          <CookieBanner />
        </CartProvider>
        </body>
    </html>
  )
}
