import { cookies } from 'next/headers'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

// Siempre SSR fresco — sin esto Next.js cachea la página y los cambios del panel no se ven
export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export default async function HomePage() {
  // cookies() debe llamarse ANTES de cualquier await
  const cookieStore = cookies()
  const isLoggedIn = cookieStore.getAll().some(c => c.name.includes('-auth-token') && c.value.length > 10)

  const supabase = await createServerSupabase()

  // Datos de la tienda
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, domain')
    .eq('id', TENANT_ID())
    .single()

  const { data: config } = await supabase
    .from('store_config')
    .select('logo_url, hero_image_url, hero_eyebrow, hero_title_line1, hero_title_italic, hero_title_line3, hero_season, hero_text_color, whatsapp_number, notification_email, instagram_url, facebook_url, tiktok_url, pickup_address, pickup_enabled, branches, price_visibility')
    .eq('tenant_id', TENANT_ID())
    .single()

  // Imágenes configurables desde panel Personalización
  const { data: assetsRows } = await supabase
    .from('store_assets')
    .select('slot, url')
    .eq('tenant_id', TENANT_ID())

  const asset = (slot: string): string | null =>
    assetsRows?.find(a => a.slot === slot)?.url ?? null

  // Productos destacados (últimos 4)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, product_images(*), variants(price_rules(*))')
    .eq('tenant_id', TENANT_ID())
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(4)

  const storeName = tenant?.name ?? 'TIENDA'
  const priceVisibility = (config as any)?.price_visibility ?? 'all'
  const showPrices = priceVisibility === 'all' || (priceVisibility === 'logged_in' && isLoggedIn)

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />

      <main>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section
          className="relative min-h-screen flex items-end pb-20 overflow-hidden bg-[#EDE8E1]"
          style={config?.hero_image_url ? {
            backgroundImage: `url(${config.hero_image_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          {/* Overlay oscuro cuando hay imagen */}
          {config?.hero_image_url && (
            <div className="absolute inset-0 bg-black/40" />
          )}

          {/* Texto hero */}
          {(() => {
            const customColor = (config as any)?.hero_text_color
            const textStyle = customColor ? { color: customColor } : undefined
            const defaultEyebrowClass = config?.hero_image_url ? 'text-white/70' : 'text-[var(--color-stone)]'
            const defaultTitleClass   = config?.hero_image_url ? 'text-white'    : 'text-[var(--color-charcoal)]'
            const defaultLinkClass    = config?.hero_image_url
              ? 'border-white/70 text-white hover:border-white hover:text-white/80'
              : 'border-[var(--color-charcoal)] text-[var(--color-charcoal)] hover:text-[var(--color-stone)] hover:border-[var(--color-stone)]'
            return (
              <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
                <div className="max-w-xl opacity-0 animate-fade-up delay-100">
                  <p
                    className={`text-xs tracking-[0.25em] uppercase mb-4 ${!customColor ? defaultEyebrowClass : ''}`}
                    style={textStyle ? { color: customColor + 'B3' } : undefined}
                  >
                    {(config as any)?.hero_eyebrow ?? 'Nueva temporada'}
                  </p>
                  <h1
                    className={`font-display text-6xl md:text-8xl font-light leading-none mb-8 ${!customColor ? defaultTitleClass : ''}`}
                    style={textStyle}
                  >
                    {(config as any)?.hero_title_line1 ?? 'Estilo que'}<br />
                    <em className="italic">{(config as any)?.hero_title_italic ?? 'trasciende'}</em><br />
                    {(config as any)?.hero_title_line3 ?? 'tendencia'}
                  </h1>
                  <Link
                    href="/tienda"
                    className={`inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase border-b pb-1 transition-colors ${!customColor ? defaultLinkClass : ''}`}
                    style={textStyle}
                  >
                    Ver colección <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )
          })()}

          {/* Número decorativo */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 animate-fade-in delay-400 hidden lg:block">
            <p className="font-display text-[200px] font-light text-[var(--color-charcoal)]/5 leading-none select-none">
              {(config as any)?.hero_season ?? 'AW'}
            </p>
          </div>

          {/* Línea vertical decorativa */}
          <div className="absolute left-6 top-32 bottom-20 w-px bg-[var(--color-charcoal)]/10 hidden lg:block" />

        </section>

        {/* ── FEATURED COLLECTION ──────────────────────────────── */}
        <section className="w-full px-6 py-24">

          <div className="flex items-center justify-between mb-12">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-2">
                Selección
              </p>
              <h2 className="font-display text-4xl font-light text-[var(--color-charcoal)]">
                Featured Collection
              </h2>
            </div>
            <Link
              href="/tienda"
              className="hidden md:inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors"
            >
              Ver todo <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                  showPrices={showPrices}
                  priceVisibility={priceVisibility}
                  colors={colors}
                  sizes={sizes}
                  index={i}
                />
              )
            })}

            {(!products || products.length === 0) && (
              <div className="col-span-4 py-20 text-center">
                <p className="text-[var(--color-stone)] font-light">
                  Los productos se mostrarán aquí
                </p>
              </div>
            )}
          </div>

          {/* Mobile ver todo */}
          <div className="mt-10 text-center md:hidden">
            <Link href="/tienda" className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[var(--color-stone)]">
              Ver todos los productos <ArrowRight size={13} />
            </Link>
          </div>

        </section>

        {/* ── BANNER INTERMEDIO ────────────────────────────────── */}
        <section className="bg-[var(--color-charcoal)] py-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs tracking-[0.3em] uppercase text-white/40 mb-6">Los Destacados</p>
            <h2 className="font-display text-5xl md:text-6xl font-light italic text-white leading-tight mb-8">
              Conocé productos especialmente<br />elegidos para vos
            </h2>
            <Link
              href="/tienda"
              className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase text-white border-b border-white/30 pb-1 hover:border-white transition-colors"
            >
              Shop now <ArrowRight size={13} />
            </Link>
          </div>
        </section>

        {/* ── MOODBOARD ────────────────────────────────────────── */}
        <section className="w-full px-6 py-24">
          <div className="mb-10">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-2">Instagram</p>
            <h2 className="font-display text-3xl font-light text-[var(--color-charcoal)]">MoodBoard</h2>
            <p className="text-sm text-[var(--color-stone)] mt-2 font-light">
              Descubrí nuestras selecciones diseñadas para destacar, redefiniendo la elegancia contemporánea
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['#DDD5C8', '#C8CDD5', '#C8D5CC', '#D5C8CE'].map((bg, i) => {
              const imgUrl = asset(`moodboard_${i + 1}`)
              return (
                <div
                  key={i}
                  className="aspect-square overflow-hidden opacity-0 animate-fade-up relative"
                  style={{
                    backgroundColor: bg,
                    animationDelay: `${i * 100}ms`,
                    animationFillMode: 'forwards'
                  }}
                >
                  {imgUrl && (
                    <Image
                      src={imgUrl.split('?')[0]}
                      alt={`Mood ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 25vw"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </section>

      </main>

      {/* ── WHATSAPP FLOTANTE ─────────────────────────────────── */}
      {config?.whatsapp_number && (
        <a
          href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar por WhatsApp"
          className="fixed bottom-12 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 21l3.98-.927A9.945 9.945 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.5a8.46 8.46 0 0 1-4.337-1.195l-.31-.184-3.22.75.77-3.12-.202-.32A8.5 8.5 0 1 1 12 20.5z"/>
          </svg>
        </a>
      )}

      <Footer
        storeName={storeName}
        logoUrl={asset('logo') ?? config?.logo_url ?? undefined}
        whatsapp={config?.whatsapp_number ?? ''}
        email={config?.notification_email ?? ''}
        instagramUrl={(config as any)?.instagram_url ?? undefined}
        facebookUrl={(config as any)?.facebook_url ?? undefined}
        tiktokUrl={(config as any)?.tiktok_url ?? undefined}
        branches={(config as any)?.branches ?? []}
      />
    </>
  )
}
