import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export const metadata = { title: 'Términos y Condiciones', robots: { index: false, follow: false } }

export default async function TermsPage() {
  const supabase = await createServerSupabase()
  const [{ data: tenant }, { data: config }] = await Promise.all([
    supabase.from('tenants').select('name').eq('id', TENANT_ID()).single(),
    supabase.from('store_config')
      .select('logo_url, whatsapp_number, notification_email, instagram_url, facebook_url, tiktok_url, branches, terms_and_conditions')
      .eq('tenant_id', TENANT_ID()).single(),
  ])
  const storeName = tenant?.name ?? 'TIENDA'
  const text = (config as any)?.terms_and_conditions

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />
      <main className="pt-32 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-24 overflow-x-hidden">
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-10">
            Términos y Condiciones
          </h1>
          {text ? (
            <div className="text-sm text-[var(--color-stone)] leading-relaxed font-light whitespace-pre-wrap break-words">
              {text}
            </div>
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
        email={config?.notification_email ?? ''}
        instagramUrl={config?.instagram_url ?? undefined}
        facebookUrl={config?.facebook_url ?? undefined}
        tiktokUrl={config?.tiktok_url ?? undefined}
        branches={(config as any)?.branches ?? []}
      />
    </>
  )
}