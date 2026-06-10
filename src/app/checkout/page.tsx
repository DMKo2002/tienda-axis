'use client'

import { useState, useEffect, useRef } from 'react'
import { useCart } from '@/components/shop/CartContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Building2, ImageOff, Check, Loader2 } from 'lucide-react'
import { createClient, TENANT_ID } from '@/lib/supabase'

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const supabase = createClient()

  const [step, setStep] = useState<'datos' | 'pago' | 'qr'>('datos')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [storeConfig, setStoreConfig] = useState<any>(null)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)
  const [orderTotal, setOrderTotal] = useState(0)

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressProvince, setAddressProvince] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [shippingMethod, setShippingMethod] = useState('pickup')
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState<'alias' | 'cbu' | null>(null)

  // ── Andreani cotización ─────────────────────────────────
  const [shippingCost, setShippingCost] = useState(0)
  const [cotizandoFlete, setCotizandoFlete] = useState(false)
  const [fleteError, setFleteError] = useState<string | null>(null)
  const [fleteModo, setFleteModo] = useState<'api' | 'fallback' | null>(null)
  const cotizarDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.from('store_config')
      .select('mp_enabled, transfer_enabled, transfer_cbu, transfer_alias, oca_enabled, andreani_enabled, pickup_enabled, whatsapp_number, min_order_amount')
      .eq('tenant_id', TENANT_ID)
      .single()
      .then(({ data }) => setStoreConfig(data))
  }, [])

  // Cotizar Andreani automáticamente cuando hay CP válido
  useEffect(() => {
    if (shippingMethod !== 'andreani') {
      setShippingCost(0)
      setFleteError(null)
      setFleteModo(null)
      return
    }

    const cpValido = addressZip.match(/^\d{4}$/)
    if (!cpValido) {
      setShippingCost(0)
      setFleteError(null)
      return
    }

    if (cotizarDebounceRef.current) clearTimeout(cotizarDebounceRef.current)

    cotizarDebounceRef.current = setTimeout(async () => {
      setCotizandoFlete(true)
      setFleteError(null)
      try {
        const res = await fetch('/api/andreani/cotizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo_postal: addressZip,
            cantidad_items: items.reduce((acc, i) => acc + i.quantity, 0),
          }),
        })
        const data = await res.json()
        if (data.error && data.costo === undefined) {
          setFleteError('No se pudo calcular el flete')
          setShippingCost(0)
        } else {
          setShippingCost(data.costo ?? 0)
          setFleteModo(data.modo ?? null)
          if (data.error) setFleteError(data.error)
        }
      } catch {
        setFleteError('Error al calcular el flete')
        setShippingCost(0)
      } finally {
        setCotizandoFlete(false)
      }
    }, 600)
  }, [shippingMethod, addressZip, items])

  // Resetear costo si cambia el método de envío
  useEffect(() => {
    if (shippingMethod !== 'andreani') setShippingCost(0)
  }, [shippingMethod])

  const totalConEnvio = total + shippingCost

  const minOrder: number | null = storeConfig?.min_order_amount ?? null
  const meetsMin = !minOrder || total >= minOrder

  async function handleContinuar() {
    if (!meetsMin) {
      const falta = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(minOrder! - total)
      setError(`El pedido mínimo es de ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(minOrder!)}. Te faltan ${falta}.`)
      return
    }
    if (!fullName.trim()) { setError('El nombre es obligatorio'); return }
    if (!email.trim()) { setError('El email es obligatorio'); return }
    if (shippingMethod === 'andreani' && !addressZip.match(/^\d{4}$/)) {
      setError('Ingresá un código postal válido (4 dígitos) para calcular el envío')
      return
    }
    setError(null)
    setStep('pago')
  }

  async function createOrder(paymentMethod: 'mercadopago' | 'transfer') {
    setLoading(true)
    setError(null)
    try {
      let customerId: string | null = null
      const { data: existingCustomer } = await supabase
        .from('customers').select('id')
        .eq('tenant_id', TENANT_ID).eq('email', email.trim()).single()

      if (existingCustomer) {
        customerId = existingCustomer.id
      } else {
        const { data: newCustomer } = await supabase.from('customers').insert({
          tenant_id: TENANT_ID, email: email.trim(), full_name: fullName.trim(),
          phone: phone.trim() || null, address_street: addressStreet.trim() || null,
          address_city: addressCity.trim() || null, address_province: addressProvince.trim() || null,
          address_zip: addressZip.trim() || null, type: 'retail',
        }).select().single()
        customerId = newCustomer?.id ?? null
      }

      const subtotal = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        tenant_id: TENANT_ID, customer_id: customerId, status: 'pending',
        payment_method: paymentMethod, payment_status: 'pending',
        subtotal, shipping_cost: shippingCost, total: subtotal + shippingCost,
        shipping_method: shippingMethod,
        shipping_address: { street: addressStreet, city: addressCity, province: addressProvince, zip: addressZip },
        notes: notes.trim() || null,
      }).select().single()

      if (orderError) throw orderError

      await supabase.from('order_items').insert(
        items.map(item => ({
          order_id: order.id, variant_id: item.variantId,
          product_name: item.productName, variant_desc: item.variantDesc,
          quantity: item.quantity, unit_price: item.price, price_type: item.priceType,
          subtotal: item.price * item.quantity,
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
          tenant_id: TENANT_ID, order_id: order.id,
          items: items.map(item => ({
            variant_id: item.variantId, name: item.productName,
            variant_desc: item.variantDesc, quantity: item.quantity, unit_price: item.price,
          })),
          payer: { name: fullName, email, phone },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      clearCart()
      window.location.href = data.init_point ?? data.sandbox_init_point
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar el pago')
      setLoading(false)
    }
  }

  async function handleTransferencia() {
    const order = await createOrder('transfer')
    if (!order) return
    setCurrentOrderId(order.id)
    setOrderTotal(totalConEnvio)
    clearCart()
    setStep('qr')
    setLoading(false)
  }

  function copyToClipboard(text: string, type: 'alias' | 'cbu') {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  if (items.length === 0 && step !== 'qr') {
    return (
      <>
        <Navbar />
        <main className="pt-28 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="font-display text-3xl font-light text-[var(--color-stone)] mb-6">Tu carrito está vacío</p>
            <Link href="/tienda" className="inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase border-b border-[var(--color-charcoal)] pb-1 text-[var(--color-charcoal)]">
              Ir a la tienda
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ── PANTALLA TRANSFERENCIA ────────────────────────────────
  if (step === 'qr') {
    return (
      <>
        <Navbar />
        <main className="pt-28 min-h-screen flex items-center justify-center">
          <div className="max-w-sm w-full mx-auto px-6 text-center">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-2">
              Transferencia bancaria
            </p>
            <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mb-1">
              {formatPrice(orderTotal)}
            </h1>
            {currentOrderId && (
              <p className="text-xs text-[var(--color-stone)] font-mono mb-8">
                Pedido #{currentOrderId.slice(0, 8).toUpperCase()}
              </p>
            )}

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <span className="text-xs text-[var(--color-stone)]">o transferí manualmente</span>
              <div className="flex-1 h-px bg-[var(--color-border)]" />
            </div>

            <div className="space-y-3 mb-8">
              {storeConfig?.transfer_alias && (
                <div className="flex items-center justify-between bg-[#F2EEE9] px-4 py-3 text-left">
                  <div>
                    <p className="text-xs text-[var(--color-stone)] mb-0.5">Alias</p>
                    <p className="text-sm font-light text-[var(--color-charcoal)]">{storeConfig.transfer_alias}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(storeConfig.transfer_alias, 'alias')}
                    className="text-xs text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors flex items-center gap-1 flex-shrink-0 ml-4"
                  >
                    {copied === 'alias' ? <><Check size={12} /> Copiado</> : 'Copiar'}
                  </button>
                </div>
              )}
              {storeConfig?.transfer_cbu && (
                <div className="flex items-center justify-between bg-[#F2EEE9] px-4 py-3 text-left">
                  <div className="min-w-0">
                    <p className="text-xs text-[var(--color-stone)] mb-0.5">CBU</p>
                    <p className="text-xs font-mono font-light text-[var(--color-charcoal)] break-all">{storeConfig.transfer_cbu}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(storeConfig.transfer_cbu, 'cbu')}
                    className="text-xs text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors flex items-center gap-1 flex-shrink-0 ml-4"
                  >
                    {copied === 'cbu' ? <><Check size={12} /> Copiado</> : 'Copiar'}
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-[var(--color-stone)] mb-6 leading-relaxed">
              Una vez realizada la transferencia, envianos el comprobante por WhatsApp y confirmamos tu pedido.
            </p>

            <div className="space-y-3">
              {storeConfig?.whatsapp_number && (
                <a
                  href={`https://wa.me/${storeConfig.whatsapp_number.replace(/\D/g, '')}?text=Hola! Realicé el pedido %23${currentOrderId?.slice(0, 8).toUpperCase() ?? ''} por ${formatPrice(orderTotal)} y quiero enviar el comprobante.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3.5 bg-[var(--color-charcoal)] text-white text-xs tracking-[0.2em] uppercase text-center hover:bg-[var(--color-stone)] transition-colors"
                >
                  Enviar comprobante por WhatsApp
                </a>
              )}
              <Link
                href="/tienda"
                className="block w-full py-3 border border-[var(--color-border)] text-xs tracking-[0.2em] uppercase text-center text-[var(--color-stone)] hover:border-[var(--color-charcoal)] hover:text-[var(--color-charcoal)] transition-colors"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  // ── CHECKOUT NORMAL ──────────────────────────────────────
  return (
    <>
      <Navbar />
      <main className="pt-28 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-12">

          <div className="flex items-center gap-4 mb-10">
            <Link href="/carrito" className="text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">
              <ArrowLeft size={20} strokeWidth={1.5} />
            </Link>
            <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)]">
              {step === 'datos' ? 'Tus datos' : 'Método de pago'}
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">

              {step === 'datos' && (
                <div className="space-y-5">
                  {/* Datos de contacto */}
                  <div className="space-y-4">
                    <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">Datos de contacto</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-[var(--color-stone)] mb-1.5">Nombre completo *</label>
                        <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--color-stone)] mb-1.5">Email *</label>
                        <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-stone)] mb-1.5">Teléfono</label>
                      <input className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+54 9 11 XXXX-XXXX" />
                    </div>
                  </div>

                  {/* Método de envío */}
                  <div className="space-y-4 pt-2">
                    <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">Método de envío</p>
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
                          <div className="flex-1">
                            <p className="text-sm font-light text-[var(--color-charcoal)]">Andreani</p>
                            <p className="text-xs text-[var(--color-stone)]">Envío a domicilio</p>
                          </div>
                          {/* Indicador de costo en tiempo real */}
                          {shippingMethod === 'andreani' && (
                            <div className="ml-auto flex-shrink-0 text-right">
                              {cotizandoFlete ? (
                                <span className="flex items-center gap-1 text-xs text-[var(--color-stone)]">
                                  <Loader2 size={12} className="animate-spin" /> Calculando...
                                </span>
                              ) : shippingCost > 0 ? (
                                <span className="text-sm font-light text-[var(--color-charcoal)]">
                                  {formatPrice(shippingCost)}
                                  {fleteModo === 'fallback' && <span className="block text-xs text-[var(--color-stone)]">tarifa estimada</span>}
                                </span>
                              ) : addressZip.match(/^\d{4}$/) ? (
                                <span className="text-xs text-[var(--color-stone)]">Gratis</span>
                              ) : null}
                            </div>
                          )}
                        </label>
                      )}
                    </div>

                    {/* Error de cotización */}
                    {shippingMethod === 'andreani' && fleteError && (
                      <p className="text-xs text-amber-600">{fleteError} — se usará tarifa estimada.</p>
                    )}

                    {/* Dirección (si no es retiro en local) */}
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
                          <label className="block text-xs text-[var(--color-stone)] mb-1.5">
                            Código postal {shippingMethod === 'andreani' && <span className="text-[var(--color-charcoal)]">*</span>}
                          </label>
                          <input
                            className={`w-full px-3 py-2.5 border bg-white text-sm focus:outline-none transition-colors ${
                              shippingMethod === 'andreani' && addressZip && !addressZip.match(/^\d{4}$/)
                                ? 'border-red-300 focus:border-red-400'
                                : 'border-[var(--color-border)] focus:border-[var(--color-charcoal)]'
                            }`}
                            value={addressZip}
                            onChange={e => setAddressZip(e.target.value)}
                            placeholder="1000"
                            maxLength={4}
                          />
                          {shippingMethod === 'andreani' && (
                            <p className="text-xs text-[var(--color-stone)] mt-1">
                              {addressZip.match(/^\d{4}$/)
                                ? cotizandoFlete ? '⏳ Calculando flete...' : '✓ Flete calculado'
                                : 'Ingresá 4 dígitos para calcular el flete'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-xs text-[var(--color-stone)] mb-1.5">Notas (opcional)</label>
                    <textarea className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instrucciones especiales..." />
                  </div>

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    onClick={handleContinuar}
                    disabled={cotizandoFlete || !meetsMin}
                    className="w-full py-4 bg-[var(--color-charcoal)] text-white text-xs tracking-[0.2em] uppercase hover:bg-[var(--color-stone)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cotizandoFlete ? 'Calculando flete...' : 'Continuar →'}
                  </button>
                </div>
              )}

              {step === 'pago' && (
                <div className="space-y-4">
                  <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)]">Elegí cómo pagar</p>
                  {storeConfig?.mp_enabled && (
                    <button onClick={handleMercadoPago} disabled={loading} className="w-full flex items-center gap-4 p-5 border border-[var(--color-border)] hover:border-[var(--color-charcoal)] transition-colors text-left disabled:opacity-60">
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
                    <button onClick={handleTransferencia} disabled={loading} className="w-full flex items-center gap-4 p-5 border border-[var(--color-border)] hover:border-[var(--color-charcoal)] transition-colors text-left disabled:opacity-60">
                      <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 size={20} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-light text-[var(--color-charcoal)]">Transferencia bancaria</p>
                        <p className="text-xs text-[var(--color-stone)] mt-0.5">CBU / Alias · Sin comisión</p>
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

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <div className="bg-[#F2EEE9] p-6 sticky top-28">
                <p className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] mb-5">Tu pedido</p>
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

                <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-[var(--color-stone)]">
                    <span>Subtotal</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                  {shippingMethod !== 'pickup' && (
                    <div className="flex justify-between items-center text-xs text-[var(--color-stone)]">
                      <span>Envío ({shippingMethod === 'andreani' ? 'Andreani' : shippingMethod === 'oca' ? 'OCA' : 'Envío'})</span>
                      <span>
                        {cotizandoFlete
                          ? <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> ...</span>
                          : shippingCost > 0 ? formatPrice(shippingCost) : 'Gratis'
                        }
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
                    <span className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)]">Total</span>
                    <span className="font-display text-2xl font-light text-[var(--color-charcoal)]">
                      {formatPrice(totalConEnvio)}
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
