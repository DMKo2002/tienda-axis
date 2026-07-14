import { redirect } from 'next/navigation'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import Link from 'next/link'
import LogoutButton from '@/components/cuenta/LogoutButton'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', confirmed: 'Confirmado', shipped: 'En camino',
  delivered: 'Entregado', cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  confirmed: 'text-blue-600 bg-blue-50 border-blue-200',
  shipped: 'text-violet-600 bg-violet-50 border-violet-200',
  delivered: 'text-green-600 bg-green-50 border-green-200',
  cancelled: 'text-red-500 bg-red-50 border-red-200',
}

export default async function CuentaPage() {
  const supabase = await createServerSupabase()
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData?.session?.user

  if (!user) redirect('/cuenta/login')

  // auth_user_id identifica a la persona logueada — el id propio del customer
  // (usado como customer_id en orders) puede ser distinto por tienda.
  const [{ data: config }, { data: tenant }, { data: customer }] = await Promise.all([
    supabase.from('store_config').select('logo_url, whatsapp_number, notification_email').eq('tenant_id', TENANT_ID()).single(),
    supabase.from('tenants').select('name').eq('id', TENANT_ID()).single(),
    supabase.from('customers').select('*').eq('auth_user_id', user!.id).eq('tenant_id', TENANT_ID()).maybeSingle(),
  ])

  const { data: orders } = customer
    ? await supabase.from('orders')
        .select('id, status, total, shipping_cost, created_at, payment_method, order_items(product_name, quantity, unit_price)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] as any[] }

  const storeName = tenant?.name ?? 'TIENDA'
  const isMayorista = customer?.type === 'wholesale'

  return (
    <>
      <Navbar storeName={storeName} logoUrl={config?.logo_url} />
      <main className="pt-28 min-h-screen bg-[var(--color-bg)]">
        <div className="max-w-3xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="flex items-start justify-between mb-10 pb-8 border-b border-[var(--color-border)]">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-1">
                {isMayorista ? 'Cuenta Mayorista' : 'Mi Cuenta'}
              </p>
              <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)]">
                Hola, {customer?.full_name ?? customer?.email ?? 'Cliente'}
              </h1>
              {isMayorista && customer?.company_name && (
                <p className="text-sm text-[var(--color-stone)] mt-1">{customer.company_name}</p>
              )}
            </div>
            <LogoutButton />
          </div>

          {/* Datos de la cuenta */}
          <div className="grid grid-cols-2 gap-6 mb-10">
            <div className="border border-[var(--color-border)] p-5">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-stone)] mb-3">Datos personales</p>
              <div className="space-y-1 text-sm text-[var(--color-charcoal)] font-light">
                <p>{customer?.full_name}</p>
                <p className="text-[var(--color-stone)]">{customer?.email ?? user!.email}</p>
                {customer?.phone && <p>{customer.phone}</p>}
              </div>
              {!isMayorista && (
                <Link
                  href="/cuenta/registro?upgrade=1"
                  className="inline-block mt-4 text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors"
                >
                  Pasate a Mayorista
                </Link>
              )}
            </div>
            {isMayorista && (
              <div className="border border-[var(--color-border)] p-5">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-stone)] mb-3">Datos fiscales</p>
                <div className="space-y-1 text-sm text-[var(--color-charcoal)] font-light">
                  <p>{customer?.company_name}</p>
                  {(customer as any)?.cuit && <p className="text-[var(--color-stone)]">CUIT: {(customer as any).cuit}</p>}
                  {customer?.address_street && <p>{customer.address_street}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Pedidos */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--color-stone)] mb-5">Mis pedidos</p>

            {(!orders || orders.length === 0) ? (
              <div className="border border-[var(--color-border)] py-16 text-center">
                <p className="font-display text-2xl font-light text-[var(--color-stone)] mb-4">
                  Todavía no realizaste pedidos
                </p>
                <Link href="/tienda" className="text-sm text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors">
                  Explorar la tienda
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div key={order.id} className="border border-[var(--color-border)] p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-xs text-[var(--color-stone)] font-light">
                          {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-[var(--color-stone)] font-light mt-0.5">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                      <span className={`text-[10px] tracking-wide uppercase border px-2 py-0.5 ${STATUS_COLOR[order.status] ?? 'text-zinc-500 bg-zinc-50 border-zinc-200'}`}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                    </div>
                    <div className="space-y-1 mb-3">
                      {order.order_items?.map((item: any, i: number) => (
                        <p key={i} className="text-sm font-light text-[var(--color-charcoal)]">
                          {item.quantity}× {item.product_name}
                          <span className="text-[var(--color-stone)] ml-2">{formatPrice(item.unit_price)}</span>
                        </p>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-stone)] font-light capitalize">
                        {order.payment_method === 'mercadopago' ? 'MercadoPago' : 'Transferencia'}
                      </p>
                      <p className="text-sm font-medium text-[var(--color-charcoal)]">
                        Total: {formatPrice(order.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer storeName={storeName} whatsapp={config?.whatsapp_number ?? ''} email={config?.notification_email ?? ''} />
    </>
  )
}
