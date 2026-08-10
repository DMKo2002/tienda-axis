import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { getStoreData } from '@creart/tienda-core/store-data'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Política de Privacidad', robots: { index: false, follow: false } }

export default async function PrivacyPage() {
  const supabase = await createServerSupabase()
  const { tenant, config } = await getStoreData(supabase, TENANT_ID())
  const storeName = tenant?.name ?? 'TIENDA'
  const text = (config as any)?.privacy_policy

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />
      <main className="pt-32 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 overflow-x-hidden">
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-10">
            Política de Privacidad
          </h1>
          {text ? (
            <div className="text-sm text-[var(--color-stone)] leading-relaxed font-light whitespace-pre-wrap break-words">
              {text}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-stone)] font-light">
              Esta sección está en preparación.
            </p>
          )}
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
        pickupAddress={(config as any)?.pickup_address ?? undefined}
      />
    </>
  )
}