'use client'

import { useState } from 'react'
import { useCart } from '@/components/shop/CartContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Building2, ImageOff } from 'lucide-react'
import { createClient, TENANT_ID } from '@/lib/supabase'

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const supabase = createClient()

  const [step, setStep] = useState<'datos' | 'pago'>('datos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Datos del comprador
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressProvince, setAddressProvince] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [shippingMethod, setShippingMethod] = useState('pickup')
  const [notes, setNotes] = useState('')

  // Config de la tienda
  const [storeConfig, setStoreConfig] = useState<any>(null)

  useState(() => {
    supabase.from('store_config')
      .select('mp_enabled, transfer_enabled, transfer_cbu, transfer_alias, oca_enabled, andreani_enabled, pickup_enabled')
      .eq('tenant_id', TENANT_ID)
      .single()
      .then(({ data }) => setStoreConfig(data))
  })

  async function handleContinuar() {
    if (!fullName.trim()) { setError('El nombre es obligatorio'); return }
    if (!email.trim()) { setError('El email es obligatorio'); return }
    setError(null)
    setStep('pago')
  }

  async function createOrder(paymentMethod: 'mercadopago' | 'transfer') {
    setLoading(true)
    setError(null)

    try {
      // 1. Crear o buscar cliente
      let customerId: string | null = null
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('email', email.trim())
        .single()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            tenant_id: TENANT_ID,
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone.trim() || null,
            address_street: addressStreet.trim() || null,
            address_city: addressCity.trim() || null,
            address_province: addressProvince.trim() || null,
            address_zip: addressZip.trim() || null,
            type: 'retail',
          })
          .select()
          .single()
        customerId = newCustomer?.id ?? null
      }

      // 2. Crear pedido
      const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: TENANT_ID,
          customer_id: customerId,
          status: 'pending',
          payment_method: paymentMethod,
          payment_status: 'pending',
          subtotal,
          shipping_cost: 0,
          total: subtotal,
          shipping_method: shippingMethod,
          shipping_address: {
            street: addressStreet,
            city: addressCity,
            province: addressProvince,
            zip: addressZip,
          },
          notes: notes.trim() || null,
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 3. Crear items del pedido
      await supabase.from('order_items').insert(
        items.map(item => ({
          order_id: order.id,
          variant_id: item.variantId,
          product_name: item.productName,
          variant_desc: item.variantDesc,
          quantity: item.quantity,
          unit_price: item.price,
          price_type: item.priceType,
        }))
      )

      return order

    } catch (err: any) {
      setError(err.message ?? 'Error al crear el pedido')
      setLoading(false)
      return null
    }
  }

  async function handleMercadoPago() {
    const order = await createOrder('mercadopago')
    if (!order) return

    try {
      const res = await fetch('/api/mp/crear-preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: TENANT_ID,
          order_id: order.id,
          items: items.map(item => ({
            variant_id: item.variantId,
            name: item.productName,
            variant_desc: item.variantDesc,
            quantity: item.quantity,
            unit_price: item.price,
          })),
          payer: { name: fullName, email, phone },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      clearCart()
      // Redirigir al checkout de MP
      window.location.href = data.init_point ?? data.sandbox_init_point

    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar el pago')
      setLoading(false)
    }
  }

  async function handleTransferencia() {
    const order = await createOrder('transfer')
    if (!order) return

    clearCart()
    window.location.href = `/checkout/pendiente?order_id=${order.id}`
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <main className="pt-28 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl font-light text-[var(--color-stone)] mb-6">
              Tu carrito está vacío
            </p>
            <Link href="/tienda" className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase border-b border-[var(--color-charcoal)] pb-1 text-[var(--color-charcoal)]">
              Ir a la tienda
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">

          {/* Header */}
          <div className="flex items-center gap-4 mb-10">
            <Link href="/carrito" className="text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </Link>
            <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)]">
              {step === 'datos' ? 'Tus datos' : 'Método de pago'}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Formulario */}
            <div className="lg:col-span-2">

              {step === 'datos' && (
                <div className="space-y-5">
                  {/* Datos personales */}
                  <div className="space-y-4">
                    <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">
                      Datos de contacto
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--color-stone)] mb-1.5">Nombre completo *</label>
                        <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm text-[var(--color-charcoal)] focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-stone)] mb-1.5">Email *</label>
                        <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm text-[var(--color-charcoal)] focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-stone)] mb-1.5">Teléfono</label>
                      <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm text-[var(--color-charcoal)] focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 11 XXXX-XXXX" />
                    </div>
                  </div>

                  {/* Envío */}
                  <div className="space-y-4 pt-2">
                    <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">
                      Método de envío
                    </p>
                    <div className="space-y-2">
                      {storeConfig?.pickup_enabled && (
                        <label className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${shippingMethod === 'pickup' ? 'border-[var(--color-charcoal)]' : 'border-[var(--color-border)] hover:border-[var(--color-stone)]'}`}>
                          <input type="radio" name="shipping" value="pickup" checked={shippingMethod === 'pickup'} onChange={() => setShippingMethod('pickup')} className="accent-[var(--color-charcoal)]" />
                          <div>
                            <p className="text-sm font-light text-[var(--color-charcoal)]">Retiro en local</p>
                            <p className="text-xs text-[var(--color-stone)]">Sin costo de envío</p>
                          </div>
                        </label>
                      )}
                      {storeConfig?.oca_enabled && (
                        <label className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${shippingMethod === 'oca' ? 'border-[var(--color-charcoal)]' : 'border-[var(--color-border)] hover:border-[var(--color-stone)]'}`}>
                          <input type="radio" name="shipping" value="oca" checked={shippingMethod === 'oca'} onChange={() => setShippingMethod('oca')} className="accent-[var(--color-charcoal)]" />
                          <div>
                            <p className="text-sm font-light text-[var(--color-charcoal)]">OCA</p>
                            <p className="text-xs text-[var(--color-stone)]">Envío a domicilio</p>
                          </div>
                        </label>
                      )}
                      {storeConfig?.andreani_enabled && (
                        <label className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${shippingMethod === 'andreani' ? 'border-[var(--color-charcoal)]' : 'border-[var(--color-border)] hover:border-[var(--color-stone)]'}`}>
                          <input type="radio" name="shipping" value="andreani" checked={shippingMethod === 'andreani'} onChange={() => setShippingMethod('andreani')} className="accent-[var(--color-charcoal)]" />
                          <div>
                            <p className="text-sm font-light text-[var(--color-charcoal)]">Andreani</p>
                            <p className="text-xs text-[var(--color-stone)]">Envío a domicilio</p>
                          </div>
                        </label>
                      )}
                    </div>

                    {shippingMethod !== 'pickup' && (
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="col-span-2">
                          <label className="block text-xs text-[var(--color-stone)] mb-1.5">Calle y número</label>
                          <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="Av. Corrientes 1234" />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-stone)] mb-1.5">Ciudad</label>
                          <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="Buenos Aires" />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-stone)] mb-1.5">Provincia</label>
                          <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={addressProvince} onChange={e => setAddressProvince(e.target.value)} placeholder="Buenos Aires" />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-stone)] mb-1.5">Código postal</label>
                          <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={addressZip} onChange={e => setAddressZip(e.target.value)} placeholder="1000" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-xs text-[var(--color-stone)] mb-1.5">Notas del pedido (opcional)</label>
                    <textarea className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones especiales..." />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button onClick={handleContinuar} className="w-full py-4 bg-[var(--color-charcoal)] text-white text-xs tracking-[0.2em] uppercase hover:bg-[var(--color-stone)] transition-colors">
                    Continuar →
                  </button>
                </div>
              )}

              {step === 'pago' && (
                <div className="space-y-4">
                  <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">
                    Elegí cómo pagar
                  </p>

                  {storeConfig?.mp_enabled && (
                    <button
                      onClick={handleMercadoPago}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-5 border border-[var(--color-border)] hover:border-[var(--color-charcoal)] transition-colors text-left disabled:opacity-60"
                    >
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CreditCard size={20} className="text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-light text-[var(--color-charcoal)]">MercadoPago</p>
                        <p className="text-xs text-[var(--color-stone)] mt-0.5">Tarjeta, débito, QR, cuotas</p>
                      </div>
                      <span className="text-[var(--color-stone)]">→</span>
                    </button>
                  )}

                  {storeConfig?.transfer_enabled && (
                    <button
                      onClick={handleTransferencia}
                      disabled={loading}
                      className="w-full flex items-center gap-4 p-5 border border-[var(--color-border)] hover:border-[var(--color-charcoal)] transition-colors text-left disabled:opacity-60"
                    >
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 size={20} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-light text-[var(--color-charcoal)]">Transferencia bancaria</p>
                        <p className="text-xs text-[var(--color-stone)] mt-0.5">
                          {storeConfig.transfer_alias ? `Alias: ${storeConfig.transfer_alias}` : storeConfig.transfer_cbu ? `CBU: ${storeConfig.transfer_cbu}` : 'El vendedor te enviará los datos'}
                        </p>
                      </div>
                      <span className="text-[var(--color-stone)]">→</span>
                    </button>
                  )}

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button onClick={() => setStep('datos')} className="text-xs text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">
                    ← Volver a mis datos
                  </button>
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="lg:col-span-1">
              <div className="bg-[#F2EEE9] p-6 sticky top-28">
                <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-5">
                  Tu pedido
                </p>
                <div className="space-y-4 mb-5">
                  {items.map(item => (
                    <div key={item.variantId} className="flex gap-3">
                      <div className="w-14 h-14 bg-white flex-shrink-0 overflow-hidden">
                        {item.imageUrl
                          ? <img src={item.imageUrl} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageOff size={16} className="text-[var(--color-border)]" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-light text-[var(--color-charcoal)] truncate">{item.productName}</p>
                        {item.variantDesc && <p className="text-xs text-[var(--color-stone)]">{item.variantDesc}</p>}
                        <p className="text-xs text-[var(--color-stone)] mt-0.5">×{item.quantity}</p>
                      </div>
                      <p className="text-xs font-light text-[var(--color-charcoal)] flex-shrink-0">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[var(--color-border)] pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)]">Total</span>
                    <span className="font-display text-2xl font-light text-[var(--color-charcoal)]">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
