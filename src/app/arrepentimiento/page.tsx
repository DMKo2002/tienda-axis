import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { getStoreData } from '@creart/tienda-core/store-data'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ArrepentimientoForm from '@creart/tienda-core/ArrepentimientoForm'

export const metadata = { title: 'Botón de Arrepentimiento', robots: { index: false, follow: false } }

export default async function ArrepentimientoPage() {
  const supabase = await createServerSupabase()
  const { tenant, config } = await getStoreData(supabase, TENANT_ID())
  const storeName = tenant?.name ?? 'TIENDA'

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />
      <main className="pt-32 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 overflow-x-hidden">
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-6">
            Botón de Arrepentimiento
          </h1>
          <p className="text-sm text-[var(--color-stone)] leading-relaxed font-light mb-10">
            En cumplimiento de la Resolución 424/2020 de la Secretaría de Comercio Interior y el
            artículo 34 de la Ley 24.240 de Defensa del Consumidor, tenés derecho a revocar tu
            compra en {storeName} dentro de los 10 (diez) días corridos desde que la recibiste,
            sin necesidad de dar motivo ni asumir penalidad alguna. Completá el formulario y te
            vamos a contactar dentro de las 24 horas.
          </p>
          <ArrepentimientoForm />
        </div>
      </main>
      <Footer
        storeName={storeName}
        logoUrl={config?.logo_url ?? undefined}
        whatsapp={config?.whatsapp_number ?? ''}
        email={config?.contact_email ?? ''}
        instagramUrl={config?.instagram_url ?? undefined}
        facebookUrl={config?.facebook_url ?? undefined}
        tiktokUrl={config?.tiktok_url ?? undefined}
        branches={(config as any)?.branches ?? []}
        pickupAddress={(config as any)?.pickup_address ?? undefined}
      />
    </>
  )
}
