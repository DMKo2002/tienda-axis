/** @type {import('next').NextConfig} */
const { withBotId } = require('botid/next/config')

const securityHeaders = [
  // X-Frame-Options omitido intencionalmente: estos storefronts se embeben
  // en el onboarding del Panel Admin como previews. El Panel Admin sí tiene SAMEORIGIN.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
]

const nextConfig = {
  transpilePackages: ['@creart/tienda-core'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  // El sitio viejo (Hostinger) redirigía "/" a "/eshop" con un 301, y los
  // navegadores cachean ese redirect por mucho más tiempo que el DNS. Cualquiera
  // que haya visitado el sitio viejo puede seguir cayendo en /eshop desde su
  // propio navegador — acá lo mandamos de vuelta a la home en vez de dar 404.
  async redirects() {
    return [
      { source: '/eshop', destination: '/', permanent: true },
      { source: '/eshop/:path*', destination: '/', permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: '*' },
    ],
  },
}

module.exports = withBotId(nextConfig)
