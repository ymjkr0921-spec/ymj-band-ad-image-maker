import { getRedis, setCors } from '../_redis.js'

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = String(req.query.id || '')
  if (!/^[23456789A-HJ-NP-Za-km-z]{8}$/.test(id)) {
    return res.status(400).json({ error: '잘못된 광고 ID입니다.' })
  }

  try {
    const redis = getRedis()
    const ad = await redis.get(`ad:${id}`)

    if (!ad) return res.status(404).json({ error: '광고를 찾을 수 없습니다.' })

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res.status(200).json({ ad })
  } catch (error) {
    if (error.message === 'REDIS_NOT_CONFIGURED') {
      return res.status(503).json({ error: '광고 저장소 연결이 필요합니다.' })
    }
    console.error(error)
    return res.status(500).json({ error: '광고를 불러오지 못했습니다.' })
  }
}
