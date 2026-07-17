'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Turnstile from 'react-turnstile'
import { createClient, TENANT_ID } from '@/lib/supabase'

type Tipo = 'retail' | 'wholesale'

function RegistroForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isUpgrade = searchParams.get('upgrade') === '1'
  const [tipo, setTipo] = useState<Tipo>('retail')
  const [form, setForm] = useState({
    nombre: '', apellido: '', email: '', password: '', confirmar: '',
    empresa: '', cuit: '', direccion: '',
  })
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [exito, setExito] = useState(false)
  const [regVisibility, setRegVisibility] = useState<'both' | 'retail_only' | 'wholesale_only'>('both')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('store_config')
      .select('registration_visibility')
      .eq('tenant_id', TENANT_ID())
      .single()
      .then(({ data }) => {
        const rv = ((data as any)?.registration_visibility ?? 'both') as typeof regVisibility
        setRegVisibility(rv)
        if (rv === 'retail_only' && !isUpgrade) setTipo('retail')
        if (rv === 'wholesale_only' && !isUpgrade) setTipo('wholesale')
      })
  }, [])

  // Upgrade de minorista a mayorista: precarga los datos que ya tenemos de la
  // cuenta logueada y fuerza el formulario a mayorista.
  useEffect(() => {
    if (!isUpgrade) return
    setTipo('wholesale')
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: cust } = await supabase
        .from('customers')
        .select('full_name, last_name, email')
        .eq('auth_user_id', user.id)
        .eq('tenant_id', TENANT_ID())
        .maybeSingle()
      setForm(f => ({
        ...f,
        nombre: cust?.full_name ?? f.nombre,
        apellido: (cust as any)?.last_name ?? f.apellido,
        email: cust?.email ?? user.email ?? f.email,
      }))
    })
  }, [isUpgrade])

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!isUpgrade && form.password !== form.confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (!turnstileToken) {
      setError('Completá la verificación de seguridad')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          password: isUpgrade ? undefined : form.password,
          tipo,
          empresa: form.empresa || undefined,
          cuit: form.cuit || undefined,
          direccion: form.direccion || undefined,
          turnstileToken,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        setTurnstileToken(null)
        setTurnstileKey(k => k + 1)
        return
      }
      setExito(true)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (exito) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-[var(--color-charcoal)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-light text-[var(--color-charcoal)] mb-3">
            {isUpgrade ? '¡Cuenta actualizada!' : '¡Registro exitoso!'}
          </h1>
          <p className="text-sm text-[var(--color-stone)] font-light leading-relaxed mb-6">
            {isUpgrade
              ? <>Tu cuenta ahora es mayorista. Ya podés ver los precios y condiciones de mayorista.</>
              : <>Te enviamos un email de confirmación a <strong>{form.email}</strong>. Revisá tu bandeja de entrada para activar tu cuenta.</>
            }
          </p>
          {isUpgrade ? (
            <a href="/cuenta" className="text-sm text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors">
              Ir a mi cuenta
            </a>
          ) : (
            <Link href="/cuenta/login" className="text-sm text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors">
              Ir al inicio de sesión
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">

        {/* Logo / volver */}
        <div className="text-center mb-10">
          <Link href="/tienda" className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">
            ← Volver a la tienda
          </Link>
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mt-4">
            {isUpgrade ? 'Pasate a Mayorista' : 'Crear cuenta'}
          </h1>
        </div>

        {/* Selector de tipo — oculto si la tienda solo permite un tipo de cuenta, o si es un upgrade */}
        {regVisibility === 'both' && !isUpgrade && (
          <div className="flex mb-8 border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setTipo('retail')}
              className={`flex-1 py-3 text-sm tracking-[0.1em] uppercase transition-colors ${tipo === 'retail' ? 'bg-[var(--color-charcoal)] text-white' : 'text-[var(--color-stone)] hover:text-[var(--color-charcoal)]'}`}
            >
              Minorista
            </button>
            <button
              type="button"
              onClick={() => setTipo('wholesale')}
              className={`flex-1 py-3 text-sm tracking-[0.1em] uppercase transition-colors ${tipo === 'wholesale' ? 'bg-[var(--color-charcoal)] text-white' : 'text-[var(--color-stone)] hover:text-[var(--color-charcoal)]'}`}
            >
              Mayorista
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre y Apellido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Nombre *</label>
              <input
                className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                value={form.nombre} onChange={e => set('nombre', e.target.value)} required
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Apellido</label>
              <input
                className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                value={form.apellido} onChange={e => set('apellido', e.target.value)}
              />
            </div>
          </div>

          {/* Campos mayorista */}
          {tipo === 'wholesale' && (
            <>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Nombre de la Empresa *</label>
                <input
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  value={form.empresa} onChange={e => set('empresa', e.target.value)} required
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">CUIT *</label>
                <input
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  value={form.cuit} onChange={e => set('cuit', e.target.value)} required
                  placeholder="20-12345678-9"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Dirección</label>
                <input
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  value={form.direccion} onChange={e => set('direccion', e.target.value)}
                />
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Email *</label>
            <input
              type="email"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors disabled:bg-zinc-100 disabled:text-[var(--color-stone)]"
              value={form.email} onChange={e => set('email', e.target.value)} required
              readOnly={isUpgrade} disabled={isUpgrade}
            />
          </div>

          {/* El upgrade a mayorista usa la sesión ya iniciada para confirmar
              identidad — no hace falta (ni tiene sentido) pedir contraseña acá. */}
          {!isUpgrade && (
            <>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Contraseña *</label>
                <input
                  type="password"
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  value={form.password} onChange={e => set('password', e.target.value)}
                  required minLength={8} placeholder="Mínimo 8 caracteres"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">Confirmar Contraseña *</label>
                <input
                  type="password"
                  className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
                  value={form.confirmar} onChange={e => set('confirmar', e.target.value)}
                  required minLength={8}
                />
              </div>
            </>
          )}

          {/* Turnstile */}
          <div className="flex justify-center py-2">
            <Turnstile
              key={turnstileKey}
              sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '1x00000000000000000000AA'}
              onVerify={token => setTurnstileToken(token)}
              onExpire={() => setTurnstileToken(null)}
              theme="light"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full py-3.5 bg-[var(--color-charcoal)] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[var(--color-stone)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : isUpgrade ? 'Actualizar a mayorista' : 'Crear cuenta'}
          </button>

          {!isUpgrade && (
            <p className="text-center text-sm text-[var(--color-stone)] font-light">
              ¿Ya tenés cuenta?{' '}
              <Link href="/cuenta/login" className="text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors">
                Iniciar sesión
              </Link>
            </p>
          )}

        </form>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroForm />
    </Suspense>
  )
}
