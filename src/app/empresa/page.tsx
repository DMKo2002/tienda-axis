import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { getStoreData } from '@creart/tienda-core/store-data'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Empresa', robots: { index: false, follow: false } }

export default async function EmpresaPage() {
  const supabase = await createServerSupabase()
  const { tenant, config } = await getStoreData(supabase, TENANT_ID())
  const storeName = tenant?.name ?? 'TIENDA'
  const sellerLegalName = (config as any)?.seller_legal_name
  const sellerCuit = (config as any)?.seller_cuit
  const sellerLegalAddress = (config as any)?.seller_legal_address
  const hasSellerInfo = Boolean(sellerLegalName || sellerCuit || sellerLegalAddress)

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />
      <main className="pt-32 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 overflow-x-hidden">
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-10">
            Datos de la Empresa
          </h1>
          {hasSellerInfo ? (
            <dl className="text-sm text-[var(--color-stone)] leading-relaxed font-light space-y-5">
              {sellerLegalName && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--color-stone)] opacity-70 mb-1">Razón social</dt>
                  <dd className="break-words">{sellerLegalName}</dd>
                </div>
              )}
              {sellerCuit && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--color-stone)] opacity-70 mb-1">CUIT</dt>
                  <dd className="break-words">{sellerCuit}</dd>
                </div>
              )}
              {sellerLegalAddress && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-[var(--color-stone)] opacity-70 mb-1">Domicilio legal</dt>
                  <dd className="break-words">{sellerLegalAddress}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-[var(--color-stone)] font-light">
              Esta sección está en preparación. Para consultas contactanos por{' '}
              {config?.whatsapp_number
                ? <a href={`https://wa.me/${(config.whatsapp_number as string).replace(/\D/g,'')}`} className="underline">WhatsApp</a>
                : 'nuestros canales de contacto'}.
            </p>
          )}
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
