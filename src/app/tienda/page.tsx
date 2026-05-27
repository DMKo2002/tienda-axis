import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import CatalogFilters from '@/components/shop/CatalogFilters'

interface Props {
  searchParams: { cat?: string; orden?: string; q?: string }
}

export const metadata = { title: 'Tienda' }

export default async function TiendaPage({ searchParams }: Props) {
  const supabase = await createServerSupabase()

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID).single()
  const { data: config } = await supabase.from('store_config').select('logo_url, whatsapp_number, notification_email').eq('tenant_id', TENANT_ID).single()
  const { data: categories } = await supabase.from('categories').select('id, name, slug').eq('tenant_id', TENANT_ID).eq('active', true).order('sort_order')

  let query = supabase
    .from('products')
    .select('id, name, slug, product_images(*), variants(price_rules(*))')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)

  if (searchParams.cat) {
    const { data: cat } = await supabase.from('categories').select('id').eq('tenant_id', TENANT_ID).eq('slug', searchParams.cat).single()
    if (cat) query = query.eq('category_id', cat.id)
  }

  if (searchParams.q) {
    query = query.ilike('name', `%${searchParams.q}%`)
  }

  // Orden
  switch (searchParams.orden) {
    case 'precio-asc':
      query = query.order('created_at', { ascending: true })
      break
    case 'precio-desc':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  const { data: products } = await query

  const storeName = tenant?.name ?? 'TIENDA'

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />

      <main className="pt-28">

        {/* Header de la sección */}
        <div className="max-w-7xl mx-auto px-6 pb-8 border-b border-[var(--color-border)]">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-1">Colección</p>
              <h1 className="font-display text-5xl font-light text-[var(--color-charcoal)]">Tienda</h1>
            </div>
            <p className="text-sm text-[var(--color-stone)] font-light pb-1">
              {products?.length ?? 0} {products?.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row gap-12">

            {/* Sidebar filtros */}
            <aside className="w-full md:w-48 flex-shrink-0">
              <CatalogFilters
                categories={categories ?? []}
                currentCat={searchParams.cat}
                currentOrden={searchParams.orden}
              />
            </aside>

            {/* Grid productos */}
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
                {products?.map((product: any, i: number) => {
                  const cover = product.product_images?.find((img: any) => img.is_cover) ?? product.product_images?.[0]
                  const retailPrice = product.variants?.[0]?.price_rules?.find((p: any) => p.type === 'retail' && p.active)?.price
                  const wholesalePrice = product.variants?.[0]?.price_rules?.find((p: any) => p.type === 'wholesale' && p.active)?.price

                  const colors = [...new Set((product.variants ?? []).map((v: any) => v.color).filter(Boolean))] as string[]
                  const sizes = [...new Set((product.variants ?? []).map((v: any) => v.size).filter(Boolean))] as string[]

                  return (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      slug={product.slug}
                      coverUrl={cover?.url}
                      retailPrice={retailPrice}
                      wholesalePrice={wholesalePrice}
                      colors={colors}
                      sizes={sizes}
                      index={i}
                    />
                  )
                })}

                {(!products || products.length === 0) && (
                  <div className="col-span-3 py-24 text-center">
                    <p className="font-display text-2xl font-light text-[var(--color-stone)]">
                      No hay productos en esta categoría
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </main>

      <Footer storeName={storeName} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
