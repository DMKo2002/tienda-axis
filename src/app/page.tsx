import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createServerSupabase()

  // Datos de la tienda
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, domain')
    .eq('id', TENANT_ID)
    .single()

  const { data: config } = await supabase
    .from('store_config')
    .select('logo_url, whatsapp_number, notification_email')
    .eq('tenant_id', TENANT_ID)
    .single()

  // Productos destacados (últimos 4)
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, product_images(*), variants(price_rules(*))')
    .eq('tenant_id', TENANT_ID)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(4)

  const storeName = tenant?.name ?? 'TIENDA'

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />

      <main>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <section className="relative min-h-screen flex items-end pb-20 overflow-hidden bg-[#EDE8E1]">

          {/* Texto hero */}
          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
            <div className="max-w-xl opacity-0 animate-fade-up delay-100">
              <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-stone)] mb-4">
                Nueva temporada
              </p>
              <h1 className="font-display text-6xl md:text-8xl font-light leading-none text-[var(--color-charcoal)] mb-8">
                Estilo que<br />
                <em className="italic">trasciende</em><br />
                tendencia
              </h1>
              <Link
                href="/tienda"
                className="inline-flex items-center gap-3 text-xs tracking-[0.2em] uppercase border-b border-[var(--color-charcoal)] pb-1 text-[var(--color-charcoal)] hover:text-[var(--color-stone)] hover:border-[var(--color-stone)] transition-colors"
              >
                Ver colección <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Número decorativo */}
          <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 animate-fade-in delay-400 hidden lg:block">
            <p className="font-display text-[200px] font-light text-[var(--color-charcoal)]/5 leading-none select-none">
              AW
            </p>
          </div>

          {/* Línea vertical decorativa */}
          <div className="absolute left-6 top-32 bottom-20 w-px bg-[var(--color-charcoal)]/10 hidden lg:block" />

        </section>

        {/* ── FEATURED COLLECTION ──────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-6 py-24">

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
        <section className="max-w-7xl mx-auto px-6 py-24">
          <div className="mb-10">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-2">Instagram</p>
            <h2 className="font-display text-3xl font-light text-[var(--color-charcoal)]">MoodBoard</h2>
            <p className="text-sm text-[var(--color-stone)] mt-2 font-light">
              Descubrí nuestras selecciones diseñadas para destacar, redefiniendo la elegancia contemporánea
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Mood & Concept', bg: '#DDD5C8' },
              { label: 'Nuestra Tienda', bg: '#C8CDD5' },
              { label: 'AW2026', bg: '#C8D5CC' },
              { label: 'Sketch', bg: '#D5C8CE' },
            ].map((item, i) => (
              <div
                key={i}
                className="aspect-square flex items-end p-4 opacity-0 animate-fade-up"
                style={{
                  backgroundColor: item.bg,
                  animationDelay: `${i * 100}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)]/60">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>

      <Footer
        storeName={storeName}
        whatsapp={config?.whatsapp_number ?? ''}
        email={config?.notification_email ?? ''}
      />
    </>
  )
}
