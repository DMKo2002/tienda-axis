import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, TENANT_ID } from '@/lib/supabase-server'

// ──────────────────────────────────────────────────────────
//  POST /api/andreani/cotizar
//  Body: { codigo_postal: string, cantidad_items: number }
//  Response: { costo: number, modo: 'api' | 'fallback', error?: string }
// ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { codigo_postal, cantidad_items } = await req.json()

    if (!codigo_postal || !String(codigo_postal).match(/^\d{4}$/)) {
      return NextResponse.json({ error: 'Código postal inválido (debe ser 4 dígitos)' }, { status: 400 })
    }

    const supabase = await createServerSupabase()
    const { data: config } = await supabase
      .from('store_config')
      .select(
        'andreani_usuario, andreani_password, andreani_codigo_cliente, andreani_contrato_dom, ' +
        'andreani_cp_origen, andreani_sandbox, andreani_peso_default_g, andreani_tarifa_fallback'
      )
      .eq('tenant_id', TENANT_ID)
      .single()

    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 500 })
    }

    const tieneCredenciales =
      config.andreani_usuario &&
      config.andreani_password &&
      config.andreani_codigo_cliente &&
      config.andreani_contrato_dom &&
      config.andreani_cp_origen

    // ── Sin credenciales: devolver tarifa fallback ──────────
    if (!tieneCredenciales) {
      return NextResponse.json({
        costo: config.andreani_tarifa_fallback ?? 0,
        modo: 'fallback',
      })
    }

    // ── Con credenciales: llamar a la API de Andreani ───────
    const BASE_URL = config.andreani_sandbox
      ? 'https://api.qa.andreani.com'
      : 'https://api.andreani.com'

    // 1. Login → obtener token de sesión
    const loginRes = await fetch(`${BASE_URL}/login`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.andreani_usuario}:${config.andreani_password}`).toString('base64')}`,
      },
    })

    if (!loginRes.ok) {
      console.error('Andreani login failed:', loginRes.status)
      return NextResponse.json({
        costo: config.andreani_tarifa_fallback ?? 0,
        modo: 'fallback',
        error: 'No se pudo autenticar con Andreani',
      })
    }

    const token = loginRes.headers.get('x-authorization-token')
    if (!token) {
      return NextResponse.json({
        costo: config.andreani_tarifa_fallback ?? 0,
        modo: 'fallback',
        error: 'Token no recibido de Andreani',
      })
    }

    // 2. Armar parámetros de cotización
    //    Un bulto por pedido: peso = peso_default * cantidad_items
    const pesoTotal = (config.andreani_peso_default_g ?? 500) * (cantidad_items ?? 1)
    const pesoKg = Math.max(pesoTotal / 1000, 0.1) // mínimo 100g

    const params = new URLSearchParams({
      contrato: config.andreani_contrato_dom!,
      cliente: config.andreani_codigo_cliente!,
      codigoPostal: String(codigo_postal),
      'bultos[0][kilos]': String(pesoKg.toFixed(2)),
      'bultos[0][largoCm]': '20',
      'bultos[0][altoCm]': '15',
      'bultos[0][anchoCm]': '10',
      'bultos[0][volumenCm]': '3000',
      'bultos[0][valorDeclaradoSinImpuestos]': '1000',
      'bultos[0][valorDeclaradoConImpuestos]': '1210',
    })

    // 3. Cotizar
    const cotizarRes = await fetch(`${BASE_URL}/v1/tarifas?${params.toString()}`, {
      headers: { 'x-authorization-token': token },
    })

    if (!cotizarRes.ok) {
      console.error('Andreani cotizar failed:', cotizarRes.status, await cotizarRes.text())
      return NextResponse.json({
        costo: config.andreani_tarifa_fallback ?? 0,
        modo: 'fallback',
        error: 'Error al cotizar en Andreani',
      })
    }

    const cotizacion = await cotizarRes.json()

    // La respuesta trae tarifas — tomamos la primera (suele ser la estándar)
    // Estructura típica: { tarifas: [{ tarifa: number, ... }] } o directo { tarifa: number }
    let costo: number = config.andreani_tarifa_fallback ?? 0

    if (Array.isArray(cotizacion)) {
      costo = cotizacion[0]?.tarifa ?? cotizacion[0]?.tarifaConIva ?? costo
    } else if (cotizacion?.tarifas && Array.isArray(cotizacion.tarifas)) {
      costo = cotizacion.tarifas[0]?.tarifa ?? cotizacion.tarifas[0]?.tarifaConIva ?? costo
    } else if (typeof cotizacion?.tarifa === 'number') {
      costo = cotizacion.tarifa
    } else if (typeof cotizacion?.tarifaConIva === 'number') {
      costo = cotizacion.tarifaConIva
    }

    return NextResponse.json({ costo: Math.round(costo), modo: 'api' })

  } catch (err: any) {
    console.error('Error cotizar Andreani:', err)
    return NextResponse.json({ error: err.message ?? 'Error interno' }, { status: 500 })
  }
}
