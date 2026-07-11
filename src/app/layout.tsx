import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/components/shop/CartContext'
import CookieBanner from '@/components/layout/CookieBanner'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

export async function generateMetadata(): Promise<Metadata> {
  const description = 'Estilo que trasciende tendencia.'
  try {
    const supabase = await createServerSupabase()
    const [{ data: tenant }, { data: config }] = await Promise.all([
      supabase.from('tenants').select('name').eq('id', TENANT_ID()).maybeSingle(),
      supabase.from('store_config').select('logo_url, favicon_url, hero_image_url').eq('tenant_id', TENANT_ID()).maybeSingle(),
    ])
    const storeName = tenant?.name ?? 'Tienda'
    const faviconUrl = (config as any)?.favicon_url ?? config?.logo_url ?? null
    // Imagen para el preview al compartir el link (WhatsApp, Instagram, etc).
    // Sin esto, compartir la tienda no muestra ninguna imagen — se ve el link pelado.
    const ogImage = (config as any)?.hero_image_url ?? config?.logo_url ?? null
    return {
      title: { default: storeName, template: `%s | ${storeName}` },
      description,
      ...(faviconUrl ? { icons: { icon: faviconUrl, apple: faviconUrl } } : {}),
      openGraph: {
        title: storeName,
        description,
        siteName: storeName,
        locale: 'es_AR',
        type: 'website',
        ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title: storeName,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
    }
  } catch {
    return {
      title: { default: 'Tienda', template: '%s | Tienda' },
      description,
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
