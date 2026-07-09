import { getRedis } from '../../_redis.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const id = String(req.query.id || '')
  if (!/^[23456789A-HJ-NP-Za-km-z]{8}$/.test(id)) return res.status(400).end()

  try {
    const redis = getRedis()
    const dataUrl = await redis.get(`ad-image:${id}`)
    if (!dataUrl || typeof dataUrl !== 'string') return res.status(404).end()

    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '')
    const image = Buffer.from(base64, 'base64')
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable')
    return res.status(200).send(image)
  } catch (error) {
    console.error(error)
    return res.status(500).end()
  }
}
