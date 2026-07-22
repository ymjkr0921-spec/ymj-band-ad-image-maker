import { getRedis, ID_PATTERN } from '../../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end()

  const id = String(req.query.id || '')
  if (!ID_PATTERN.test(id)) return res.status(400).end()

  try {
    const redis = getRedis()
    const board = await redis.get(`board:${id}`)
    if (!board) return res.status(404).end()

    let dataUrl = await redis.get(`board-image:${id}`)

    if (!dataUrl || typeof dataUrl !== 'string') {
      const firstAdId = Array.isArray(board.adIds) && ID_PATTERN.test(String(board.adIds[0])) ? board.adIds[0] : ''
      if (firstAdId) dataUrl = await redis.get(`ad-image:${firstAdId}`)
    }

    if (!dataUrl || typeof dataUrl !== 'string') return res.status(404).end()

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
