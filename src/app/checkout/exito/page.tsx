import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { CheckCircle } from 'lucide-react'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

export default async function CheckoutExitoPage({
  searchParams,
}: {
  searchParams: { order_id?: string }
}) {
  const supabase = await createServerSupabase()
  const orderId = searchParams.order_id

  // Actualizar estado del pedido si viene de MP
  if (orderId) {
    await supabase
      .from('orders')
      .update({ payment_status: 'paid', status: 'confirmed' })
      .eq('id', orderId)
      .eq('tenant_id', TENANT_ID)
  }

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID).single()
  const { data: config } = await supabase.from('store_config').select('logo_url, whatsapp_number, notification_email').eq('tenant_id', TENANT_ID).single()

  return (
    <>
      <Navbar storeName={tenant?.name} logoUrl={config?.logo_url} />
      <main className="pt-28 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-6">
            <CheckCircle size={32} className="text-emerald-500" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-3">
            ¡Pago confirmado!
          </h1>
          <p className="text-sm text-[var(--color-stone)] font-light mb-2">
            Tu pedido fue procesado correctamente.
          </p>
          {orderId && (
            <p className="text-xs text-[var(--color-stone)] font-mono mb-8">
              Pedido #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}
          {config?.whatsapp_number && (
            <p className="text-xs text-[var(--color-stone)] mb-8">
              Te vamos a contactar por WhatsApp al{' '}
              <a href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}`} className="underline">
                {config.whatsapp_number}
              </a>{' '}
              para coordinar el envío.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <Link href="/tienda" className="block w-full py-3 bg-[var(--color-charcoal)] text-white text-xs tracking-[0.2em] uppercase text-center hover:bg-[var(--color-stone)] transition-colors">
              Seguir comprando
            </Link>
            {orderId && (
              <a
                href={`${process.env.NEXT_PUBLIC_PANEL_URL ?? ''}/api/pdf?order_id=${orderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full py-3 border border-[var(--color-border)] text-xs tracking-[0.2em] uppercase text-center text-[var(--color-stone)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
              >
                Descargar comprobante PDF
              </a>
            )}
          </div>
        </div>
      </main>
      <Footer storeName={tenant?.name} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
