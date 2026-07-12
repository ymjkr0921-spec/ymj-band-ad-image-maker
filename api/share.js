import LZString from 'lz-string'
import { getRedis } from './_redis.js'

const { decompressFromEncodedURIComponent } = LZString

const DEFAULT_TITLE = '건설현장 인력 모집｜당일지급 조공·기공·반장 모집'
const DEFAULT_DESCRIPTION = '출퇴근 가능 · 안전벨트/연장 풀착용 필수 · 클릭 후 전화/문자 바로 문의'
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
  const title = String(ad?.title || '').trim() || '건설현장 인력 모집'
  return `${title}｜당일지급 조공·기공·반장 모집`
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
    ? `${origin}/api/ads/${id}/image`
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
    <meta name="description" content="${description}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${pageUrl}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="720" />
    <meta property="og:image:height" content="900" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    <link rel="canonical" href="${pageUrl}" />
    <link rel="stylesheet" href="/assets/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/app.js"></script>
  </body>
</html>`)
}
