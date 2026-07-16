import { createServerSupabase, createServiceSupabase, TENANT_ID } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProductCard from '@/components/shop/ProductCard'
import CatalogFilters from '@/components/shop/CatalogFilters'
import MobileFilterDrawer from '@/components/shop/MobileFilterDrawer'

interface Props {
  searchParams: {
    cat?: string
    orden?: string
    q?: string
    color?: string
    talle?: string
    precio_min?: string
    precio_max?: string
    descuento?: string
  }
}

export const metadata = { title: 'Tienda' }

export default async function TiendaPage({ searchParams }: Props) {
  const supabase = await createServerSupabase()

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID()).single()
  const { data: config } = await supabase.from('store_config').select('logo_url, whatsapp_number, notification_email, instagram_url, facebook_url, tiktok_url, pickup_address, branches, pickup_enabled, price_visibility').eq('tenant_id', TENANT_ID()).single()
  // Fetch all active categories (top-level + subcategories)
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .eq('tenant_id', TENANT_ID())
    .eq('active', true)
    .order('sort_order')

  // Build 3-level tree: category -> subcategory -> sub-subcategory
  const categories = (allCategories ?? [])
    .filter((c: any) => !c.parent_id)
    .map((c: any) => ({
      ...c,
      subcategories: (allCategories ?? [])
        .filter((s: any) => s.parent_id === c.id)
        .map((s: any) => ({
          ...s,
          subcategories: (allCategories ?? []).filter((t: any) => t.parent_id === s.id),
        })),
    }))

  // Parse filter params
  const precioMin = searchParams.precio_min ? Number(searchParams.precio_min) : undefined
  const precioMax = searchParams.precio_max ? Number(searchParams.precio_max) : undefined
  const soloDescuento = searchParams.descuento === '1'

  // Fetch all active products — we'll sort/filter with JS for price and discount
  let query = supabase
    .from('products')
    .select('id, name, slug, category_id, product_images(*), variants(color, size, price_rules(type, price, compare_at_price, active, min_qty))')
    .eq('tenant_id', TENANT_ID())
    .eq('active', true)

  // Filter by category (includes subcategories when a top-level cat is selected)
  if (searchParams.cat) {
    const matchedCat = (allCategories ?? []).find((c: any) => c.slug === searchParams.cat)
    if (matchedCat) {
      const subIds = (allCategories ?? [])
        .filter((c: any) => c.parent_id === matchedCat.id)
        .map((c: any) => c.id)
      const subSubIds = (allCategories ?? [])
        .filter((c: any) => subIds.includes(c.parent_id))
        .map((c: any) => c.id)
      const ids = [matchedCat.id, ...subIds, ...subSubIds]
      query = ids.length === 1
        ? query.eq('category_id', ids[0])
        : query.in('category_id', ids)
    }
  }

  // Filter by name/search
  if (searchParams.q) {
    query = query.ilike('name', `%${searchParams.q}%`)
  }

  // Always fetch newest first (price ordering done in JS below)
  query = query.order('created_at', { ascending: false })

  const { data: allProducts } = await query

  // ── Post-fetch JS filtering ─────────────────────────────

  let products = (allProducts ?? []).map((product: any) => {
    const retailRule = product.variants?.[0]?.price_rules?.find(
      (p: any) => p.type === 'retail' && p.active && (p.min_qty ?? 1) <= 1
    )
    const wholesaleRule = product.variants?.[0]?.price_rules?.find(
      (p: any) => p.type === 'wholesale' && p.active
    )
    const retailRegular: number | undefined = retailRule?.price
    const retailRebajado: number | undefined =
      (retailRule?.compare_at_price > 0 && retailRule?.compare_at_price < (retailRule?.price ?? Infinity))
        ? retailRule?.compare_at_price
        : undefined
    const retailPrice: number | undefined = retailRebajado ?? retailRegular  // precio efectivo (lo que paga)
    const retailCompareAt: number | undefined = retailRebajado ? retailRegular : undefined  // precio tachado
    const wholesalePrice: number | undefined = wholesaleRule?.price

    const colors = [...new Set((product.variants ?? []).map((v: any) => v.color).filter(Boolean))] as string[]
    const sizes = [...new Set((product.variants ?? []).map((v: any) => v.size).filter(Boolean))] as string[]
    const cover = product.product_images?.find((img: any) => img.is_cover) ?? product.product_images?.[0]
    // Todas las imágenes ordenadas (portada primero) — habilita el mini carousel al hoverear en ProductCard
    const sortedImages = [...(product.product_images ?? [])].sort((a: any, b: any) => {
      if (a.is_cover) return -1
      if (b.is_cover) return 1
      return (a.sort_order ?? 0) - (b.sort_order ?? 0)
    })
    const images = sortedImages.map((img: any) => img.url).filter(Boolean)

    return { ...product, retailPrice, retailCompareAt, wholesalePrice, colors, sizes, cover, images }
  })

  // Filter by color
  if (searchParams.color) {
    const colorFilter = searchParams.color.toLowerCase().trim()
    products = products.filter((p: any) =>
      p.colors.some((c: string) => c.toLowerCase().trim() === colorFilter)
    )
  }

  // Filter by size
  if (searchParams.talle) {
    const talleFilter = searchParams.talle.toUpperCase().trim()
    products = products.filter((p: any) =>
      p.sizes.some((s: string) => s.toUpperCase().trim() === talleFilter)
    )
  }

  // Filter by price range
  if (precioMin !== undefined) {
    products = products.filter((p: any) => p.retailPrice !== undefined && p.retailPrice >= precioMin)
  }
  if (precioMax !== undefined) {
    products = products.filter((p: any) => p.retailPrice !== undefined && p.retailPrice <= precioMax)
  }

  // Filter "solo descuento"
  if (soloDescuento) {
    products = products.filter((p: any) =>
      p.retailCompareAt && p.retailCompareAt > (p.retailPrice ?? 0)
    )
  }

  // Sorting
  if (searchParams.orden === 'precio-asc') {
    products = [...products].sort((a: any, b: any) => (a.retailPrice ?? 0) - (b.retailPrice ?? 0))
  } else if (searchParams.orden === 'precio-desc') {
    products = [...products].sort((a: any, b: any) => (b.retailPrice ?? 0) - (a.retailPrice ?? 0))
  } else if (searchParams.orden === 'nombre-asc') {
    products = [...products].sort((a: any, b: any) => a.name.localeCompare(b.name, 'es'))
  }
  // default: already ordered by created_at desc from Supabase

  // Available colors for filter sidebar (from ALL products before color filter)
  const allColors = [...new Set(
    (allProducts ?? []).flatMap((p: any) =>
      (p.variants ?? []).map((v: any) => v.color).filter(Boolean)
    )
  )].sort() as string[]

  // Available sizes for filter sidebar — sorted in standard clothing order
  const SIZE_ORDER = ['XS','S','M','L','XL','XXL','XXXL','3XL','4XL']
  const allSizes = [...new Set(
    (allProducts ?? []).flatMap((p: any) =>
      (p.variants ?? []).map((v: any) => v.size).filter(Boolean)
    )
  )].sort((a: any, b: any) => {
    const ai = SIZE_ORDER.indexOf(String(a).toUpperCase())
    const bi = SIZE_ORDER.indexOf(String(b).toUpperCase())
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    const an = parseInt(a), bn = parseInt(b)
    if (!isNaN(an) && !isNaN(bn)) return an - bn
    return String(a).localeCompare(String(b))
  }) as string[]

  // Count products per category (before any filter)
  const productCountByCat: Record<string, number> = {}
  ;(allProducts ?? []).forEach((p: any) => {
    if (p.category_id) {
      productCountByCat[p.category_id] = (productCountByCat[p.category_id] ?? 0) + 1
    }
  })
  // Add counts to category tree
  const categoriesWithCount = categories.map((c: any) => ({
    ...c,
    productCount: (productCountByCat[c.id] ?? 0) +
      c.subcategories.reduce((acc: number, s: any) =>
        acc + (productCountByCat[s.id] ?? 0) +
        (s.subcategories ?? []).reduce((a2: number, t: any) => a2 + (productCountByCat[t.id] ?? 0), 0), 0),
    subcategories: c.subcategories.map((s: any) => ({
      ...s,
      productCount: (productCountByCat[s.id] ?? 0) + (s.subcategories ?? []).reduce((a2: number, t: any) => a2 + (productCountByCat[t.id] ?? 0), 0),
      subcategories: (s.subcategories ?? []).map((t: any) => ({ ...t, productCount: productCountByCat[t.id] ?? 0 })),
    })),
  }))

  const storeName = tenant?.name ?? 'TIENDA'
  const priceVisibility = (config as any)?.price_visibility ?? 'all'

  let showPrices = false
  let showWholesale = false
  let isRetailUser = false  // logueado como retail en modo wholesale_only

  if (priceVisibility === 'all') {
    // Todos ven ambos precios (retail y mayorista) sin importar si están logueados
    showPrices = true
    showWholesale = true
  } else {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const service = createServiceSupabase()
        // Admin ve todo
        const { data: adminUser } = await service.from('users').select('id').eq('email', user.email ?? '').eq('tenant_id', TENANT_ID()).limit(1)
        if (adminUser && adminUser.length > 0) {
          showPrices = true
          showWholesale = true
        } else {
          // Service client bypasea RLS. Usar auth_user_id (no email): el mail de
          // Auth puede ser "disfrazado" por tienda (ver lib/auth-email.ts) y ya
          // no coincide con customers.email para cuentas nuevas.
          const { data: cust } = await service.from('customers').select('type').eq('auth_user_id', user.id).eq('tenant_id', TENANT_ID()).maybeSingle()
          const isWholesale = cust?.type === 'wholesale'
          const isRegistered = !!cust
          if (priceVisibility === 'logged_in') {
            // Cualquier registrado ve precios retail; solo mayoristas ven precio mayorista
            showPrices = isRegistered
            showWholesale = isWholesale
          } else if (priceVisibility === 'wholesale_only') {
            // Solo mayoristas ven precios; retail logueado ve mensaje diferente
            showPrices = isWholesale
            showWholesale = isWholesale
            isRetailUser = isRegistered && !isWholesale
          }
        }
      }
    } catch { /* si no hay sesión, mantener defaults */ }
  }

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
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row gap-12">

            {/* Sidebar filtros — solo desktop */}
            <aside className="hidden md:block w-52 flex-shrink-0">
              <CatalogFilters
                categories={categoriesWithCount}
                availableColors={allColors}
                availableSizes={allSizes}
                maxPrice={0}
                currentCat={searchParams.cat}
                currentOrden={searchParams.orden}
                currentQ={searchParams.q}
                currentColor={searchParams.color}
                currentTalle={searchParams.talle}
                currentPrecioMin={precioMin}
                currentPrecioMax={precioMax}
                currentDescuento={soloDescuento}
              />
            </aside>

            {/* Grid productos */}
            <div className="flex-1">
              {/* Botón filtrar — solo mobile */}
              <MobileFilterDrawer
                categories={categoriesWithCount}
                availableColors={allColors}
                availableSizes={allSizes}
                currentCat={searchParams.cat}
                currentOrden={searchParams.orden}
                currentQ={searchParams.q}
                currentColor={searchParams.color}
                currentTalle={searchParams.talle}
                currentPrecioMin={precioMin}
                currentPrecioMax={precioMax}
                currentDescuento={soloDescuento}
                activeFilterCount={[searchParams.cat, searchParams.color, searchParams.talle, searchParams.precio_min, searchParams.precio_max, searchParams.descuento, searchParams.q].filter(Boolean).length}
              />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-12">
                {products.map((product: any, i: number) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    slug={product.slug}
                    coverUrl={product.cover?.url}
                    images={product.images}
                    retailPrice={product.retailPrice}
                    retailCompareAt={product.retailCompareAt}
                    wholesalePrice={product.wholesalePrice}
                    showPrices={showPrices}
                    showWholesale={showWholesale}
                    priceVisibility={priceVisibility}
                    isRetailUser={isRetailUser}
                    colors={product.colors}
                    sizes={product.sizes}
                    index={i}
                  />
                ))}

                {products.length === 0 && (
                  <div className="col-span-3 py-24 text-center">
                    <p className="font-display text-2xl font-light text-[var(--color-stone)]">
                      No hay productos con los filtros seleccionados
                    </p>
                    <a href="/tienda" className="text-sm text-[var(--color-stone)] underline mt-3 inline-block hover:text-[var(--color-charcoal)]">
                      Ver todos los productos
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

      </main>

      <Footer
        storeName={storeName}
        logoUrl={config?.logo_url ?? undefined}
        whatsapp={config?.whatsapp_number ?? ''}
        email={config?.notification_email ?? ''}
        instagramUrl={config?.instagram_url ?? undefined}
        facebookUrl={config?.facebook_url ?? undefined}
        tiktokUrl={config?.tiktok_url ?? undefined}
        branches={(config as any)?.branches ?? []}
      />
    </>
  )
}
