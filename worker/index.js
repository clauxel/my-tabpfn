const CANONICAL_ORIGIN = 'https://tabpfn.site'
const CANONICAL_HOST = 'tabpfn.site'
const LEGACY_HOSTS = new Set(['www.tabpfn.site'])
const ANNUAL_DISCOUNT_MULTIPLIER = 0.5

const polarProductCache = new Map()

const planCatalog = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyAmountCents: 3900,
    currency: 'USD',
    summary: 'solo evaluation and one hosted benchmark lane',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyAmountCents: 9900,
    currency: 'USD',
    summary: 'the default route for serious TabPFN pilots',
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    monthlyAmountCents: 29900,
    currency: 'USD',
    summary: 'larger tables, rollout planning, and faster production help',
  },
}

const indexablePaths = [
  '/',
  '/tabpfn-v2',
  '/tabpfn-paper',
  '/tabpfn-huggingface',
  '/tabpfn-ts',
  '/tabpfn-nature',
  '/tabpfn-r',
  '/tabpfn-architecture',
  '/tabpfn-client',
  '/privacy',
  '/terms',
]

const staticAssetPaths = new Set([...indexablePaths, '/checkout/done'])

function securityHeaders() {
  return new Headers({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  })
}

function jsonResponse(data, status = 200) {
  const headers = securityHeaders()
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { status, headers })
}

function maybeRedirectToCanonical(requestUrl) {
  if (LEGACY_HOSTS.has(requestUrl.hostname)) {
    const redirectUrl = new URL(requestUrl)
    redirectUrl.protocol = 'https:'
    redirectUrl.hostname = CANONICAL_HOST
    return Response.redirect(redirectUrl.toString(), 308)
  }
  return null
}

function resolvePublicAppOrigin(requestUrl) {
  if (requestUrl.hostname === CANONICAL_HOST || LEGACY_HOSTS.has(requestUrl.hostname)) {
    return `https://${requestUrl.hostname}`
  }

  if (requestUrl.hostname.endsWith('.pages.dev') || requestUrl.hostname.endsWith('.workers.dev')) {
    return requestUrl.origin
  }

  return CANONICAL_ORIGIN
}

function resolvePolarBase(env) {
  const raw = String(env?.POLAR_API_BASE ?? '').trim()
  return raw ? raw.replace(/\/+$/, '') : 'https://api.polar.sh'
}

async function getSecretValue(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value.get === 'function') {
    const resolved = await value.get()
    return typeof resolved === 'string' ? resolved.trim() : ''
  }
  return ''
}

async function firstSecretEnv(env, ...keys) {
  for (const key of keys) {
    const value = await getSecretValue(env?.[key])
    if (value) return value
  }
  return ''
}

function normalizeEnvKey(value) {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function formatMoney(amountCents, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
  }).format(amountCents / 100)
}

