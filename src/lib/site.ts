// Public base URL, read at runtime (not baked into the build):
// SERVER_URL if set, else the domain Railway generated for the service, else localhost.
export const SITE_URL = (
  process.env.SERVER_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '') ||
  'http://localhost:3000'
).replace(/\/+$/, '')
