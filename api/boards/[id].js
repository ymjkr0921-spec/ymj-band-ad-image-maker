import { getRedis, ID_PATTERN, setCors } from '../_redis.js'

async function loadBoardWithAds(id) {
  const redis = getRedis()
  const board = await redis.get(`board:${id}`)
  if (!board) return null

  const adIds = Array.isArray(board.adIds)
    ? board.adIds
    : Array.isArray(board.ads)
      ? board.ads.map((item) => item?.id).filter(Boolean)
      : []

  const ads = await Promise.all(
    adIds.slice(0, 15).map(async (adId) => {
      if (!ID_PATTERN.test(String(adId))) return null
      const ad = await redis.get(`ad:${adId}`)
      return ad ? { id: adId, ad } : { id: adId, ad: null }
    }),
  )

  return { board, ads: ads.filter(Boolean) }
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const id = String(req.query.id || '')
  if (!ID_PATTERN.test(id)) return res.status(400).json({ error: '올바르지 않은 묶음 ID입니다.' })

  try {
    const payload = await loadBoardWithAds(id)
    if (!payload) return res.status(404).json({ error: '광고 묶음을 찾을 수 없습니다.' })

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res.status(200).json(payload)
  } catch (error) {
    if (error.message === 'REDIS_NOT_CONFIGURED') {
      return res.status(503).json({ error: '광고 묶음 저장소 연결이 필요합니다.' })
    }
    console.error(error)
    return res.status(500).json({ error: '광고 묶음을 불러오지 못했습니다.' })
  }
}
