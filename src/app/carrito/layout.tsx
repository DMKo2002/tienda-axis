import type { Metadata } from 'next'

// /carrito/page.tsx es 'use client' -- ver nota en contacto/layout.tsx.
// Pantalla transaccional (contenido siempre distinto por usuario) -- sin
// sentido indexarla.
export const metadata: Metadata = {
  title: 'Carrito',
  robots: { index: false, follow: false },
}

export default function CarritoLayout({ children }: { children: React.ReactNode }) {
  return children
}
