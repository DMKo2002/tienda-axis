import type { Metadata } from 'next'

// /checkout/page.tsx es 'use client' -- ver nota en contacto/layout.tsx.
// Pantalla transaccional -- sin sentido indexarla.
export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children
}
