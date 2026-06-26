import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware de resolución de tenant.
 *
 * Por cada request:
 *  1. Lee el hostname (ej: connors.creart.com o connors.com)
 *  2. Busca el tenant en Supabase por slug (subdominio) o domain (dominio custom)
 *  3. Inyecta x-tenant-id en los headers del request para que lo lean
 *     los Server Components y Route Handlers downstream
 *
 * En desarrollo local (localhost) cae al env var NEXT_PUBLIC_TENANT_ID.
 */
export async function middleware(req: NextRequest) {
  const requestHeaders = new Headers(req.headers)

  const hostname = req.headers.get('host') ?? ''
  // Quitar www. y puerto
  const host = hostname.replace(/^www\./, '').split(':')[0]

  const isLocal =
    host === 'localhost' ||
    host.startsWith('127.') ||
    host.startsWith('192.168.')

  let tenantId: string | null = null

  if (!isLocal) {
    // Cliente sin cookies — solo necesitamos leer la tabla tenants (es pública)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    if (host.endsWith('.creart.com')) {
      // Subdominio propio: connors.creart.com → slug = "connors"
      const slug = host.replace(/\.creart\.com$/, '')
      if (slug) {
        const { data } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', slug)
          .eq('status', 'active')
          .maybeSingle()
        tenantId = data?.id ?? null
      }
    } else {
      // Dominio custom: connors.com
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('domain', host)
        .eq('status', 'active')
        .maybeSingle()
      tenantId = data?.id ?? null
    }
  }

  // Fallback: env var (local dev o dominio aún no configurado)
  if (!tenantId) {
    tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? null
  }

  if (tenantId) {
    requestHeaders.set('x-tenant-id', tenantId)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  // Corre en todas las rutas excepto assets estáticos e imágenes de Next
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
