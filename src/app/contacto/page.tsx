'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient, TENANT_ID } from '@/lib/supabase'

function IconInstagram({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

function IconFacebook({ size = 22 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}

interface Branch { name: string; address: string; phone?: string }

export default function ContactPage() {
  const supabase = createClient()

  const [storeName, setStoreName] = useState('TIENDA')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [newsletter, setNewsletter] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: tenant }, { data: config }] = await Promise.all([
        supabase.from('tenants').select('name').eq('id', TENANT_ID()).single(),
        supabase.from('store_config')
          .select('logo_url, whatsapp_number, notification_email, instagram_url, facebook_url, branches')
          .eq('tenant_id', TENANT_ID()).single(),
      ])
      setStoreName(tenant?.name ?? 'TIENDA')
      setLogoUrl(config?.logo_url ?? null)
      setWhatsapp(config?.whatsapp_number ?? '')
      setEmail(config?.notification_email ?? '')
      setInstagram((config as any)?.instagram_url ?? '')
      setFacebook((config as any)?.facebook_url ?? '')
      setBranches((config as any)?.branches ?? [])
    }
    load()
  }, [])

  const whatsappUrl = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : '#'
  const mailUrl = email ? `mailto:${email}` : '#'

  return (
    <>
      <Navbar storeName={storeName} logoUrl={logoUrl} />

      <main className="pt-28 pb-0 min-h-screen bg-white">

        {/* ── Título ── */}
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold tracking-[0.25em] uppercase text-[var(--color-charcoal)]">
            Contacto
          </h1>
        </div>

        {/* ── 4 Cards ── */}
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-zinc-200">

            {/* Llamanos */}
            <div className="flex flex-col items-center justify-center text-center p-10 border-r border-zinc-200 gap-4">
              <p className="text-sm font-bold text-[var(--color-charcoal)] tracking-wide">Llamanos</p>
              <div className="w-8 border-t border-zinc-300" />
              {whatsapp ? (
                <p className="text-xs text-[var(--color-charcoal)] tracking-wide">
                  TEL: {whatsapp}
                </p>
              ) : (
                <p className="text-xs text-zinc-400">Sin número configurado</p>
              )}
            </div>

            {/* Escribinos */}
            <div className="flex flex-col items-center justify-center text-center p-10 border-r border-zinc-200 gap-4">
              <p className="text-sm font-bold text-[var(--color-charcoal)] tracking-wide">Escribinos</p>
              <div className="w-8 border-t border-zinc-300" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Nuestros especialistas contestarán tus inquietudes lo más pronto posible.
              </p>
              {email && (
                <a
                  href={mailUrl}
                  className="text-[11px] tracking-[0.2em] uppercase font-medium text-[var(--color-charcoal)] border-b border-[var(--color-charcoal)] pb-px hover:text-zinc-500 hover:border-zinc-500 transition-colors"
                >
                  Enviar un mail
                </a>
              )}
            </div>

            {/* Chateá con nosotros */}
            <div className="flex flex-col items-center justify-center text-center p-10 border-r border-zinc-200 gap-4">
              <p className="text-sm font-bold text-[var(--color-charcoal)] tracking-wide">Chateá con nosotros</p>
              <div className="w-8 border-t border-zinc-300" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Ofrecemos asesoramiento personalizado online.
              </p>
              {whatsapp && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] tracking-[0.2em] uppercase font-medium text-[var(--color-charcoal)] border-b border-[var(--color-charcoal)] pb-px hover:text-zinc-500 hover:border-zinc-500 transition-colors"
                >
                  Chateá con nosotros
                </a>
              )}
            </div>

            {/* Interactuá */}
            <div className="flex flex-col items-center justify-center text-center p-10 gap-4">
              <p className="text-sm font-bold text-[var(--color-charcoal)] tracking-wide">Interactuá</p>
              <div className="w-8 border-t border-zinc-300" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Estamos a tu servicio, te contestaremos a la brevedad.
              </p>
              <div className="flex items-center gap-4">
                {instagram && (
                  <a href={instagram} target="_blank" rel="noopener noreferrer"
                    className="text-[var(--color-charcoal)] hover:text-zinc-500 transition-colors">
                    <IconInstagram size={22} />
                  </a>
                )}
                {facebook && (
                  <a href={facebook} target="_blank" rel="noopener noreferrer"
                    className="text-[var(--color-charcoal)] hover:text-zinc-500 transition-colors">
                    <IconFacebook size={22} />
                  </a>
                )}
                {!instagram && !facebook && (
                  <p className="text-xs text-zinc-400">Sin redes configuradas</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ── Texto info ── */}
        <div className="text-center py-14 px-6">
          <p className="text-sm font-semibold text-[var(--color-charcoal)] mb-2">
            Para más información comunicarse con atención al cliente.
          </p>
          <p className="text-sm text-zinc-500">
            Horario de atención al cliente: Lunes a Viernes de 10 a 18 hs
          </p>
        </div>

        {/* ── Newsletter ── */}
        <div className="border-t border-zinc-200 py-14 px-6">
          <div className="max-w-md mx-auto text-center">
            <p className="text-sm font-medium text-[var(--color-charcoal)] mb-6 tracking-wide">
              Suscribite al newsletter
            </p>
            <div className="flex">
              <input
                type="email"
                value={newsletter}
                onChange={e => setNewsletter(e.target.value)}
                placeholder="Ingresá tu email"
                className="flex-1 border border-zinc-300 border-r-0 px-4 py-3 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500"
              />
              <button
                onClick={() => { if (newsletter) { setSent(true); setNewsletter('') } }}
                className="bg-[var(--color-charcoal)] text-white text-xs font-bold tracking-[0.18em] uppercase px-7 py-3 hover:bg-zinc-700 transition-colors whitespace-nowrap"
              >
                {sent ? '✓ Enviado' : 'Suscribirme'}
              </button>
            </div>
          </div>
        </div>

      </main>

      <Footer
        storeName={storeName}
        logoUrl={logoUrl ?? undefined}
        whatsapp={whatsapp}
        email={email}
        instagramUrl={instagram || undefined}
        facebookUrl={facebook || undefined}
        branches={branches}
      />
    </>
  )
}
