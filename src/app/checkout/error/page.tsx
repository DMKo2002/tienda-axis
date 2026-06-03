import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { XCircle } from 'lucide-react'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

export default async function CheckoutErrorPage({
  searchParams,
}: {
  searchParams: { order_id?: string }
}) {
  const supabase = await createServerSupabase()

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID).single()
  const { data: config } = await supabase.from('store_config').select('logo_url, whatsapp_number, notification_email').eq('tenant_id', TENANT_ID).single()

  return (
    <>
      <Navbar storeName={tenant?.name} logoUrl={config?.logo_url} />
      <main className="pt-28 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6">
            <XCircle size={32} className="text-red-400" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-3">
            Pago no completado
          </h1>
          <p className="text-sm text-[var(--color-stone)] font-light mb-8">
            Hubo un problema con el pago. Podés intentarlo de nuevo o elegir otro método.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/carrito" className="block w-full py-3 bg-[var(--color-charcoal)] text-white text-xs tracking-[0.2em] uppercase text-center hover:bg-[var(--color-stone)] transition-colors">
              Volver al carrito
            </Link>
            {config?.whatsapp_number && (
              <a
                href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=Hola! Tuve un problema con mi pago y necesito ayuda.`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 border border-[var(--color-border)] text-xs tracking-[0.2em] uppercase text-center text-[var(--color-stone)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
              >
                Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>
      </main>
      <Footer storeName={tenant?.name} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
