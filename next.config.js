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
    // Next 16 solo permite los quality listados acá (default [75]); sin esto quality={90} se ignora.
    qualities: [75, 90],
    // Optimizacion server-side activa (necesaria para que las miniaturas de 56-120px
    // salgan nitidas). deviceSizes/imageSizes acotados a los anchos que realmente se
    // usan en la tienda (ver sizes= en ProductCard/ProductGallery/CarritoPage/CheckoutPage
    // de tienda-core) en vez de los 16 breakpoints por default de Next, para bajar la
    // cantidad de transformaciones unicas que factura Vercel.
    deviceSizes: [384, 640, 750, 1080, 1200, 1920],
    imageSizes: [56, 96, 120, 160, 256],
    // 30 dias de cache de la imagen optimizada (default 4 h): las fotos de producto
    // suben con nombre unico a Supabase Storage, asi que no hay riesgo de servir una vieja.
    minimumCacheTTL: 2592000,
    // Solo imagenes del Storage propio. Antes (mono/atelier/axis) habia un hostname '*'
    // que dejaba a cualquiera usar /_next/image de la tienda para optimizar imagenes
    // ajenas a cargo de nuestra cuenta de Vercel.
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
}

module.exports = withBotId(nextConfig)
