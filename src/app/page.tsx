import { cookies } from 'next/headers'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

// Siempre SSR fresco — sin esto Next.js cachea la página y los cambios del panel no se ven
export const dynamic = 'force-dynamic'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ScrollReveal from '@/components/layout/ScrollReveal'
import Link from 'next/link'
import Image from 'next/image'
import { IconArrowMono } from '@/components/icons/SocialIcons'

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
    .select('logo_url, hero_image_url, hero_eyebrow, hero_title_line1, hero_title_italic, hero_title_line3, hero_subtitle, hero_season, hero_text_color, whatsapp_number, notification_email, instagram_url, facebook_url, tiktok_url, pickup_address, pickup_enabled, branches, price_visibility')
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

  // El hero de Axis es un video — se detecta por la extensión del archivo cargado en hero_image_url.
  // Shortcut temporal: no hay slot de carga de video en el panel todavía (ver tarea pendiente),
  // así que por ahora la URL se pega a mano en store_config.hero_image_url.
  const heroIsVideo = !!config?.hero_image_url && /\.(mp4|webm|mov)(\?|$)/i.test(config.hero_image_url)

  return (
    <>
      <Navbar
        storeName={storeName}
        logoUrl={config?.logo_url}
        instagramUrl={(config as any)?.instagram_url ?? undefined}
        facebookUrl={(config as any)?.facebook_url ?? undefined}
        tiktokUrl={(config as any)?.tiktok_url ?? undefined}
      />

      <main>

        {/* ── HERO CON VIDEO ──────────────────────────────────────── */}
        {/* Proporciones exactas del Figma de Axis: lienzo 1728×1117 en 3 columnas — */}
        {/* izquierda 426px (24.65%) + video 1117px (64.64%) + derecha 185px (10.71%) con el "SS2027" */}
        <section className="relative bg-[var(--color-cream)] flex flex-col lg:grid lg:grid-cols-[24.65%_64.64%_10.71%] lg:grid-rows-1 lg:aspect-[1728/1117]">

            {/* Columna izquierda — el grid la estira al 100% de la fila */}
            <div className="order-2 lg:order-1 w-full px-8 py-12 lg:px-10 lg:py-16 lg:h-full">
              <div className="h-full flex flex-col gap-10">

                {/* flex-1 + items-center centra el logo verticalmente respecto a la altura de la imagen del hero */}
                <div className="flex-1 flex items-center justify-center opacity-0 animate-fade-in delay-100">
                  {config?.logo_url ? (
                    <img
                      src={config.logo_url}
                      alt={storeName}
                      className="w-[150px] max-w-full h-auto object-contain"
                    />
                  ) : (
                    <div className="w-[150px] max-w-full h-[135px] border border-dashed border-[var(--color-charcoal)]/30 flex items-center justify-center">
                      <span className="font-ui text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] text-center px-4">
                        Logo de la tienda
                      </span>
                    </div>
                  )}
                </div>

                <div className="opacity-0 animate-fade-up delay-200">
                  <p className="font-display text-lg leading-snug text-[var(--color-charcoal)] mb-8 whitespace-pre-line">
                    {(config as any)?.hero_subtitle ?? 'Piezas únicas diseñadas para\nquienes buscan estilo y distinción.'}
                  </p>

                  <div className="flex items-center gap-5 flex-wrap font-ui">
                    <Link
                      href="/tienda"
                      className="inline-flex items-center justify-center bg-[var(--color-charcoal)] text-white text-xs tracking-[0.15em] uppercase px-7 py-3 hover:opacity-90 transition-opacity"
                    >
                      Ver colección
                    </Link>
                    <Link
                      href="/tienda"
                      className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] border-b border-[var(--color-charcoal)] pb-1 hover:text-[var(--color-stone)] hover:border-[var(--color-stone)] transition-colors"
                    >
                      Tienda <IconArrowMono />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha — el video ocupa el 100% de la altura de la sección */}
            <div className="order-1 lg:order-2 w-full">
              <div className="group relative w-full aspect-square lg:aspect-auto lg:h-full flex items-end overflow-hidden bg-[#FFFFFF]">
                {heroIsVideo ? (
                  <video
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    src={config!.hero_image_url!}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : config?.hero_image_url && (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
                    style={{ backgroundImage: `url(${config.hero_image_url})` }}
                  />
                )}
                {config?.hero_image_url && (
                  <div className="absolute inset-0 bg-black/20" />
                )}

                {(() => {
                  const customColor = (config as any)?.hero_text_color
                  const textStyle = customColor ? { color: customColor } : undefined
                  const defaultEyebrowClass = config?.hero_image_url ? 'text-white/80' : 'text-[var(--color-stone)]'
                  const defaultTitleClass   = config?.hero_image_url ? 'text-white'    : 'text-[var(--color-charcoal)]'
                  return (
                    <div className="relative z-10 px-8 pb-14 lg:px-16 lg:pb-20 opacity-0 animate-fade-up delay-100">
                      <p
                        className={`font-ui text-xs tracking-[0.25em] uppercase mb-4 ${!customColor ? defaultEyebrowClass : ''}`}
                        style={textStyle ? { color: customColor + 'B3' } : undefined}
                      >
                        {(config as any)?.hero_eyebrow ?? 'Opening New Season Summer 2026'}
                      </p>
                      <h1
                        className={`font-display text-5xl md:text-7xl font-semibold leading-[1.05] ${!customColor ? defaultTitleClass : ''}`}
                        style={textStyle}
                      >
                        {(config as any)?.hero_title_line1 ?? 'Timeless Design'}<br />
                        <em className="italic font-normal">{(config as any)?.hero_title_italic ?? 'Beyond Trends'}</em>
                        {(config as any)?.hero_title_line3 && <><br />{(config as any).hero_title_line3}</>}
                      </h1>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Columna derecha — franja angosta decorativa con la temporada en vertical (185/1728 = 10.71%) */}
            <div className="order-3 hidden lg:flex w-full h-full items-center justify-center overflow-hidden">
              <span
                className="font-display text-5xl font-light tracking-[0.1em] text-[var(--color-charcoal)]/25 select-none opacity-0 animate-fade-in delay-300"
                style={{ writingMode: 'vertical-rl' }}
              >
                {(config as any)?.hero_season || 'SS2027'}
              </span>
            </div>

        </section>

        {/* ── FEATURES BAR (clonado de tienda-atelier) ─────────── */}
        <section className="max-w-7xl mx-auto px-6 pt-28 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { title: 'Envío a todo el país', desc: 'En compras que superen el monto mínimo. Entrega rápida y segura a todo el país.' },
              { title: 'Compra Segura', desc: 'Garantizamos una experiencia de compra segura de principio a fin.' },
              { title: 'Atención al cliente', desc: 'Estamos disponibles para ayudarte en todo momento por WhatsApp e email.' },
            ].map((feat, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-11 h-11 bg-[#F5F5F5] flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-sm text-[var(--color-charcoal)] mb-1.5">{feat.title}</h3>
                  <p className="text-xs leading-relaxed text-[#E07B39]">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── NEW ARRIVALS ──────────────────────────────────────── */}
        {products && products.length > 0 && (
          <section className="w-full px-6 py-24 text-center">
            <h2 className="font-display text-4xl font-bold text-[var(--color-charcoal)] mb-2">
              New Arrivals
            </h2>
            <p className="font-ui text-base text-[var(--color-charcoal)] mb-10">
              {(config as any)?.hero_eyebrow ?? 'Opening New Season - Summer 2026'}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-left">
              {products.slice(0, 4).map((product: any) => {
                const cover = product.product_images?.find((img: any) => img.is_cover) ?? product.product_images?.[0]
                return (
                  <Link key={product.id} href={`/tienda/${product.slug}`} className="product-img-wrap block aspect-[2/3] relative bg-[#FFFFFF] overflow-hidden">
                    {cover?.url && (
                      <Image
                        src={cover.url.split('?')[0]}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* ── MOSAICO DE FOTOS (Frame 2) ────────────────────────── */}
        {/* 864×1117 grande a la izquierda + 864×559 arriba der. + 2× 432×559 abajo der. */}
        <section className="w-full grid grid-cols-2 lg:grid-rows-1 lg:aspect-[1728/1117]">
          <ScrollReveal className="relative aspect-[3/4] lg:aspect-auto overflow-hidden bg-[#FFFFFF] img-hover-zoom">
            {asset('gallery_1') && (
              <Image
                src={asset('gallery_1')!.split('?')[0]}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 50vw"
              />
            )}
          </ScrollReveal>
          <div className="flex flex-col">
            <ScrollReveal delay={100} className="relative flex-1 aspect-[3/2] lg:aspect-auto overflow-hidden bg-[#FFFFFF] img-hover-zoom">
              {asset('gallery_2') && (
                <Image
                  src={asset('gallery_2')!.split('?')[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="50vw"
                />
              )}
            </ScrollReveal>
            <div className="flex flex-1">
              <ScrollReveal delay={200} className="relative flex-1 aspect-[3/4] lg:aspect-auto overflow-hidden bg-[#FFFFFF] img-hover-zoom">
                {asset('gallery_3') && (
                  <Image
                    src={asset('gallery_3')!.split('?')[0]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                )}
              </ScrollReveal>
              <ScrollReveal delay={300} className="relative flex-1 aspect-[3/4] lg:aspect-auto overflow-hidden bg-[#FFFFFF] img-hover-zoom">
                {asset('gallery_4') && (
                  <Image
                    src={asset('gallery_4')!.split('?')[0]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />
                )}
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ── MOODBOARD (Frame 4 del diseño): franja panorámica + 2 fotos ── */}
        <section className="w-full">
          <ScrollReveal className="relative w-full aspect-[1728/200] overflow-hidden bg-[#FFFFFF] img-hover-zoom">
            {asset('moodboard_banner') && (
              <Image
                src={asset('moodboard_banner')!.split('?')[0]}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-black/10" />
            <p className="absolute left-6 md:left-[88px] top-1/2 -translate-y-1/2 max-w-[85%] font-display text-lg md:text-3xl font-semibold text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">
              Countless Attractive Offers Are Waiting For You
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <ScrollReveal delay={100} className="relative aspect-[860/573] overflow-hidden bg-[#FFFFFF] img-hover-zoom">
              {asset('moodboard_left') && (
                <Image
                  src={asset('moodboard_left')!.split('?')[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )}
            </ScrollReveal>
            <ScrollReveal delay={200} className="relative aspect-[860/573] overflow-hidden bg-[#FFFFFF] img-hover-zoom">
              {asset('moodboard_right') && (
                <Image
                  src={asset('moodboard_right')!.split('?')[0]}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              )}
            </ScrollReveal>
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