function resolveConfiguredProductId(env, planId, billing) {
  const cycle = billing === 'monthly' ? 'MONTHLY' : 'YEARLY'
  const tier = planId === 'scale' ? 'SCALE' : planId === 'starter' ? 'STARTER' : 'PRO'
  const normalizedSelection = normalizeEnvKey(`${planId}_${billing}`)
  const keys = [
    `POLAR_PRODUCT_${tier}_${cycle}`,
    `POLAR_PRODUCT_ID_TABPFN_${normalizedSelection}`,
    `POLAR_PRODUCT_ID_${normalizedSelection}`,
    `POLAR_PRODUCT_ID_${tier}`,
    'POLAR_PRODUCT_ID',
  ]

  for (const key of keys) {
    const value = env?.[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

async function requestPolarJson(apiKey, url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify(body),
  })

  const rawText = await response.text()
  let payload = null
  if (rawText) {
    try {
      payload = JSON.parse(rawText)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === 'object'
        ? payload.message || payload.error || 'Polar request failed.'
        : 'Polar request failed.',
    )
  }

  return payload || {}
}

async function getOrCreatePolarProduct(env, apiKey, plan, billing, successUrl) {
  const configuredProductId = resolveConfiguredProductId(env, plan.id, billing)
  if (configuredProductId) return configuredProductId

  const cacheKey = `${plan.id}:${billing}`
  if (polarProductCache.has(cacheKey)) return polarProductCache.get(cacheKey)

  const monthlyAmountCents =
    billing === 'annual' ? Math.round(plan.monthlyAmountCents * ANNUAL_DISCOUNT_MULTIPLIER) : plan.monthlyAmountCents
  const totalAmountCents = billing === 'annual' ? monthlyAmountCents * 12 : monthlyAmountCents
  const billingLabel = billing === 'annual' ? 'annual' : 'monthly'

  const product = await requestPolarJson(apiKey, `${resolvePolarBase(env)}/v1/products`, {
    name: `TabPFN Studio ${plan.name} (${billingLabel})`,
    description: `${formatMoney(monthlyAmountCents, plan.currency)}/mo - ${plan.summary}`,
    price: totalAmountCents,
    currency: plan.currency,
    billing_type: 'onetime',
    tax_mode: 'inclusive',
    tax_category: 'saas',
    default_success_url: successUrl,
  })

  const productId = product.id || product.product_id
  if (!productId) throw new Error('Polar did not return a product id.')

  polarProductCache.set(cacheKey, productId)
  return productId
}

function extractCheckoutUrl(payload) {
  const candidates = [payload?.checkout_url, payload?.checkoutUrl, payload?.url]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return ''
}

async function handleCheckout(request, env, requestUrl) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405)
  }

  const apiKey = await firstSecretEnv(env, 'API_PROD_KEY', 'POLAR_API_KEY', 'POLAR_KEY')
  if (!apiKey) {
    return jsonResponse({ ok: false, error: 'Payment is not configured yet.' }, 503)
  }

  let body
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON body.' }, 400)
  }

  const planId = typeof body?.planId === 'string' ? body.planId : 'pro'
  const billing = body?.billing === 'monthly' ? 'monthly' : 'annual'
  const plan = planCatalog[planId] || planCatalog.pro
  const successUrl = `${resolvePublicAppOrigin(requestUrl)}/checkout/done`

  try {
    const productId = await getOrCreatePolarProduct(env, apiKey, plan, billing, successUrl)
    const checkout = await requestPolarJson(apiKey, `${resolvePolarBase(env)}/v1/checkouts`, {
      product_id: productId,
      units: 1,
      success_url: successUrl,
      request_id: `tabpfn_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      metadata: {
        site: 'tabpfn.site',
        planId: plan.id,
        billing,
      },
    })
    const checkoutUrl = extractCheckoutUrl(checkout)
    if (!checkoutUrl) throw new Error('Polar did not return a checkout URL.')
    return jsonResponse({ ok: true,
      paymentProvider: 'hosted', checkoutUrl })
  } catch {
    return jsonResponse({ ok: false, error: 'Secure checkout could not be created yet.' }, 502)
  }
}

function handleRuntime(requestUrl) {
  return jsonResponse({
    ok: true,
    publicAppOrigin: resolvePublicAppOrigin(requestUrl),
    deployment: 'cloudflare-workers-assets',
    ts: Date.now(),
  })
}

function buildSitemapXml() {
  const today = new Date().toISOString().slice(0, 10)
  const urls = indexablePaths
    .map((path) => {
      const priority = path === '/' ? '1.0' : path === '/privacy' || path === '/terms' ? '0.4' : '0.8'
      const changefreq = path === '/' ? 'weekly' : 'monthly'
      return `  <url>
    <loc>${CANONICAL_ORIGIN}${path === '/' ? '/' : path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

function handleSitemap() {
  const headers = securityHeaders()
  headers.set('Content-Type', 'application/xml; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=3600')
  return new Response(buildSitemapXml(), { status: 200, headers })
}

function handleRobots() {
  const headers = securityHeaders()
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  headers.set('Cache-Control', 'public, max-age=3600')
  const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /checkout/done
Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml
`
  return new Response(body, { status: 200, headers })
}

function noIndexNotFoundResponse(request) {
  const headers = securityHeaders(request)
  headers.set('Content-Type', 'text/html; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>Page not found</title></head><body><main><h1>Page not found</h1><p>This URL is not a public page for this product.</p></main></body></html>', { status: 404, headers })
}

async function fetchAsset(request, env) {
  if (env?.ASSETS?.fetch) {
    const requestUrl = new URL(request.url)

  if (requestUrl.pathname === '/api/analytics/events') {
    if (request.method !== 'POST') {
      return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405)
    }

    return jsonResponse({ ok: true, stored: false, siteKey: 'tabpfn' })
  }
    const normalizedPath = requestUrl.pathname.replace(/\/+$/, '') || '/'

    if (staticAssetPaths.has(normalizedPath)) {
      const assetUrl = new URL(request.url)
      assetUrl.pathname = normalizedPath === '/' ? '/' : `${normalizedPath}/`
      const assetResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), request))
      if (assetResponse.status !== 404) return assetResponse
    }

    return env.ASSETS.fetch(request)
  }

  return new Response('Cloudflare ASSETS binding is unavailable.', {
    status: 500,
    headers: securityHeaders(),
  })
}

export async function handleRequest(request, env) {
  const requestUrl = new URL(request.url)

  if (requestUrl.pathname === '/api/polar-checkout') {
    return handleCheckout(request, env, requestUrl)
  }

  if (requestUrl.pathname === '/api/runtime') return handleRuntime(requestUrl)
  if (requestUrl.pathname === '/api/checkout') return handleCheckout(request, env, requestUrl)

  const redirect = maybeRedirectToCanonical(requestUrl)
  if (redirect) return redirect

  if (requestUrl.pathname === '/sitemap.xml') return handleSitemap()
  if (requestUrl.pathname === '/robots.txt') return handleRobots()

  return fetchAsset(request, env)
}

export default {
  async fetch(request, env) {
    try {
      return await handleRequest(request, env)
    } catch {
      return jsonResponse({ ok: false, error: 'Internal server error.' }, 500)
    }
  },
}
