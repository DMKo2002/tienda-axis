import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'
import { registroLimiter } from '@/lib/ratelimit'
import { sendEmail, emailBienvenidaCliente } from '@/lib/email'

// ──────────────────────────────────────────────────────────
//  POST /api/auth/registro
//  Body: { nombre, apellido, email, password, tipo,
//          empresa?, cuit?, direccion?,
//          turnstileToken }
// ──────────────────────────────────────────────────────────

async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.warn('TURNSTILE_SECRET_KEY no configurada — saltando verificación')
    return true
  }
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  })
  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const { success } = await registroLimiter.limit(ip)
  if (!success) {
    return NextResponse.json({ error: 'Demasiados intentos. Esperá 10 minutos e intentá de nuevo.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const { nombre, apellido, email, password, tipo, empresa, cuit, direccion, turnstileToken } = body

    // Validaciones básicas
    if (!nombre || !email || !password || !tipo) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }
    if (tipo === 'wholesale' && (!empresa || !cuit)) {
      return NextResponse.json({ error: 'Empresa y CUIT son obligatorios para cuentas mayoristas' }, { status: 400 })
    }

    // Verificar Turnstile
    if (!turnstileToken) {
      return NextResponse.json({ error: 'Verificación de seguridad requerida' }, { status: 400 })
    }
    const captchaOk = await verifyTurnstile(turnstileToken)
    if (!captchaOk) {
      return NextResponse.json({ error: 'Verificación de seguridad fallida. Intentá de nuevo.' }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${nombre} ${apellido ?? ''}`.trim(),
          tipo,
        },
      },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Error al crear el usuario' }, { status: 500 })
    }

    // Insertar en tabla customers
    await supabase.from('customers').insert({
      id: authData.user.id,
      tenant_id: TENANT_ID(),
      email,
      full_name: nombre,
      last_name: apellido ?? null,
      company_name: empresa ?? null,
      cuit: cuit ?? null,
      phone: null,
      type: tipo,
      address_street: direccion ?? null,
      active: true,
    })

    // Email de bienvenida (no bloqueante)
    const storeUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const { data: tenantData } = await supabase.from('tenants').select('name').eq('id', TENANT_ID()).single()
    const storeName = (tenantData as any)?.name ?? 'Tienda'
    sendEmail({
      to: email,
      subject: `Bienvenida a ${storeName}`,
      html: emailBienvenidaCliente({ storeName, firstName: nombre, storeUrl }),
    }).catch(() => {})

    return NextResponse.json({ ok: true, confirmacion: !authData.session })
    // confirmacion: true → Supabase requiere verificar email antes de poder iniciar sesión

  } catch (err: any) {
    console.error('Error registro:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
