import { Redis } from '@upstash/redis'

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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
