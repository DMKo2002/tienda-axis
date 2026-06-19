import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import AddToCartButton from '@/components/shop/AddToCartButton'
import ProductGallery from '@/components/shop/ProductGallery'

interface Props {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props) {
  const supabase = await createServerSupabase()
  const [{ data: tenantData }, { data }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', TENANT_ID).single(),
    supabase
      .from('products')
      .select('name, description, product_images(url, is_cover, sort_order)')
      .eq('slug', params.slug)
      .eq('active', true)
      .single(),
  ])
  if (!data) return { title: 'Producto no encontrado' }

  const storeName = tenantData?.name ?? 'Tienda'
  const title = `${data.name} — ${storeName}`
  const description = data.description
    ? data.description.slice(0, 155)
    : `Comprá ${data.name} en ${storeName}. Envíos a todo el país.`

  const images = ((data.product_images ?? []) as any[]).sort((a, b) => {
    if (a.is_cover) return -1
    if (b.is_cover) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
  const coverUrl = images[0]?.url ?? null

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(coverUrl ? { images: [{ url: coverUrl, width: 600, height: 900, alt: data.name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(coverUrl ? { images: [coverUrl] } : {}),
    },
  }
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default async function ProductoPage({ params }: Props) {
  const supabase = await createServerSupabase()

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID).single()
  const { data: config } = await supabase
    .from('store_config')
    .select('logo_url, whatsapp_number, notification_email, price_visibility')
    .eq('tenant_id', TENANT_ID)
    .single()

  const { data: product } = await supabase
    .from('products')
    .select('*, product_images(*), variants(*, price_rules(*))')
    .eq('tenant_id', TENANT_ID)
    .eq('slug', params.slug)
    .eq('active', true)
    .single()

  if (!product) notFound()

  const images = (product.product_images ?? []).sort((a: any, b: any) => {
    if (a.is_cover) return -1
    if (b.is_cover) return 1
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })
  const storeName = tenant?.name ?? 'TIENDA'

  // Price visibility check
  const priceVisibility = (config as any)?.price_visibility ?? 'all'
  let showPrices = true
  if (priceVisibility !== 'all') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showPrices = false
    } else if (priceVisibility === 'wholesale_only') {
      const { data: customer } = await supabase
        .from('customers')
        .select('type')
        .eq('email', user.email ?? '')
        .eq('tenant_id', TENANT_ID)
        .single()
      showPrices = customer?.type === 'wholesale'
    }
  }

  // Agrupar variantes por talle y color
  const sizes = [...new Set((product.variants ?? []).map((v: any) => v.size).filter(Boolean))]
  const colors = [...new Set((product.variants ?? []).map((v: any) => v.color).filter(Boolean))]

  const retailRule = product.variants?.[0]?.price_rules?.find((p: any) => p.type === 'retail' && p.active)
  const wholesaleRule = product.variants?.[0]?.price_rules?.find((p: any) => p.type === 'wholesale' && p.active)

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />

      <main className="pt-24 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">

            {/* Galería de imágenes */}
            <ProductGallery images={images} productName={product.name} />

            {/* Info del producto */}
            <div className="py-4">
              {/* Breadcrumb */}
              <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] mb-6">
                Tienda / {product.name}
              </p>

              <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] leading-tight mb-6">
                {product.name}
              </h1>

              {/* Precio */}
              <div className="mb-8">
                {showPrices ? (
                  <>
                    {retailRule && (
                      <p className="text-2xl font-light text-[var(--color-charcoal)]">
                        {formatPrice(retailRule.price)}
                      </p>
                    )}
                    {wholesaleRule && (
                      <p className="text-sm text-[var(--color-stone)] mt-1">
                        Precio mayorista: {formatPrice(wholesaleRule.price)}
                        <span className="ml-1 text-xs">(x{wholesaleRule.min_qty}+)</span>
                      </p>
                    )}
                  </>
                ) : (
                  <a
                    href="/cuenta/login"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors underline"
                  >
                    {priceVisibility === 'wholesale_only'
                      ? 'Precio disponible solo para mayoristas'
                      : 'Iniciá sesión para ver el precio'}
                  </a>
                )}
              </div>

              {/* Separador */}
              <div className="w-full h-px bg-[var(--color-border)] mb-8" />

              {/* Selector de variante + agregar al carrito */}
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  variants: product.variants ?? [],
                  coverUrl: images[0]?.url ?? null,
                }}
                sizes={sizes as string[]}
                colors={colors as string[]}
                showPrices={showPrices}
              />

              {/* Separador */}
              <div className="w-full h-px bg-[var(--color-border)] my-8" />

              {/* Descripción */}
              {product.description && (
                <div>
                  <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] mb-3">Descripción</p>
                  <p className="text-sm text-[var(--color-stone)] leading-relaxed font-light">
                    {product.description}
                  </p>
                </div>
              )}

              {/* WhatsApp */}
              {config?.whatsapp_number && (
                <div className="mt-8">
                  <a
                    href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=Hola! Me interesa el producto: ${product.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors border-b border-[var(--color-border)] pb-1"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer storeName={storeName} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
