import Link from 'next/link'

interface Branch {
  name: string
  address: string
  phone?: string
}

interface FooterProps {
  storeName?: string
  logoUrl?: string
  whatsapp?: string
  email?: string
  instagramUrl?: string
  facebookUrl?: string
  tiktokUrl?: string
  branches?: Branch[]
}

function IconInstagram() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.16 8.16 0 0 0 4.78 1.52V7.01a4.85 4.85 0 0 1-1.01-.32z"/>
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 21l3.98-.927A9.945 9.945 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.5a8.46 8.46 0 0 1-4.337-1.195l-.31-.184-3.22.75.77-3.12-.202-.32A8.5 8.5 0 1 1 12 20.5z"/>
    </svg>
  )
}

export default function Footer({
  storeName = 'TIENDA',
  logoUrl,
  whatsapp = '',
  email = '',
  instagramUrl,
  facebookUrl,
  tiktokUrl,
  branches = [],
}: FooterProps) {
  const hasSocial = instagramUrl || facebookUrl || tiktokUrl || whatsapp
  const hasBranches = branches && branches.length > 0

  return (
    <footer className="bg-white border-t border-[var(--color-border)]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">

          {/* Marca + social */}
          <div className="md:col-span-1">
            {logoUrl ? (
              <a href="https://www.gounuri.com" target="_blank" rel="noopener noreferrer" className="inline-block mb-4">
                <img
                  src={logoUrl}
                  alt={storeName}
                  className="max-h-20 w-auto object-contain"
                />
              </a>
            ) : (
              <p className="font-display text-2xl font-light tracking-[0.2em] uppercase text-[var(--color-charcoal)] mb-4">
                {storeName}
              </p>
            )}
            <p className="text-xs leading-relaxed text-[var(--color-stone)] mb-5">Estilo que trasciende tendencia.</p>
            {hasSocial && (
              <div className="flex items-center gap-3">
                {instagramUrl && (
                  <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors" aria-label="Instagram">
                    <IconInstagram />
                  </a>
                )}
                {facebookUrl && (
                  <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors" aria-label="Facebook">
                    <IconFacebook />
                  </a>
                )}
                {tiktokUrl && (
                  <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors" aria-label="TikTok">
                    <IconTikTok />
                  </a>
                )}
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors" aria-label="WhatsApp">
                    <IconWhatsApp />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Links tienda */}
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] mb-5">Tienda</p>
            <ul className="space-y-3">
              <li><Link href="/tienda" className="text-xs text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">Todos los productos</Link></li>
            </ul>
          </div>

          {/* Sucursales o info */}
          <div>
            {hasBranches ? (
              <>
                <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] mb-5">Sucursales</p>
                <ul className="space-y-4">
                  {branches.map((b, i) => (
                    <li key={i} className="text-xs text-[var(--color-stone)] leading-relaxed">
                      {b.name && <p className="text-[var(--color-charcoal)] font-medium mb-0.5">{b.name}</p>}
                      {b.address && <p>{b.address}</p>}
                      {b.phone && <p>{b.phone}</p>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] mb-5">Contacto</p>
                <ul className="space-y-3 text-xs text-[var(--color-stone)]">
                  {whatsapp && (
                    <li>
                      <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} className="hover:text-[var(--color-charcoal)] transition-colors">
                        WhatsApp: {whatsapp}
                      </a>
                    </li>
                  )}
                  {email && (
                    <li><a href={`mailto:${email}`} className="hover:text-[var(--color-charcoal)] transition-colors">{email}</a></li>
                  )}
                </ul>
              </>
            )}
          </div>

          {/* Contacto */}
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] mb-5">Ayuda</p>
            <ul className="space-y-3 text-xs text-[var(--color-stone)]">
              <li><Link href="/contacto" className="hover:text-[var(--color-charcoal)] transition-colors">Contacto</Link></li>
              {email && (
                <li><a href={`mailto:${email}`} className="hover:text-[var(--color-charcoal)] transition-colors">{email}</a></li>
              )}
            </ul>
          </div>

        </div>

        <div className="mt-16 pt-8 border-t border-[var(--color-border)] flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
          <p className="text-[10px] tracking-widest uppercase text-[var(--color-stone)]">
            &copy; {new Date().getFullYear()} {storeName}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
            <a href="/politica-privacidad" className="text-[10px] tracking-widest uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">Privacidad</a>
            <a href="/politica-cookies" className="text-[10px] tracking-widest uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">Cookies</a>
            <a href="/terminos-condiciones" className="text-[10px] tracking-widest uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">Términos</a>
            <a href="https://www.gounuri.com" target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-widest uppercase text-[var(--color-stone)] hover:text-[var(--color-charcoal)] transition-colors">Desarrollado por gounuri</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
