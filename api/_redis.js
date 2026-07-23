import { randomBytes } from 'node:crypto'
import { Redis } from '@upstash/redis'

export const ID_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
export const ID_PATTERN = /^[23456789A-HJ-NP-Za-km-z]{8}$/
export const BOARD_INDEX_KEY = 'boards:index'
export const BOARD_DEFAULT_LABEL = 'YMJ 광고 묶음'
export const BOARD_DEFAULT_TITLE = '\uAC74\uC124\uD604\uC7A5 \uBAA8\uC9D1 \uAD11\uACE0 \uBAA8\uC74C'
export const BOARD_DEFAULT_DESCRIPTION = '\uC544\uB798 \uD604\uC7A5\uBCC4 \uBAA8\uC9D1\uACF5\uACE0\uB97C \uD655\uC778 \uD6C4 \uC804\uD654 \uB610\uB294 \uBB38\uC790\uB85C \uBB38\uC758 \uAC00\uB2A5\uD569\uB2C8\uB2E4.'

export function createId(length = 8) {
  const bytes = randomBytes(length)
  return Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('')
}

export function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    throw new Error('REDIS_NOT_CONFIGURED')
  }

  return new Redis({ url, token })
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export function sanitizeAd(input) {
  if (!input || typeof input !== 'object') return null

  const fields = [
    'templateId',
    'highlight',
    'title',
    'cardTitle',
    'cardDescription',
    'body',
    'phone',
    'smsMessage',
    'footer',
  ]
  const optionalStringFields = [
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'backgroundColor',
    'textColor',
    'buttonColor',
    'messageButtonColor',
  ]
  const ad = {}

  for (const field of fields) {
    if (typeof input[field] !== 'string') return null
    ad[field] = input[field].slice(0, field === 'body' ? 12000 : 500)
  }

  for (const field of optionalStringFields) {
    if (typeof input[field] === 'string') {
      ad[field] = input[field].slice(0, 120)
    }
  }

  const bodyOffsetY = Number(input.bodyOffsetY ?? input.bodyOffset)
  const bodyFontSize = Number(input.bodyFontSize)
  const bodyLineHeight = input.bodyLineHeight || input.bodyLineSpacing
  ad.bodyOffsetY = Number.isFinite(bodyOffsetY) ? Math.max(-80, Math.min(120, bodyOffsetY)) : 20
  ad.bodyFontSize = Number.isFinite(bodyFontSize) ? Math.max(24, Math.min(60, bodyFontSize)) : 40
  ad.bodyLineHeight = ['narrow', 'normal', 'wide'].includes(bodyLineHeight)
    ? bodyLineHeight
    : 'normal'

  if (!ad.title.trim() || !ad.body.trim() || !ad.phone.trim()) return null
  return ad
}

export function sanitizeBoard(input) {
  if (!input || typeof input !== 'object') return null

  const title = typeof input.title === 'string' ? input.title.trim().slice(0, 160) : ''
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 300) : ''
  const boardLabel = typeof input.boardLabel === 'string' ? input.boardLabel.trim().slice(0, 60) : ''
  const boardCode = typeof input.boardCode === 'string' ? input.boardCode.trim().slice(0, 40) : ''
  const boardName = typeof input.boardName === 'string' ? input.boardName.trim().slice(0, 120) : ''
  const category = typeof input.category === 'string' ? input.category.trim().slice(0, 120) : ''
  const rawAds = Array.isArray(input.ads) ? input.ads : []

  const ads = rawAds
    .map((item) => {
      const id = typeof item?.id === 'string' ? item.id.trim() : ''
      const link = typeof item?.link === 'string' ? item.link.trim().slice(0, 300) : ''
      return ID_PATTERN.test(id) ? { id, link } : null
    })
    .filter(Boolean)
    .slice(0, 50)

  if (ads.length < 1) return null

  const now = new Date().toISOString()
  return {
    boardLabel: boardLabel || BOARD_DEFAULT_LABEL,
    boardCode,
    boardName: boardName || title || BOARD_DEFAULT_TITLE,
    category,
    title: title || BOARD_DEFAULT_TITLE,
    description: description || BOARD_DEFAULT_DESCRIPTION,
    ads,
    adIds: ads.map((ad) => ad.id),
    adLinks: ads.map((ad) => ad.link),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: now,
  }
}
