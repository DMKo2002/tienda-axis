'use client'

import CheckoutPage from '@creart/tienda-core/CheckoutPage'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default function Page() {
  return <CheckoutPage Navbar={Navbar} Footer={Footer} />
}
