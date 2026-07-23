import { BOARD_INDEX_KEY, getRedis, ID_PATTERN, sanitizeBoard, setCors } from '../_redis.js'

function createBoardSummary(board, boardId) {
  const id = boardId || board.boardId
  return {
    boardId: id,
    boardCode: board.boardCode || '',
    boardName: board.boardName || board.title || '',
    category: board.category || '',
    title: board.title || '',
    description: board.description || '',
    boardLabel: board.boardLabel || '',
    adCount: Array.isArray(board.adIds) ? board.adIds.length : Array.isArray(board.ads) ? board.ads.length : 0,
    createdAt: board.createdAt || '',
    updatedAt: board.updatedAt || board.createdAt || '',
  }
}

async function updateBoardIndex(redis, summary) {
  const stored = await redis.get(BOARD_INDEX_KEY)
  const current = Array.isArray(stored) ? stored : []
  const next = [
    summary,
    ...current.filter((item) => item?.boardId !== summary.boardId),
  ].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  await redis.set(BOARD_INDEX_KEY, next)
}

async function removeBoardIndex(redis, id) {
  const stored = await redis.get(BOARD_INDEX_KEY)
  const current = Array.isArray(stored) ? stored : []
  await redis.set(BOARD_INDEX_KEY, current.filter((item) => item?.boardId !== id))
}

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
    adIds.slice(0, 50).map(async (adId) => {
      if (!ID_PATTERN.test(String(adId))) return null
      const ad = await redis.get(`ad:${adId}`)
      return ad ? { id: adId, ad } : { id: adId, ad: null }
    }),
  )

  return { board, ads: ads.filter(Boolean) }
}

function getBoardImage(input) {
  return typeof input.boardImage === 'string' &&
    /^data:image\/jpeg;base64,/.test(input.boardImage) &&
    input.boardImage.length >= 20000 &&
    input.boardImage.length <= 1500000
    ? input.boardImage
    : ''
}

export default async function handler(req, res) {
  setCors(res)

  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!['GET', 'PUT', 'POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })

  const id = String(req.query.id || '')
  if (!ID_PATTERN.test(id)) return res.status(400).json({ error: '올바르지 않은 묶음 ID입니다.' })

  try {
    const redis = getRedis()

    if (req.method === 'GET') {
      const payload = await loadBoardWithAds(id)
      if (!payload) return res.status(404).json({ error: '광고 묶음을 찾을 수 없습니다.' })

      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
      return res.status(200).json(payload)
    }

    if (req.method === 'PUT') {
      const previous = await redis.get(`board:${id}`)
      if (!previous) return res.status(404).json({ error: '광고 묶음을 찾을 수 없습니다.' })

      const input = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const board = sanitizeBoard({ ...input, createdAt: previous.createdAt })
      if (!board) return res.status(400).json({ error: '묶음 정보를 다시 확인해 주세요.' })

      const nextBoard = { ...board, boardId: id, createdAt: previous.createdAt || board.createdAt }
      const boardImage = getBoardImage(input)

      await redis.set(`board:${id}`, nextBoard)
      if (boardImage) await redis.set(`board-image:${id}`, boardImage)
      else await redis.del(`board-image:${id}`)
      await updateBoardIndex(redis, createBoardSummary(nextBoard, id))
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ id, board: nextBoard })
    }

    if (req.method === 'POST') {
      const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
      if (input.action !== 'rotate') return res.status(400).json({ error: '지원하지 않는 작업입니다.' })

      const board = await redis.get(`board:${id}`)
      if (!board) return res.status(404).json({ error: '광고 묶음을 찾을 수 없습니다.' })
      const ads = Array.isArray(board.ads) ? [...board.ads] : []
      if (ads.length < 2) return res.status(400).json({ error: '광고가 2개 이상일 때 순서 바꾸기가 가능합니다.' })

      const last = ads.pop()
      const nextAds = [last, ...ads]
      const nextBoard = {
        ...board,
        ads: nextAds,
        adIds: nextAds.map((ad) => ad.id),
        adLinks: nextAds.map((ad) => ad.link),
        updatedAt: new Date().toISOString(),
      }

      await redis.set(`board:${id}`, nextBoard)
      await redis.del(`board-image:${id}`)
      await updateBoardIndex(redis, createBoardSummary(nextBoard, id))
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({ id, board: nextBoard })
    }

    const board = await redis.get(`board:${id}`)
    if (!board) return res.status(404).json({ error: '광고 묶음을 찾을 수 없습니다.' })
    await redis.del(`board:${id}`)
    await redis.del(`board-image:${id}`)
    await removeBoardIndex(redis, id)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ id })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: '묶음 정보를 다시 확인해 주세요.' })
    }
    if (error.message === 'REDIS_NOT_CONFIGURED') {
      return res.status(503).json({ error: '광고 묶음 저장소 연결이 필요합니다.' })
    }
    console.error(error)
    return res.status(500).json({ error: '광고 묶음 작업을 처리하지 못했습니다.' })
  }
}
