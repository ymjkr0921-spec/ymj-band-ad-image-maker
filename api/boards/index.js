import { createId, getRedis, sanitizeBoard, setCors } from '../_redis.js'

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const board = sanitizeBoard(input)
    if (!board) return res.status(400).json({ error: '\uBB36\uC74C \uC815\uBCF4\uB97C \uB2E4\uC2DC \uD655\uC778\uD574 \uC8FC\uC138\uC694.' })
    const boardImage = typeof input.boardImage === 'string' &&
      /^data:image\/jpeg;base64,/.test(input.boardImage) &&
      input.boardImage.length <= 1500000
      ? input.boardImage
      : ''

    const redis = getRedis()
    let id

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const candidate = createId()
      const created = await redis.set(`board:${candidate}`, { ...board, boardId: candidate }, { nx: true })
      if (created) {
        id = candidate
        if (boardImage) await redis.set(`board-image:${candidate}`, boardImage)
        break
      }
    }

    if (!id) return res.status(503).json({ error: '\uAD11\uACE0 \uBB36\uC74C \uC800\uC7A5\uC5D0\uB294 \uC800\uC7A5\uC18C \uC5F0\uACB0\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.' })

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
    return res.status(500).json({ error: '\uAD11\uACE0 \uBB36\uC74C\uC744 \uC800\uC7A5\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.' })
  }
}
