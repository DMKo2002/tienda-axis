import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

// Cliente con service role — bypasea RLS para crear clientes anónimos
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      fullName, email, phone,
      addressStreet, addressCity, addressProvince, addressZip,
      shippingMethod, shippingCost, notes, items,
      paymentMethod,
    } = body

    if (!fullName || !email || !items?.length) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Verificar si hay sesión activa (usuario registrado)
    const supabaseAuth = await createServerSupabase()
    const { data: { user } } = await supabaseAuth.auth.getUser()

    // Usar service role para operaciones que pueden fallar por RLS
    const supabase = createServiceClient()

    let customerId: string | null = null

    if (user) {
      // Usuario autenticado → el customer.id = auth.uid()
      customerId = user.id

      // Actualizar datos del customer si cambió algo
      await supabase.from('customers').upsert({
        id: user.id,
        tenant_id: TENANT_ID,
        email: user.email ?? email,
        full_name: fullName,
        phone: phone || null,
        address_street: addressStreet || null,
        address_city: addressCity || null,
        address_province: addressProvince || null,
        address_zip: addressZip || null,
      }, { onConflict: 'id', ignoreDuplicates: false })
    } else {
      // Usuario anónimo → buscar por email o crear nuevo
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', TENANT_ID)
        .eq('email', email.trim())
        .single()

      if (existing) {
        customerId = existing.id
      } else {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            tenant_id: TENANT_ID,
            email: email.trim(),
            full_name: fullName.trim(),
            phone: phone || null,
            address_street: addressStreet || null,
            address_city: addressCity || null,
            address_province: addressProvince || null,
            address_zip: addressZip || null,
            type: 'retail',
            active: true,
          })
          .select()
          .single()
        customerId = newCustomer?.id ?? null
      }
    }

    // Crear el pedido
    const subtotal = items.reduce((acc: number, i: any) => acc + i.price * i.quantity, 0)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        tenant_id: TENANT_ID,
        customer_id: customerId,
        status: 'pending',
        payment_method: paymentMethod,
        payment_status: 'pending',
        subtotal,
        shipping_cost: shippingCost ?? 0,
        total: subtotal + (shippingCost ?? 0),
        shipping_method: shippingMethod,
        shipping_address: { street: addressStreet, city: addressCity, province: addressProvince, zip: addressZip },
        notes: notes || null,
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Crear los items del pedido
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item: any) => ({
          tenant_id: TENANT_ID,
          order_id: order.id,
          variant_id: item.variantId ?? null,
          product_name: String(item.productName ?? 'Producto'),
          variant_desc: item.variantDesc ?? null,
          quantity: Number(item.quantity) || 1,
          unit_price: Number(item.price) || 0,
          price_type: item.priceType ?? 'retail',
        }))
      )
      if (itemsError) {
        console.error('Error insertando order_items:', itemsError)
        // Devolvemos el pedido de todas formas pero advertimos
        return NextResponse.json({ ok: true, order, warning: 'Items no guardados: ' + itemsError.message })
      }
    }

    return NextResponse.json({ ok: true, order })

  } catch (err: any) {
    console.error('Error crear pedido:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
