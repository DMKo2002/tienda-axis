import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) { console.warn('TURNSTILE_SECRET_KEY no configurada'); return true }
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nombre, apellido, email, password, tipo, empresa, cuit, direccion, turnstileToken } = body
    if (!nombre || !email || !password || !tipo)
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    if (password.length < 8)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    if (tipo === 'wholesale' && (!empresa || !cuit))
      return NextResponse.json({ error: 'Empresa y CUIT son obligatorios para cuentas mayoristas' }, { status: 400 })
    if (!turnstileToken)
      return NextResponse.json({ error: 'Verificación de seguridad requerida' }, { status: 400 })
    if (!await verifyTurnstile(turnstileToken))
      return NextResponse.json({ error: 'Verificación de seguridad fallida. Intentá de nuevo.' }, { status: 400 })

    const supabase = await createServerSupabase()
    const tenantId = TENANT_ID()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: `${nombre} ${apellido ?? ''}`.trim(), tipo } },
    })

    let userId: string

    if (authError?.message.includes('already registered')) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !signInData.user)
        return NextResponse.json(
          { error: 'Ya existe una cuenta con ese email. Si ya compraste en otra tienda CreArt, usá la misma contraseña — o iniciá sesión.' },
          { status: 409 }
        )
      userId = signInData.user.id
      const { data: existing } = await supabase.from('customers').select('id').eq('id', userId).eq('tenant_id', tenantId).maybeSingle()
      if (existing)
        return NextResponse.json({ error: 'Ya tenés una cuenta en esta tienda. Iniciá sesión.' }, { status: 409 })
    } else if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    } else {
      if (!authData.user) return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 })
      userId = authData.user.id
    }

    await supabase.from('customers').insert({
      id: userId, tenant_id: tenantId, email,
      full_name: nombre, last_name: apellido ?? null,
      company_name: empresa ?? null, cuit: cuit ?? null,
      phone: null, type: tipo, address_street: direccion ?? null, active: true,
    })

    return NextResponse.json({ ok: true, confirmacion: !authData?.session })
  } catch (err: any) {
    console.error('Error registro:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
