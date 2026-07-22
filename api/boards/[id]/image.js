import { BOARD_DEFAULT_LABEL, getRedis, ID_PATTERN } from '../../_redis.js'
import sharp from 'sharp'

function escapeXml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function createFallbackSvg(board = {}) {
  const label = escapeXml(board.boardLabel || BOARD_DEFAULT_LABEL)
  const title = escapeXml(board.title || 'YMJ 광고 묶음')
  const count = Array.isArray(board.adIds) ? board.adIds.length : 0
  const description = escapeXml(board.description || '클릭해서 전체 광고 보기 · 전화·문자 문의 가능')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#071321"/>
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="#102f58" stroke="#ffd43b" stroke-width="18"/>
  <rect x="56" y="56" width="1088" height="518" rx="20" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="4"/>
  <rect x="76" y="72" width="350" height="64" rx="32" fill="#ffd43b"/>
  <text x="106" y="113" font-family="system-ui, sans-serif" font-size="30" font-weight="900" fill="#071321">${label}</text>
  <text x="80" y="220" font-family="system-ui, sans-serif" font-size="64" font-weight="900" fill="#ffffff">${title}</text>
  <text x="80" y="304" font-family="system-ui, sans-serif" font-size="30" font-weight="700" fill="#dfe8f5">${description}</text>
  <circle cx="1008" cy="164" r="108" fill="#ffd43b" stroke="#ffffff" stroke-width="8"/>
  <text x="1008" y="150" text-anchor="middle" font-family="system-ui, sans-serif" font-size="34" font-weight="900" fill="#071321">총 ${count}개</text>
  <text x="1008" y="202" text-anchor="middle" font-family="system-ui, sans-serif" font-size="30" font-weight="900" fill="#071321">모집공고</text>
  <rect x="80" y="382" width="760" height="54" rx="14" fill="#ffffff"/>
  <rect x="80" y="452" width="760" height="54" rx="14" fill="#ffffff"/>
  <rect x="80" y="382" width="14" height="54" fill="#ffd43b"/>
  <rect x="80" y="452" width="14" height="54" fill="#ffd43b"/>
  <text x="112" y="418" font-family="system-ui, sans-serif" font-size="30" font-weight="900" fill="#071321">현장별 모집공고를 한 곳에서 확인</text>
  <text x="112" y="488" font-family="system-ui, sans-serif" font-size="30" font-weight="900" fill="#071321">광고 자세히 보기 · 전화문의 · 문자문의</text>
  <text x="600" y="570" text-anchor="middle" font-family="system-ui, sans-serif" font-size="29" font-weight="900" fill="#ffd43b">클릭 후 전체 광고 보기 · 전화/문자 문의 가능</text>
</svg>`
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end()

  const id = String(req.query.id || '')
  if (!ID_PATTERN.test(id)) return res.status(400).end()

  try {
    const redis = getRedis()
    const board = await redis.get(`board:${id}`)
    if (!board) return res.status(404).end()

    const dataUrl = await redis.get(`board-image:${id}`)

    if (!dataUrl || typeof dataUrl !== 'string' || !/^data:image\/jpeg;base64,/.test(dataUrl) || dataUrl.length < 20000) {
      const image = await sharp(Buffer.from(createFallbackSvg(board), 'utf8')).jpeg({ quality: 92 }).toBuffer()
      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Content-Length', String(image.length))
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300')
      if (req.method === 'HEAD') return res.status(200).end()
      return res.status(200).send(image)
    }

    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '')
    const image = Buffer.from(base64, 'base64')
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Content-Length', String(image.length))
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable')
    if (req.method === 'HEAD') return res.status(200).end()
    return res.status(200).send(image)
  } catch (error) {
    console.error(error)
    return res.status(500).end()
  }
}
