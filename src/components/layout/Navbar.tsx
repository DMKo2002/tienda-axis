'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Menu, X } from 'lucide-react'
import { useCart } from '@/components/shop/CartContext'
import { IconInstagram, IconFacebook, IconTikTok, IconCartMono, IconUserMono } from '@/components/icons/SocialIcons'

interface NavbarProps {
  storeName?: string
  logoUrl?: string | null
  instagramUrl?: string
  facebookUrl?: string
  tiktokUrl?: string
}

interface Leaf { id: string; name: string; slug: string }
interface Sub extends Leaf { subcategories: Leaf[] }
interface Category extends Leaf { subcategories: Sub[] }

export default function Navbar({ storeName = 'TIENDA', logoUrl, instagramUrl, facebookUrl, tiktokUrl }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [megaOpen, setMegaOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { count } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    fetch('/api/nav-categories').then(r => r.json()).then(setCategories).catch(() => {})
  }, [])

  function open() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setMegaOpen(true)
  }

  function close() {
    closeTimer.current = setTimeout(() => setMegaOpen(false), 120)
  }

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }

  const headerHeight = scrolled ? 'top-[52px]' : 'top-[72px]'

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[var(--color-warm-white)] border-b border-[var(--color-border)] py-3' : 'bg-transparent py-6'
      }`}>
        <div className="relative max-w-7xl mx-auto px-6 lg:max-w-none lg:mx-0 lg:px-0 flex items-center justify-between">

          {/* Izquierda — marca. En este diseño el nombre de texto (header) y el isotipo (LOGO del hero) */}
          {/* son dos elementos independientes — el header siempre muestra el nombre, no lo reemplaza el logo */}
          {/* lg:w-[35.36%] + justify-center: centra el nombre dentro del mismo ancho que ocupa la columna */}
          {/* izquierda del hero (611/1728 en el Figma de Axis), para que quede alineado con el logo de ahí debajo */}
          <div className="flex items-center lg:w-[35.36%] lg:justify-center">
            <Link href="/">
              <span className="font-display text-xl font-semibold text-[var(--color-charcoal)]">
                {storeName}
              </span>
            </Link>
          </div>

          {/* Centro — nav, centrado respecto a todo el ancho de la pantalla (no de una columna) */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center gap-8 font-ui">
            <Link href="/" className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              Home
            </Link>
            <Link
              href="/tienda"
              onMouseEnter={open}
              onMouseLeave={close}
              className={`text-xs tracking-[0.15em] uppercase transition-colors ${megaOpen ? 'text-[var(--color-stone)]' : 'text-[var(--color-charcoal)] hover:text-[var(--color-stone)]'}`}
            >
              Tienda
            </Link>
            <Link href="/contacto" className="text-xs tracking-[0.15em] uppercase text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              Contacto
            </Link>
          </nav>

          {/* Derecha — íconos */}
          <div className="hidden lg:flex items-center gap-5 lg:pr-12">
            {(instagramUrl || facebookUrl || tiktokUrl) && (
              <>
                <div className="flex items-center gap-3 text-[var(--color-charcoal)]">
                  {instagramUrl && (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-[var(--color-stone)] transition-colors">
                      <IconInstagram />
                    </a>
                  )}
                  {facebookUrl && (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-[var(--color-stone)] transition-colors">
                      <IconFacebook />
                    </a>
                  )}
                  {tiktokUrl && (
                    <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-[var(--color-stone)] transition-colors">
                      <IconTikTok />
                    </a>
                  )}
                </div>
                <span className="w-px h-4 bg-[var(--color-charcoal)]/25" aria-hidden />
              </>
            )}

            <Link href="/cuenta" className="text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors" title="Mi cuenta">
              <IconUserMono />
            </Link>
            <Link href="/carrito" className="relative text-[var(--color-charcoal)] hover:text-[var(--color-stone)] transition-colors">
              <IconCartMono />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-charcoal)] text-white text-[9px] rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-4 ml-auto">
            <Link href="/carrito" className="relative">
              <IconCartMono />
              {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[var(--color-charcoal)] text-white text-[9px] rounded-full flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
            <button onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={22} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MEGA MENU ── full width panel */}
      {categories.length > 0 && (
        <div
          className={`fixed left-0 right-0 z-40 hidden md:block transition-all duration-300 ease-in-out ${headerHeight} ${
            megaOpen
              ? 'opacity-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 -translate-y-2 pointer-events-none'
          }`}
          style={{ backgroundColor: '#e5e7eb' }}
          onMouseEnter={cancelClose}
          onMouseLeave={close}
        >
          <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="flex gap-12">
              {/* "Ver todo" como primer columna */}
              <div className="flex flex-col gap-2 min-w-[120px]">
                <Link
                  href="/tienda"
                  onClick={() => setMegaOpen(false)}
                  className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--color-charcoal)] mb-3 hover:text-[var(--color-stone)] transition-colors"
                >
                  Ver todo
                </Link>
              </div>

              {/* Una columna por categoría madre */}
              {categories.map(cat => (
                <div key={cat.id} className="flex flex-col min-w-[140px]">
                  <Link
                    href={`/tienda?cat=${cat.slug}`}
                    onClick={() => setMegaOpen(false)}
                    className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[var(--color-charcoal)] mb-3 hover:text-[var(--color-stone)] transition-colors"
                  >
                    {cat.name}
                  </Link>
                  {cat.subcategories.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {cat.subcategories.map(sub => (
                        <li key={sub.id}>
                          <Link
                            href={`/tienda?cat=${sub.slug}`}
                            onClick={() => setMegaOpen(false)}
                            className="text-xs tracking-[0.08em] text-zinc-600 hover:text-[var(--color-charcoal)] transition-colors"
                          >
                            {sub.name}
                          </Link>
                          {sub.subcategories.length > 0 && (
                            <ul className="mt-1 ml-2 flex flex-col gap-1">
                              {sub.subcategories.map(leaf => (
                                <li key={leaf.id}>
                                  <Link
                                    href={`/tienda?cat=${leaf.slug}`}
                                    onClick={() => setMegaOpen(false)}
                                    className="text-[11px] tracking-[0.06em] text-zinc-400 hover:text-zinc-700 transition-colors"
                                  >
                                    {leaf.name}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile fullscreen menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-[var(--color-warm-white)] flex flex-col items-center justify-center gap-8 md:hidden overflow-y-auto py-20">
          <Link href="/" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Home
          </Link>
          <Link href="/tienda" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Tienda
          </Link>
          {categories.length > 0 && (
            <div className="flex flex-col items-center gap-3 -mt-4">
              {categories.map(cat => (
                <Link key={cat.id} href={`/tienda?cat=${cat.slug}`} onClick={() => setMenuOpen(false)}
                  className="text-sm tracking-[0.15em] uppercase text-[var(--color-stone)]">
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
          <Link href="/contacto" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Contacto
          </Link>
          <Link href="/cuenta" onClick={() => setMenuOpen(false)}
            className="font-display text-3xl font-light tracking-widest uppercase text-[var(--color-charcoal)]">
            Mi cuenta
          </Link>
        </div>
      )}
    </>
  )
}
