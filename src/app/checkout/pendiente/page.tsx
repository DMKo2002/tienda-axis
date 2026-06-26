import Link from 'next/link'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { Clock, Copy } from 'lucide-react'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

export default async function CheckoutPendientePage({
  searchParams,
}: {
  searchParams: { order_id?: string }
}) {
  const supabase = await createServerSupabase()
  const orderId = searchParams.order_id

  const { data: tenant } = await supabase.from('tenants').select('name').eq('id', TENANT_ID()).single()
  const { data: config } = await supabase
    .from('store_config')
    .select('logo_url, whatsapp_number, notification_email, transfer_cbu, transfer_alias')
    .eq('tenant_id', TENANT_ID())
    .single()

  const { data: order } = orderId
    ? await supabase.from('orders').select('total').eq('id', orderId).single()
    : { data: null }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  return (
    <>
      <Navbar storeName={tenant?.name} logoUrl={config?.logo_url} />
      <main className="pt-28 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 rounded-full mb-6">
            <Clock size={32} className="text-amber-500" strokeWidth={1.5} />
          </div>
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-3">
            Pedido recibido
          </h1>
          <p className="text-sm text-[var(--color-stone)] font-light mb-6">
            Tu pedido está pendiente de pago. Realizá la transferencia con los datos de abajo y te confirmamos en breve.
          </p>

          {orderId && (
            <p className="text-xs text-[var(--color-stone)] font-mono mb-6">
              Pedido #{orderId.slice(0, 8).toUpperCase()}
            </p>
          )}

          {/* Datos de transferencia */}
          {(config?.transfer_cbu || config?.transfer_alias) && (
            <div className="bg-[#F2EEE9] p-6 text-left mb-6 space-y-4">
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">
                Datos para transferir
              </p>

              {order?.total && (
                <div>
                  <p className="text-xs text-[var(--color-stone)]">Monto a transferir</p>
                  <p className="font-display text-2xl font-light text-[var(--color-charcoal)]">
                    {formatPrice(order.total)}
                  </p>
                </div>
              )}

              {config.transfer_alias && (
                <div>
                  <p className="text-xs text-[var(--color-stone)] mb-1">Alias</p>
                  <div className="flex items-center justify-between bg-white px-3 py-2.5">
                    <p className="text-sm font-light text-[var(--color-charcoal)]">{config.transfer_alias}</p>
                  </div>
                </div>
              )}

              {config.transfer_cbu && (
                <div>
                  <p className="text-xs text-[var(--color-stone)] mb-1">CBU</p>
                  <div className="flex items-center justify-between bg-white px-3 py-2.5">
                    <p className="text-sm font-mono font-light text-[var(--color-charcoal)]">{config.transfer_cbu}</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-[var(--color-stone)]">
                Una vez realizada la transferencia, envianos el comprobante por WhatsApp.
              </p>
            </div>
          )}

          {config?.whatsapp_number && (
            <a
              href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, '')}?text=Hola! Realicé el pedido %23${orderId?.slice(0, 8).toUpperCase() ?? ''} y quiero enviar el comprobante de transferencia.`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-[var(--color-charcoal)] text-white text-xs tracking-[0.2em] uppercase text-center hover:bg-[var(--color-stone)] transition-colors mb-3"
            >
              Enviar comprobante por WhatsApp
            </a>
          )}

          <Link href="/tienda" className="block w-full py-3 border border-[var(--color-border)] text-xs tracking-[0.2em] uppercase text-center text-[var(--color-stone)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors">
            Seguir comprando
          </Link>
        </div>
      </main>
      <Footer storeName={tenant?.name} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
