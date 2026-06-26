import { createClient } from '@supabase/supabase-js'
import { getTenantId } from '@/lib/supabase-server'

// Sitemap dinámico — se regenera con cada build o con revalidación
// Para forzar regeneración: `revalidatePath('/sitemap.xml')` desde un Server Action o webhook

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')

export default async function sitemap() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from('products')
      .select('slug, updated_at')
      .eq('tenant_id', getTenantId())
      .eq('active', true),
    supabase
      .from('categories')
      .select('slug')
      .eq('tenant_id', getTenantId())
      .eq('active', true),
  ])

  const staticRoutes = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0, changeFrequency: 'weekly' as const },
    { url: `${BASE_URL}/tienda`, lastModified: new Date(), priority: 0.9, changeFrequency: 'daily' as const },
  ]

  const productRoutes = (products ?? []).map(p => ({
    url: `${BASE_URL}/tienda/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    priority: 0.8,
    changeFrequency: 'weekly' as const,
  }))

  const categoryRoutes = (categories ?? [])
    .filter(c => c.slug)
    .map(c => ({
      url: `${BASE_URL}/tienda?cat=${c.slug}`,
      lastModified: new Date(),
      priority: 0.6,
      changeFrequency: 'weekly' as const,
    }))

  return [...staticRoutes, ...productRoutes, ...categoryRoutes]
}
