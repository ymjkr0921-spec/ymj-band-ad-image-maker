import LZString from 'lz-string'
import { getRedis } from './_redis.js'

const { decompressFromEncodedURIComponent } = LZString

const DEFAULT_TITLE = '\uAC74\uC124\uD604\uC7A5 \uC778\uB825 \uBAA8\uC9D1\uFF5C\uB2F9\uC77C\uC9C0\uAE09 \uC870\uACF5\u00B7\uAE30\uACF5\u00B7\uBC18\uC7A5 \uBAA8\uC9D1'
const DEFAULT_DESCRIPTION = '\uCD9C\uD1F4\uADFC \uAC00\uB2A5 \u00B7 \uC548\uC804\uBCA8\uD2B8/\uC5F0\uC7A5 \uD480\uCC29\uC6A9 \uD544\uC218 \u00B7 \uD074\uB9AD \uD6C4 \uC804\uD654\u00B7\uBB38\uC790 \uBC14\uB85C \uBB38\uC758'
const PRODUCTION_ORIGIN = 'https://ymj-people.vercel.app'

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createCardTitle(ad) {
  const title = String(ad?.title || '').trim() || '\uAC74\uC124\uD604\uC7A5 \uC778\uB825 \uBAA8\uC9D1'
  return `${title}\uFF5C\uB2F9\uC77C\uC9C0\uAE09 \uC870\uACF5\u00B7\uAE30\uACF5\u00B7\uBC18\uC7A5 \uBAA8\uC9D1`
}

function createCardDescription() {
  return DEFAULT_DESCRIPTION
}

async function loadAd(req) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  if (/^[23456789A-HJ-NP-Za-km-z]{8}$/.test(id)) {
    const redis = getRedis()
    return { ad: await redis.get(`ad:${id}`), id }
  }

  const payload = typeof req.query.data === 'string' ? req.query.data : ''
  if (!payload) return { ad: null, id: '' }

  const decompressed = decompressFromEncodedURIComponent(payload)
  return { ad: decompressed ? JSON.parse(decompressed) : null, id: '' }
}

export default async function handler(req, res) {
  let ad = null
  let id = ''

  try {
    const loaded = await loadAd(req)
    ad = loaded.ad
    id = loaded.id
  } catch (error) {
    console.error(error)
  }

  const origin = PRODUCTION_ORIGIN
  const title = escapeHtml(ad?.cardTitle || createCardTitle(ad))
  const description = escapeHtml(ad?.cardDescription || createCardDescription())
  const legacyData = typeof req.query.data === 'string' ? req.query.data : ''
  const pageUrl = escapeHtml(id
    ? `${origin}/ad/${id}`
    : `${origin}/ad${legacyData ? `?data=${encodeURIComponent(legacyData)}` : ''}`)
  const imageUrl = escapeHtml(id
    ? `${origin}/og/${id}.jpg`
    : `${origin}/og-default.svg`)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', id ? 'public, max-age=60, s-maxage=300' : 'public, max-age=0, must-revalidate')
  return res.status(200).send(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0b1f3a" />
    <title>${title}</title>
    <meta name="title" content="${title}" />
    <meta name="description" content="${description}" />
    <meta name="image" content="${imageUrl}" />
    <meta itemprop="name" content="${title}" />
    <meta itemprop="description" content="${description}" />
    <meta itemprop="image" content="${imageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="YMJ 건설현장 구인 광고" />
    <meta property="og:locale" content="ko_KR" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:type" content="${id ? 'image/jpeg' : 'image/svg+xml'}" />
    <meta property="og:image:width" content="720" />
    <meta property="og:image:height" content="900" />
    <meta property="og:image:alt" content="${title}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <link rel="canonical" href="${pageUrl}" />
    <link rel="image_src" href="${imageUrl}" />
    <link rel="stylesheet" href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`)
}
