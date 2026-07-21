import { getRedis, ID_PATTERN } from './_redis.js'

const PRODUCTION_ORIGIN = 'https://ymj-people.vercel.app'
const DEFAULT_TITLE = '건설현장 모집 광고 모음'
const DEFAULT_DESCRIPTION = '아래 현장별 모집공고를 확인 후 전화 또는 문자로 문의 가능합니다.'

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function loadBoard(id) {
  if (!ID_PATTERN.test(id)) return null
  const redis = getRedis()
  return redis.get(`board:${id}`)
}

export default async function handler(req, res) {
  const id = typeof req.query.id === 'string' ? req.query.id : ''
  let board = null

  try {
    board = await loadBoard(id)
  } catch (error) {
    console.error(error)
  }

  const title = escapeHtml(board?.title || DEFAULT_TITLE)
  const description = escapeHtml(board?.description || DEFAULT_DESCRIPTION)
  const firstAdId = Array.isArray(board?.adIds) && ID_PATTERN.test(String(board.adIds[0])) ? board.adIds[0] : ''
  const pageUrl = escapeHtml(`${PRODUCTION_ORIGIN}/board/${id}`)
  const imageUrl = escapeHtml(firstAdId ? `${PRODUCTION_ORIGIN}/og/${firstAdId}.jpg` : `${PRODUCTION_ORIGIN}/og-default.svg`)
  const imageType = firstAdId ? 'image/jpeg' : 'image/svg+xml'

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', board ? 'public, max-age=60, s-maxage=300' : 'public, max-age=0, must-revalidate')
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
    <meta property="og:image:type" content="${imageType}" />
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
