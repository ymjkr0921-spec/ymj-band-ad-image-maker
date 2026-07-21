import { createId, getRedis, sanitizeAd, setCors } from '../_redis.js'

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const ad = sanitizeAd(input)
    if (!ad) return res.status(400).json({ error: '올바른 광고 정보를 입력해 주세요.' })
    const cardImage = typeof input.cardImage === 'string' &&
      /^data:image\/jpeg;base64,/.test(input.cardImage) &&
      input.cardImage.length <= 1500000
      ? input.cardImage
      : ''

    const redis = getRedis()
    let id

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const candidate = createId()
      const created = await redis.set(`ad:${candidate}`, ad, { nx: true })
      if (created) {
        id = candidate
        if (cardImage) await redis.set(`ad-image:${candidate}`, cardImage)
        break
      }
    }

    if (!id) return res.status(503).json({ error: '광고 ID를 만들지 못했습니다.' })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({ id })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: '올바른 광고 정보를 입력해 주세요.' })
    }
    if (error.message === 'REDIS_NOT_CONFIGURED') {
      return res.status(503).json({ error: '광고 저장소 연결이 필요합니다.' })
    }
    console.error(error)
    return res.status(500).json({ error: '광고를 저장하지 못했습니다.' })
  }
}
