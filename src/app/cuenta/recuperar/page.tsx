'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function RecuperarPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al enviar el email. Intentá de nuevo.')
        return
      }
      setEnviado(true)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-[var(--color-charcoal)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h1 className="font-display text-3xl font-light text-[var(--color-charcoal)] mb-3">
            Revisá tu email
          </h1>
          <p className="text-sm text-[var(--color-stone)] font-light leading-relaxed mb-6">
            Si existe una cuenta con <strong>{email}</strong>, te enviamos un link para restablecer tu contraseña.
          </p>
          <p className="text-xs text-[var(--color-stone)] mb-8">
            ¿No lo ves? Revisá la carpeta de spam o esperá unos minutos.
          </p>
          <Link
            href="/cuenta/login"
            className="text-sm text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-10">
          <Link
            href="/cuenta/login"
            className="text-xs tracking-[0.2em] uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors"
          >
            ← Volver al inicio de sesión
          </Link>
          <h1 className="font-display text-4xl font-light text-[var(--color-charcoal)] mt-4">
            Recuperar cuenta
          </h1>
          <p className="text-sm text-[var(--color-stone)] font-light mt-3 leading-relaxed">
            Ingresá tu email y te enviamos un link para crear una nueva contraseña.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] tracking-[0.15em] uppercase text-[var(--color-stone)] mb-1.5">
              Email
            </label>
            <input
              type="email"
              className="w-full px-3 py-2.5 border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-charcoal)] transition-colors"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="tu@email.com"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[var(--color-charcoal)] text-white text-[11px] tracking-[0.2em] uppercase hover:bg-[var(--color-stone)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperación'}
          </button>

          <p className="text-center text-sm text-[var(--color-stone)] font-light">
            ¿No tenés cuenta?{' '}
            <Link
              href="/cuenta/registro"
              className="text-[var(--color-charcoal)] underline hover:text-[var(--color-stone)] transition-colors"
            >
              Registrarse
            </Link>
          </p>
        </form>

      </div>
    </div>
  )
}
