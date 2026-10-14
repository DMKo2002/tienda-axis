// Lógica centralizada en tienda-core (ver src/lib/seo.ts) — así se arregla
// una sola vez y se propaga a los 6 templates con update-core.sh.
export { default } from '@creart/tienda-core/sitemap'

// Se genera en cada request, NO durante el build (incidente 2026-10-14: con la
// base saturada la consulta del sitemap colgaba el build y el deploy fallaba).
// Además el sitemap depende del dominio/tenant de cada request, así que
// hornearlo en el build nunca fue correcto. El resultado se cachea 5 min
// dentro de tienda-core (buildSitemap). Tiene que ser un literal en este
// archivo: Next/Turbopack no lee `dynamic` re-exportado de otro paquete.
export const dynamic = 'force-dynamic'
