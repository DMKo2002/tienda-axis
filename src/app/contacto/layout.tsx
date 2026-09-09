import type { Metadata } from 'next'

// /contacto/page.tsx es 'use client' y por eso no puede exportar su propia
// metadata (Next.js solo la permite en server components) -- vive aca, en
// el layout del segmento, que si puede ser server component aunque la
// pagina que envuelve sea client.
//
// Antes esta ruta no tenia titulo propio y heredaba el default de la home
// (mismo <title> en las dos paginas) -- eso, sumado a no declarar ningun
// canonical, es lo que Search Console reporto como "Duplicada: el usuario
// no ha indicado ninguna version canonica" (ver diagnostico 2026-09-08/09).
export const metadata: Metadata = {
  title: 'Contacto',
  alternates: { canonical: '/contacto' },
}

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
  return children
}
