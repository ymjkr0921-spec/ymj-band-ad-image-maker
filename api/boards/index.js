import { createId, getRedis, sanitizeBoard, setCors } from '../_redis.js'

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const board = sanitizeBoard(input)
    if (!board) return res.status(400).json({ error: '묶음 제목과 광고 링크를 확인해 주세요.' })

    const redis = getRedis()
    let id

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const candidate = createId()
      const created = await redis.set(`board:${candidate}`, { ...board, boardId: candidate }, { nx: true })
      if (created) {
        id = candidate
        break
      }
    }

    if (!id) return res.status(503).json({ error: '묶음 ID를 만들지 못했습니다.' })

    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({ id })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: '묶음 정보를 다시 확인해 주세요.' })
    }
    if (error.message === 'REDIS_NOT_CONFIGURED') {
      return res.status(503).json({ error: '광고 묶음 저장에는 저장소 연결이 필요합니다.' })
    }
    console.error(error)
    return res.status(500).json({ error: '광고 묶음을 저장하지 못했습니다.' })
  }
}
