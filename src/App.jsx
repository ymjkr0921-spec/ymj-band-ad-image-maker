import { useEffect, useMemo, useRef, useState } from 'react'
import { toJpeg, toPng } from 'html-to-image'
import LZString from 'lz-string'
import { getTemplate, templates } from './templates'

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || ''
const PRODUCTION_ORIGIN = 'https://ymj-people.vercel.app'

const STORAGE_KEY = 'ymj-band-ad-image-maker:form'
const BOARD_STORAGE_KEY = 'ymj-band-ad-image-maker:board'
const MAX_BOARD_ADS = 50
const BOARD_DEFAULT_LABEL = 'YMJ 광고 묶음'
const BOARD_DEFAULT_TITLE = '\uAC74\uC124\uD604\uC7A5 \uBAA8\uC9D1 \uAD11\uACE0 \uBAA8\uC74C'
const BOARD_DEFAULT_DESCRIPTION = '\uC544\uB798 \uD604\uC7A5\uBCC4 \uBAA8\uC9D1\uACF5\uACE0\uB97C \uD655\uC778 \uD6C4 \uC804\uD654 \uB610\uB294 \uBB38\uC790\uB85C \uBB38\uC758 \uAC00\uB2A5\uD569\uB2C8\uB2E4.'
const BODY_CONTROL_DEFAULTS = {
  bodyOffsetY: 20,
  bodyFontSize: 40,
  bodyLineHeight: 'normal',
}

const defaults = {
  templateId: 'construction',
  highlight: '당일지급 / 초보가능 / 장기가능',
  title: '안성 현대차 현장 모집',
  cardTitle: '',
  cardDescription: '',
  ...BODY_CONTROL_DEFAULTS,
  body: `■ 모집분야: 건설현장 보조 인력
■ 근무장소: 안성 현대차 현장
■ 근무시간: 오전 7시 ~ 오후 5시
■ 급여조건: 당일지급 / 협의 가능
■ 지원자격: 초보자 가능, 장기근무 우대

숙식 제공 가능하며 자세한 내용은
전화 또는 문자로 편하게 문의해 주세요.`,
  phone: '010-1234-5678',
  smsMessage: '안녕하세요. 밴드 광고 보고 연락드립니다.',
  footer: '문의는 전화 또는 문자 주세요.',
}

function loadForm() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return normalizeForm(stored)
  } catch {
    return defaults
  }
}

function normalizeForm(data = {}) {
  return {
    ...defaults,
    ...data,
    cardTitle: data.cardTitle || '',
    cardDescription: data.cardDescription || '',
    bodyOffsetY: Number(data.bodyOffsetY ?? data.bodyOffset ?? BODY_CONTROL_DEFAULTS.bodyOffsetY),
    bodyFontSize: Number(data.bodyFontSize ?? BODY_CONTROL_DEFAULTS.bodyFontSize),
    bodyLineHeight: data.bodyLineHeight || data.bodyLineSpacing || BODY_CONTROL_DEFAULTS.bodyLineHeight,
  }
}

function createCardTitle(title = '') {
  const baseTitle = String(title).trim() || '\uAC74\uC124\uD604\uC7A5 \uC778\uB825 \uBAA8\uC9D1'
  return `${baseTitle}\uFF5C\uB2F9\uC77C\uC9C0\uAE09 \uC870\uACF5\u00B7\uAE30\uACF5\u00B7\uBC18\uC7A5 \uBAA8\uC9D1`
}

function createCardDescription() {
  return '\uCD9C\uD1F4\uADFC \uAC00\uB2A5 \u00B7 \uC548\uC804\uBCA8\uD2B8/\uC5F0\uC7A5 \uD480\uCC29\uC6A9 \uD544\uC218 \u00B7 \uD074\uB9AD \uD6C4 \uC804\uD654\u00B7\uBB38\uC790 \uBC14\uB85C \uBB38\uC758'
}

function withGeneratedCardCopy(form) {
  const title = String(form.title || '').trim()
  return {
    ...form,
    cardTitle: String(form.cardTitle || '').trim() || createCardTitle(title),
    cardDescription: String(form.cardDescription || '').trim() || createCardDescription(),
  }
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '')
}

function getShareOrigin() {
  const hostname = window.location.hostname
  const isLocal = hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

  return isLocal ? window.location.origin : PRODUCTION_ORIGIN
}

function createShortShareLink(id) {
  return new URL(`/ad/${id}`, getShareOrigin()).toString()
}

function createBoardLink(id) {
  return new URL(`/board/${id}`, getShareOrigin()).toString()
}

function createLegacyShareLink(form) {
  const url = new URL('/ad', getShareOrigin())
  url.searchParams.set('data', compressToEncodedURIComponent(JSON.stringify(form)))
  return url.toString()
}

function createBandPost(form, shareLink) {
  const cardTitle = withGeneratedCardCopy(form).cardTitle
  return `📌 ${cardTitle}\n👇 아래 광고카드를 클릭하면 모집내용 확인 후 전화·문자 바로 문의 가능합니다.\n\n${shareLink}`
}

function createBoardBandPost(board, boardLink) {
  const title = String(board.title || '').trim() || BOARD_DEFAULT_TITLE
  const description = String(board.description || '').trim() || BOARD_DEFAULT_DESCRIPTION
  return `\uD83D\uDCE2 ${title}\n\uD83D\uDC47 ${description}\n\n${boardLink}`
}

function extractAdId(value = '') {
  const text = String(value).trim()
  const match = text.match(/(?:\/ad\/|^)([23456789A-HJ-NP-Za-km-z]{8})(?:[/?#]|$)/)
  return match ? match[1] : ''
}

function createBoardDefaults() {
  return {
    boardId: '',
    boardCode: '',
    boardName: '',
    category: '',
    boardLabel: '',
    title: '',
    description: '',
    items: [{ link: '', id: '', preview: null, error: '' }],
  }
}

function normalizeBoardDraft(data = {}) {
  const items = Array.isArray(data.items) && data.items.length
    ? data.items
    : [{ link: '', id: '', preview: null, error: '' }]

  return {
    boardId: typeof data.boardId === 'string' ? data.boardId : createBoardDefaults().boardId,
    boardCode: typeof data.boardCode === 'string' ? data.boardCode : createBoardDefaults().boardCode,
    boardName: typeof data.boardName === 'string' ? data.boardName : createBoardDefaults().boardName,
    category: typeof data.category === 'string' ? data.category : createBoardDefaults().category,
    boardLabel: typeof data.boardLabel === 'string' ? data.boardLabel : createBoardDefaults().boardLabel,
    title: typeof data.title === 'string' ? data.title : createBoardDefaults().title,
    description: typeof data.description === 'string' ? data.description : createBoardDefaults().description,
    items: items.slice(0, MAX_BOARD_ADS).map((item) => {
      const link = typeof item?.link === 'string' ? item.link : ''
      const id = typeof item?.id === 'string' ? item.id : extractAdId(link)
      return { link, id, preview: null, error: '' }
    }),
  }
}

function loadBoardDraft() {
  try {
    return normalizeBoardDraft(JSON.parse(localStorage.getItem(BOARD_STORAGE_KEY)))
  } catch {
    return createBoardDefaults()
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line)
      line = word
      if (lines.length >= maxLines) break
    } else {
      line = testLine
    }
  }

  if (line && lines.length < maxLines) lines.push(line)

  lines.forEach((nextLine, index) => {
    const isLast = index === maxLines - 1 && words.length > 0 && lines.length === maxLines
    let output = nextLine
    if (isLast && ctx.measureText(output).width > maxWidth) {
      while (output.length > 2 && ctx.measureText(`${output}…`).width > maxWidth) {
        output = output.slice(0, -1)
      }
      output = `${output}…`
    }
    ctx.fillText(output, x, y + index * lineHeight)
  })

  return y + lines.length * lineHeight
}

function fillRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

function createBoardOgImage({ label, title, description, total, adTitles }) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const safeLabel = String(label || '').trim() || BOARD_DEFAULT_LABEL
  const safeTitle = String(title || '').trim() || BOARD_DEFAULT_TITLE
  const safeDescription = String(description || '').trim() || BOARD_DEFAULT_DESCRIPTION
  const safeTotal = Math.max(0, Number(total) || 0)
  const list = adTitles.length ? adTitles : ['현장별 모집공고를 확인해 주세요.']

  ctx.fillStyle = '#071321'
  ctx.fillRect(0, 0, 1200, 630)

  const bg = ctx.createLinearGradient(0, 0, 1200, 630)
  bg.addColorStop(0, '#071321')
  bg.addColorStop(0.55, '#12345a')
  bg.addColorStop(1, '#071321')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, 1200, 630)

  ctx.fillStyle = 'rgba(255, 212, 59, 0.10)'
  for (let x = -620; x < 1240; x += 56) {
    ctx.save()
    ctx.translate(x, 0)
    ctx.rotate(-Math.PI / 5)
    ctx.fillRect(0, -80, 18, 920)
    ctx.restore()
  }

  ctx.strokeStyle = '#ffd43b'
  ctx.lineWidth = 18
  ctx.strokeRect(18, 18, 1164, 594)
  ctx.strokeStyle = '#071321'
  ctx.lineWidth = 10
  ctx.strokeRect(36, 36, 1128, 558)
  ctx.strokeStyle = 'rgba(255,255,255,0.24)'
  ctx.lineWidth = 4
  ctx.strokeRect(56, 56, 1088, 518)

  ctx.fillStyle = '#ffd43b'
  fillRoundRect(ctx, 72, 66, 350, 62, 31)
  ctx.fillStyle = '#071321'
  ctx.font = "900 30px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  let labelText = safeLabel
  while (labelText.length > 2 && ctx.measureText(labelText).width > 292) {
    labelText = labelText.slice(0, -1)
  }
  ctx.fillText(labelText.length < safeLabel.length ? `${labelText}…` : labelText, 96, 107)

  ctx.fillStyle = '#ffffff'
  ctx.font = "900 64px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  drawWrappedText(ctx, safeTitle, 78, 194, 770, 72, 2)

  ctx.fillStyle = '#dfe8f5'
  ctx.font = "700 28px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  drawWrappedText(ctx, safeDescription, 80, 336, 790, 38, 2)

  ctx.fillStyle = '#ffd43b'
  ctx.beginPath()
  ctx.arc(1010, 166, 108, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.fillStyle = '#071321'
  ctx.textAlign = 'center'
  ctx.font = "900 34px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  ctx.fillText('총', 1010, 140)
  ctx.font = "900 56px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  ctx.fillText(String(safeTotal), 1010, 196)
  ctx.font = "900 30px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  ctx.fillText('개 모집공고', 1010, 236)
  ctx.textAlign = 'left'

  ctx.font = "900 28px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  list.slice(0, 3).forEach((adTitle, index) => {
    const y = 422 + index * 54
    ctx.fillStyle = '#ffffff'
    fillRoundRect(ctx, 80, y - 34, 770, 42, 12)
    ctx.fillStyle = '#d70816'
    ctx.fillText(`${index + 1}.`, 104, y - 5)
    ctx.fillStyle = '#071321'
    const text = String(adTitle || '').trim()
    let output = text
    while (output.length > 2 && ctx.measureText(output).width > 650) {
      output = output.slice(0, -1)
    }
    ctx.fillText(output.length < text.length ? `${output}…` : output, 154, y - 5)
  })

  if (safeTotal > 3) {
    ctx.fillStyle = '#ffd43b'
    ctx.font = "900 27px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
    ctx.fillText(`+ 외 ${safeTotal - 3}개 더보기`, 880, 466)
  }

  ctx.fillStyle = '#ffd43b'
  ctx.font = "900 29px system-ui, -apple-system, BlinkMacSystemFont, 'Noto Sans KR', sans-serif"
  ctx.textAlign = 'center'
  ctx.fillText('클릭 후 전체 광고 보기 · 전화/문자 문의 가능', 600, 570)
  ctx.textAlign = 'left'

  return canvas.toDataURL('image/jpeg', 0.92)
}

function readSharedForm() {
  try {
    const payload = new URLSearchParams(window.location.search).get('data')
    if (!payload) return null
    const decompressed = decompressFromEncodedURIComponent(payload)
    if (!decompressed) return null
    const parsed = JSON.parse(decompressed)
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.body !== 'string' ||
      typeof parsed.phone !== 'string' ||
      typeof parsed.smsMessage !== 'string' ||
      typeof parsed.templateId !== 'string'
    ) {
      return null
    }
    return normalizeForm(parsed)
  } catch {
    return null
  }
}

function AdCard({ form, cardRef, bodyRef, interactive = false }) {
  const cleanPhone = normalizePhone(form.phone)
  const smsHref = `sms:${cleanPhone}?body=${encodeURIComponent(form.smsMessage)}`
  const CallElement = interactive ? 'a' : 'div'
  const MessageElement = interactive ? 'a' : 'div'
  const template = getTemplate(form.templateId)
  const lineHeights = { narrow: 1.15, normal: 1.35, wide: 1.6 }
  const rawBodyOffsetY = Number(form.bodyOffsetY) || 0
  const bodyOffsetY = interactive ? Math.max(0, rawBodyOffsetY) : rawBodyOffsetY
  const bodyFontSize = Number(form.bodyFontSize) || BODY_CONTROL_DEFAULTS.bodyFontSize
  const bodyLineHeight = lineHeights[form.bodyLineHeight] || lineHeights.normal

  return (
    <article
      className={`ad-card template-${template.id} ${interactive ? 'interactive-card' : ''}`}
      ref={cardRef}
    >
      <div className="hazard-stripe" />
      <div className="poster-brand">
        <span className="poster-brand-icon">{template.icon}</span>
        <span><strong>건설현장 구인</strong><small>함께 일할 분을 찾습니다</small></span>
        <b>☰</b>
      </div>
      <header className="ad-header">
        <div className="highlight-pill">⚡ {form.highlight || '강조문구를 입력하세요'}</div>
        <h3>{form.title || '광고 제목을 입력하세요'}</h3>
        <p>건설현장 구인 · 함께 일할 분을 찾습니다</p>
      </header>
      <div className="ad-feature-strip">
        <span><b>⛑</b>안전우선</span>
        <span><b>⇄</b>출퇴근가능</span>
        <span><b>♟</b>팀원모집</span>
        <span><b>★</b>경력우대</span>
      </div>
      <div className="ad-body" ref={bodyRef}>
        <div
          className="ad-body-content"
          style={{
            fontSize: `${bodyFontSize}px`,
            lineHeight: bodyLineHeight,
            marginTop: `${bodyOffsetY}px`,
          }}
        >
          <strong className="body-label">▣ 모집 내용</strong>
          <span>{form.body || '광고 내용을 입력하면 이곳에 표시됩니다.'}</span>
        </div>
      </div>
      <div className="ad-contact">
        <CallElement
          className="image-button call"
          {...(interactive ? { href: `tel:${cleanPhone}`, 'aria-disabled': !cleanPhone } : {})}
        >
          <span className="button-icon">☎</span>
          <span><small>지금 바로 전화문의</small>{form.phone || '전화번호'}</span>
        </CallElement>
        <MessageElement
          className="image-button message"
          {...(interactive ? { href: smsHref, 'aria-disabled': !cleanPhone } : {})}
        >
          <span className="button-icon">✉</span>
          <span><small>빠르고 간편하게</small>문자문의</span>
        </MessageElement>
      </div>
      <footer className="ad-footer">{form.footer || '문의 안내문구'}</footer>
    </article>
  )
}

function SharePage({ form }) {
  const bodyRef = useRef(null)
  const normalizedForm = normalizeForm(form)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return

    body.scrollTop = 0
    requestAnimationFrame(() => {
      body.scrollTop = 0
    })
  }, [
    normalizedForm.templateId,
    normalizedForm.body,
    normalizedForm.bodyFontSize,
    normalizedForm.bodyLineHeight,
    normalizedForm.bodyOffsetY,
  ])

  return (
    <div className="share-page">
      <main className="share-content">
        <AdCard form={normalizedForm} bodyRef={bodyRef} interactive />
      </main>
    </div>
  )
}

function RemoteSharePage({ adId }) {
  const [state, setState] = useState({ loading: true, form: null })

  useEffect(() => {
    const controller = new AbortController()
    const apiUrl = `${API_ORIGIN}/api/ads/${adId}`

    fetch(apiUrl, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED')
        return response.json()
      })
      .then(({ ad }) => setState({ loading: false, form: normalizeForm(ad) }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ loading: false, form: null })
      })

    return () => controller.abort()
  }, [adId])

  if (state.loading) {
    return <main className="share-loading">광고를 불러오는 중입니다.</main>
  }

  return state.form ? <SharePage form={state.form} /> : <InvalidSharePage />
}

function InvalidSharePage() {
  return (
    <main className="invalid-share-page">
      <div>
        <span>!</span>
        <h1>광고 정보를 불러올 수 없습니다</h1>
      </div>
    </main>
  )
}

function BoardBuilder({ flash, editingBoard, onSaved }) {
  const [board, setBoard] = useState(loadBoardDraft)
  const [boardLink, setBoardLink] = useState('')
  const [savingBoard, setSavingBoard] = useState(false)

  useEffect(() => {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify({
      boardId: board.boardId,
      boardCode: board.boardCode,
      boardName: board.boardName,
      category: board.category,
      boardLabel: board.boardLabel,
      title: board.title,
      description: board.description,
      items: board.items.map(({ link, id }) => ({ link, id })),
    }))
  }, [board])

  useEffect(() => {
    if (!editingBoard) return
    const items = Array.isArray(editingBoard.ads) && editingBoard.ads.length
      ? editingBoard.ads.map((item) => ({
        link: item.link || createShortShareLink(item.id),
        id: item.id,
        preview: null,
        error: '',
      }))
      : Array.isArray(editingBoard.adIds) && editingBoard.adIds.length
        ? editingBoard.adIds.map((id, index) => ({
          link: editingBoard.adLinks?.[index] || createShortShareLink(id),
          id,
          preview: null,
          error: '',
        }))
      : [{ link: '', id: '', preview: null, error: '' }]

    setBoard(normalizeBoardDraft({
      boardId: editingBoard.boardId,
      boardCode: editingBoard.boardCode,
      boardName: editingBoard.boardName,
      category: editingBoard.category,
      boardLabel: editingBoard.boardLabel,
      title: editingBoard.title,
      description: editingBoard.description,
      items,
    }))
    setBoardLink(createBoardLink(editingBoard.boardId))
    flash('묶음 정보를 수정 화면에 불러왔습니다.')
  }, [editingBoard])

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    board.items.forEach((item, index) => {
      if (!item.id || item.preview || item.error) return
      fetch(`${API_ORIGIN}/api/ads/${item.id}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error('LOAD_FAILED')
          return response.json()
        })
        .then(({ ad }) => {
          if (!active) return
          setBoard((current) => ({
            ...current,
            items: current.items.map((next, nextIndex) => nextIndex === index
              ? { ...next, preview: ad, error: '' }
              : next),
          }))
        })
        .catch((error) => {
          if (!active || error.name === 'AbortError') return
          setBoard((current) => ({
            ...current,
            items: current.items.map((next, nextIndex) => nextIndex === index
              ? { ...next, preview: null, error: '광고 정보를 불러오지 못했습니다.' }
              : next),
          }))
        })
    })

    return () => {
      active = false
      controller.abort()
    }
  }, [board.items])

  const updateBoard = (key) => (event) => {
    const value = event.target.value
    setBoard((current) => ({ ...current, [key]: value }))
    setBoardLink('')
  }

  const updateItem = (index, value) => {
    const id = extractAdId(value)
    setBoard((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index
        ? { link: value, id, preview: null, error: id ? '' : '광고 ID를 찾을 수 없습니다.' }
        : item),
    }))
    setBoardLink('')
  }

  const addItem = () => {
    setBoard((current) => {
      if (current.items.length >= MAX_BOARD_ADS) {
        flash('광고 묶음은 최대 50개까지 추가할 수 있습니다.')
        return current
      }
      return { ...current, items: [...current.items, { link: '', id: '', preview: null, error: '' }] }
    })
  }

  const removeItem = (index) => {
    setBoard((current) => ({
      ...current,
      items: current.items.length <= 1
        ? [{ link: '', id: '', preview: null, error: '' }]
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
    setBoardLink('')
  }

  const moveItem = (index, direction) => {
    setBoard((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.items.length) return current
      const items = [...current.items]
      const [item] = items.splice(index, 1)
      items.splice(nextIndex, 0, item)
      return { ...current, items }
    })
    setBoardLink('')
  }

  const rotateItems = () => {
    if (board.items.length < 2) {
      flash('광고가 2개 이상일 때 순서 바꾸기가 가능합니다.')
      return
    }
    setBoard((current) => {
      if (current.items.length < 2) return current
      const items = [...current.items]
      const last = items.pop()
      return { ...current, items: [last, ...items] }
    })
    setBoardLink('')
    flash('마지막 광고를 1번으로 올렸습니다.')
  }

  const resetBoardForm = () => {
    setBoard(createBoardDefaults())
    setBoardLink('')
    flash('새 광고 묶음을 작성할 수 있습니다.')
  }

  const validItems = board.items
    .map((item) => {
      const id = item.id || extractAdId(item.link)
      return { id, link: id ? createShortShareLink(id) : '' }
    })
    .filter((item) => item.id)

  const boardPost = createBoardBandPost(board, boardLink || '묶음 링크를 먼저 저장해 주세요.')
  const ogPreviewAds = validItems.slice(0, 3).map((item) => {
    const source = board.items.find((next) => next.id === item.id)
    return source?.preview?.cardTitle || source?.preview?.title || `광고 ID ${item.id}`
  })

  const saveBoard = async () => {
    if (savingBoard) return
    if (validItems.length < 1) {
      flash('광고 링크를 1개 이상 입력해 주세요.')
      return
    }

    setSavingBoard(true)
    try {
      let boardImage = ''
      try {
        boardImage = createBoardOgImage({
          label: board.boardLabel.trim() || BOARD_DEFAULT_LABEL,
          title: board.title.trim() || BOARD_DEFAULT_TITLE,
          description: board.description.trim() || BOARD_DEFAULT_DESCRIPTION,
          total: validItems.length,
          adTitles: ogPreviewAds,
        })
      } catch (error) {
        console.warn('Board preview image generation failed', error)
      }

      const isEditing = Boolean(board.boardId)
      const response = await fetch(`${API_ORIGIN}/api/boards${isEditing ? `/${board.boardId}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardCode: board.boardCode.trim(),
          boardName: board.boardName.trim(),
          category: board.category.trim(),
          boardLabel: board.boardLabel.trim() || BOARD_DEFAULT_LABEL,
          title: board.title.trim() || BOARD_DEFAULT_TITLE,
          description: board.description.trim() || BOARD_DEFAULT_DESCRIPTION,
          ads: validItems.slice(0, MAX_BOARD_ADS),
          boardImage,
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.id) {
        throw new Error(result.error || 'SAVE_FAILED')
      }
      const nextLink = createBoardLink(result.id)
      setBoard((current) => ({ ...current, boardId: result.id }))
      setBoardLink(nextLink)
      if (onSaved) onSaved()
      flash(isEditing ? '광고 묶음을 수정했습니다.' : '광고 묶음 링크를 만들었습니다.')
      return nextLink
    } catch (error) {
      console.error(error)
      flash(error.message === 'SAVE_FAILED' ? '광고 묶음을 저장하지 못했습니다.' : error.message || '저장소 연결이 필요합니다.')
      return ''
    } finally {
      setSavingBoard(false)
    }
  }

  const copyBoardLink = async () => {
    const link = boardLink || await saveBoard()
    if (!link) return
    await navigator.clipboard.writeText(link)
    flash('묶음 링크를 복사했습니다.')
  }

  const copyBoardPost = async () => {
    const link = boardLink || await saveBoard()
    if (!link) return
    await navigator.clipboard.writeText(createBoardBandPost(board, link))
    flash('밴드용 묶음글을 복사했습니다.')
  }

  return (
    <section className="board-builder" id="board-maker" aria-labelledby="board-builder-title">
      <div className="section-heading">
        <div>
          <p className="step">STEP 03</p>
          <h2 id="board-builder-title">광고 묶음 만들기</h2>
        </div>
        <div className="board-heading-actions">
          {board.boardId && <button type="button" onClick={resetBoardForm}>새 묶음 작성</button>}
          <span className="ratio-badge">최대 {MAX_BOARD_ADS}개</span>
        </div>
      </div>

      <div className="fields">
        <label>
          <span>묶음 코드</span>
          <input value={board.boardCode} onChange={updateBoard('boardCode')} placeholder="SYSTEM, FORM, WALL" />
        </label>
        <label>
          <span>공종/분류</span>
          <input value={board.category} onChange={updateBoard('category')} placeholder="시스템광고, 형틀광고, 벽체광고" />
        </label>
        <label className="wide-field">
          <span>묶음 이름</span>
          <input value={board.boardName} onChange={updateBoard('boardName')} placeholder="1번 코드 시스템광고" />
        </label>
        <label className="wide-field">
          <span>상단 라벨 문구</span>
          <input value={board.boardLabel} onChange={updateBoard('boardLabel')} placeholder="YMJ 광고 묶음" />
        </label>
        <label className="wide-field">
          <span>묶음 제목</span>
          <input value={board.title} onChange={updateBoard('title')} placeholder="건설현장 모집 광고 모음" />
        </label>
        <label className="wide-field">
          <span>묶음 설명</span>
          <input value={board.description} onChange={updateBoard('description')} placeholder="아래 현장별 모집공고를 확인 후 전화 또는 문자로 문의 가능합니다." />
        </label>
      </div>

      <div className="board-items">
        <div className="board-list-actions">
          <button type="button" onClick={rotateItems}>순서 바꾸기</button>
          <span>마지막 광고가 1번으로 올라가고 나머지는 한 칸씩 내려갑니다.</span>
        </div>
        {board.items.map((item, index) => {
          const preview = item.preview
          const phone = preview?.phone || ''
          return (
            <div className="board-item-editor" key={`${index}-${item.id}`}>
              <div className="board-item-number">{index + 1}</div>
              <label>
                <span>광고 링크</span>
                <input
                  value={item.link}
                  onChange={(event) => updateItem(index, event.target.value)}
                  placeholder="https://ymj-people.vercel.app/ad/AAAA1111 또는 /ad/AAAA1111"
                />
              </label>
              <div className="board-item-controls">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0}>위로</button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === board.items.length - 1}>아래로</button>
                <button type="button" onClick={() => removeItem(index)}>삭제</button>
              </div>
              <div className="board-item-preview">
                {item.id ? (
                  <>
                    <strong>{preview?.cardTitle || preview?.title || '광고 정보를 확인 중입니다.'}</strong>
                    <span>{preview?.cardDescription || item.error || `광고 ID: ${item.id}`}</span>
                    <small>{phone ? `전화번호: ${phone}` : createShortShareLink(item.id)}</small>
                  </>
                ) : (
                  <span>광고 링크를 입력하면 광고 ID를 자동으로 추출합니다.</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <button className="add-board-item" type="button" onClick={addItem}>
        + 광고 추가
      </button>

      <div className="share-link-box board-result">
        <div>
          <strong>광고 묶음 공유 링크</strong>
          <span>저장소 연결이 필요합니다. 저장 후 /board/8자리ID 링크가 생성됩니다.</span>
        </div>
        <input readOnly value={boardLink} placeholder="광고 묶음 저장 후 링크가 표시됩니다." />
        <textarea readOnly value={boardPost} rows="4" aria-label="밴드용 묶음글" />
        <div className="share-link-actions">
          <button type="button" onClick={saveBoard} disabled={savingBoard}>{savingBoard ? '저장 중...' : '광고 묶음 저장'}</button>
          <button type="button" onClick={copyBoardLink} disabled={savingBoard}>묶음 링크 복사</button>
          <button type="button" onClick={copyBoardPost} disabled={savingBoard}>밴드용 묶음글 복사</button>
          {boardLink ? <a href={boardLink} target="_blank" rel="noreferrer">묶음 페이지 열기</a> : <button type="button" disabled>묶음 페이지 열기</button>}
        </div>
      </div>
    </section>
  )
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function BoardList({ flash, onEdit, refreshKey }) {
  const [state, setState] = useState({ loading: true, boards: [] })

  const loadBoards = () => {
    setState((current) => ({ ...current, loading: true }))
    fetch(`${API_ORIGIN}/api/boards`)
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED')
        return response.json()
      })
      .then((payload) => setState({ loading: false, boards: Array.isArray(payload.boards) ? payload.boards : [] }))
      .catch((error) => {
        console.error(error)
        setState({ loading: false, boards: [] })
        flash('광고 묶음 목록을 불러오지 못했습니다.')
      })
  }

  useEffect(() => {
    loadBoards()
  }, [refreshKey])

  const copyBoardLinkById = async (boardId) => {
    const link = createBoardLink(boardId)
    await navigator.clipboard.writeText(link)
    flash('묶음 링크를 복사했습니다.')
  }

  const copyBoardPostBySummary = async (board) => {
    const link = createBoardLink(board.boardId)
    await navigator.clipboard.writeText(createBoardBandPost(board, link))
    flash('밴드용 묶음글을 복사했습니다.')
  }

  const editBoard = async (boardId) => {
    try {
      const response = await fetch(`${API_ORIGIN}/api/boards/${boardId}`)
      if (!response.ok) throw new Error('LOAD_FAILED')
      const payload = await response.json()
      onEdit(payload.board)
      window.location.hash = 'board-maker'
    } catch (error) {
      console.error(error)
      flash('수정할 묶음 정보를 불러오지 못했습니다.')
    }
  }

  const rotateBoard = async (boardId) => {
    try {
      const response = await fetch(`${API_ORIGIN}/api/boards/${boardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate' }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'ROTATE_FAILED')
      flash('묶음 광고 순서를 바꿨습니다.')
      loadBoards()
    } catch (error) {
      console.error(error)
      flash(error.message || '순서 바꾸기를 처리하지 못했습니다.')
    }
  }

  const deleteBoard = async (boardId) => {
    if (!window.confirm('이 광고 묶음을 삭제할까요? /board 링크도 더 이상 사용할 수 없습니다.')) return
    try {
      const response = await fetch(`${API_ORIGIN}/api/boards/${boardId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('DELETE_FAILED')
      flash('광고 묶음을 삭제했습니다.')
      loadBoards()
    } catch (error) {
      console.error(error)
      flash('광고 묶음을 삭제하지 못했습니다.')
    }
  }

  return (
    <section className="board-list-manager" id="board-list" aria-labelledby="board-list-title">
      <div className="section-heading">
        <div>
          <p className="step">SERVER BOARD LIST</p>
          <h2 id="board-list-title">광고 묶음 목록</h2>
        </div>
        <button type="button" onClick={loadBoards}>새로고침</button>
      </div>
      <p className="board-list-help">PC와 핸드폰 어디서 접속해도 Upstash Redis에 저장된 같은 묶음 목록을 불러옵니다.</p>

      {state.loading ? (
        <div className="board-list-empty">광고 묶음 목록을 불러오는 중입니다.</div>
      ) : state.boards.length ? (
        <div className="board-list-grid">
          {state.boards.map((board, index) => {
            const link = createBoardLink(board.boardId)
            return (
              <article className="board-list-card" key={board.boardId}>
                <div className="board-list-rank">{index + 1}</div>
                <div className="board-list-info">
                  <div className="board-list-meta">
                    <span>{board.boardCode || 'NO CODE'}</span>
                    <span>{board.category || '분류 없음'}</span>
                  </div>
                  <h3>{board.boardName || board.title || '광고 묶음'}</h3>
                  <p>{board.title || '묶음 제목 없음'}</p>
                  <small>{board.adCount || 0}개 광고 · 생성 {formatDate(board.createdAt)} · 수정 {formatDate(board.updatedAt)}</small>
                  <a href={link} target="_blank" rel="noreferrer">{link}</a>
                </div>
                <div className="board-list-actions">
                  <a href={link} target="_blank" rel="noreferrer">묶음 열기</a>
                  <button type="button" onClick={() => editBoard(board.boardId)}>묶음 수정</button>
                  <button type="button" onClick={() => rotateBoard(board.boardId)}>순서 바꾸기</button>
                  <button type="button" onClick={() => copyBoardLinkById(board.boardId)}>묶음 링크 복사</button>
                  <button type="button" onClick={() => copyBoardPostBySummary(board)}>밴드용 묶음글 복사</button>
                  <button type="button" className="danger" onClick={() => deleteBoard(board.boardId)}>삭제</button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="board-list-empty">아직 서버에 저장된 광고 묶음이 없습니다.</div>
      )}
    </section>
  )
}

function BoardPage({ boardId }) {
  const [state, setState] = useState({ loading: true, board: null, ads: [] })

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${API_ORIGIN}/api/boards/${boardId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('LOAD_FAILED')
        return response.json()
      })
      .then((payload) => setState({ loading: false, board: payload.board, ads: payload.ads || [] }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ loading: false, board: null, ads: [] })
      })

    return () => controller.abort()
  }, [boardId])

  if (state.loading) return <main className="share-loading">광고 묶음을 불러오는 중입니다.</main>
  if (!state.board) return <InvalidSharePage />
  const boardLabel = String(state.board.boardLabel || '').trim() || BOARD_DEFAULT_LABEL
  const boardTitle = String(state.board.title || '').trim() || BOARD_DEFAULT_TITLE
  const boardDescription = String(state.board.description || '').trim() || BOARD_DEFAULT_DESCRIPTION

  return (
    <main className="board-page">
      <section className="board-hero">
        <p>{boardLabel}</p>
        <h1>{boardTitle}</h1>
        <span>{boardDescription}</span>
        <small>현장별 모집공고를 확인 후 전화 또는 문자로 바로 문의하세요.</small>
      </section>
      <section className="board-card-list">
        {state.ads.map(({ id, ad }, index) => {
          const cleanPhone = normalizePhone(ad?.phone || '')
          const smsHref = `sms:${cleanPhone}?body=${encodeURIComponent(ad?.smsMessage || '')}`
          return (
            <article className="board-ad-card" key={id}>
              <div className="board-ad-rank">{index + 1}</div>
              <div className="board-ad-copy">
                <h2>{ad?.cardTitle || ad?.title || '광고 정보를 불러올 수 없습니다.'}</h2>
                <p>{ad?.cardDescription || '광고 상세페이지에서 모집내용을 확인해 주세요.'}</p>
                <a className="board-ad-link" href={createShortShareLink(id)}>{createShortShareLink(id)}</a>
                {ad?.phone && <strong>{ad.phone}</strong>}
              </div>
              <div className="board-ad-actions">
                <a href={createShortShareLink(id)}>광고 자세히 보기</a>
                <a className="call" href={`tel:${cleanPhone}`} aria-disabled={!cleanPhone}>전화문의</a>
                <a className="message" href={smsHref} aria-disabled={!cleanPhone}>문자문의</a>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function prepareDownloadCard(card) {
  if (!card) return () => {}
  const body = card.querySelector('.ad-body')
  const content = card.querySelector('.ad-body-content')
  if (!body || !content) return () => {}

  const original = {
    cardWidth: card.style.width,
    cardHeight: card.style.height,
    bodyMinHeight: body.style.minHeight,
    bodyScrollTop: body.scrollTop,
    contentFontSize: content.style.fontSize,
  }

  card.classList.add('is-exporting')
  card.style.width = '720px'
  card.style.height = 'auto'
  body.scrollTop = 0
  await nextFrame()

  const minFontSize = 18
  const currentFontSize = Number.parseFloat(window.getComputedStyle(content).fontSize) || 40
  let nextFontSize = currentFontSize

  while (nextFontSize > minFontSize && body.scrollHeight > body.clientHeight) {
    nextFontSize -= 2
    content.style.fontSize = `${nextFontSize}px`
    await nextFrame()
  }

  if (body.scrollHeight > body.clientHeight) {
    body.style.minHeight = `${Math.ceil(body.scrollHeight + 36)}px`
    await nextFrame()
    card.style.height = `${Math.ceil(card.scrollHeight)}px`
    await nextFrame()
  }

  return () => {
    card.classList.remove('is-exporting')
    card.style.width = original.cardWidth
    card.style.height = original.cardHeight
    body.style.minHeight = original.bodyMinHeight
    content.style.fontSize = original.contentFontSize
    body.scrollTop = original.bodyScrollTop
  }
}

function EditorApp() {
  const [form, setForm] = useState(loadForm)
  const [notice, setNotice] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareMode, setShareMode] = useState('')
  const [savingShare, setSavingShare] = useState(false)
  const [editingBoard, setEditingBoard] = useState(null)
  const [boardListVersion, setBoardListVersion] = useState(0)
  const previewRef = useRef(null)

  const cleanPhone = normalizePhone(form.phone)
  const smsHref = `sms:${cleanPhone}?body=${encodeURIComponent(form.smsMessage)}`
  const bandPost = useMemo(
    () => createBandPost(form, shareLink || '짧은 공유 링크를 먼저 생성해 주세요.'),
    [form, shareLink],
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  useEffect(() => {
    setShareLink('')
    setShareMode('')
  }, [form])

  const update = (key) => (event) => {
    const value = event.target.type === 'range' ? Number(event.target.value) : event.target.value
    setForm((current) => {
      return { ...current, [key]: value }
    })
  }

  const resetBodyControls = () => {
    setForm((current) => ({ ...current, ...BODY_CONTROL_DEFAULTS }))
    flash('본문 조절값을 초기화했습니다.')
  }

  const flash = (message) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 1800)
  }

  const ensureShareLink = async () => {
    if (shareLink) return { link: shareLink, fallback: shareMode === 'legacy' }
    if (savingShare) throw new Error('SAVE_IN_PROGRESS')

    setSavingShare(true)
    try {
      const shareForm = withGeneratedCardCopy(form)
      try {
        let cardImage = ''
        let restoreCardImage = null
        try {
          restoreCardImage = await prepareDownloadCard(previewRef.current)
          const cardImageHeight = Math.ceil(previewRef.current.scrollHeight)
          cardImage = await toJpeg(previewRef.current, {
            cacheBust: true,
            quality: 0.86,
            pixelRatio: 1,
            width: 720,
            height: cardImageHeight,
          })
        } catch (error) {
          console.warn('Card preview image generation failed', error)
        } finally {
          if (restoreCardImage) restoreCardImage()
        }

        const response = await fetch(`${API_ORIGIN}/api/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...shareForm, cardImage }),
        })
        const result = await response.json().catch(() => ({}))

        if (response.ok && result.id) {
          const nextLink = createShortShareLink(result.id)
          setShareLink(nextLink)
          setShareMode('short')
          return { link: nextLink, fallback: false }
        }

        if (response.status !== 503) {
          throw new Error(result.error || 'SAVE_FAILED')
        }
      } catch (error) {
        if (error.message !== 'Failed to fetch' && error.message !== 'NetworkError when attempting to fetch resource.') {
          if (error.message !== '광고 저장소 연결이 필요합니다.') throw error
        }
      }

      const fallbackLink = createLegacyShareLink(shareForm)
      setShareLink(fallbackLink)
      setShareMode('legacy')
      return { link: fallbackLink, fallback: true }
    } finally {
      setSavingShare(false)
    }
  }

  const createShare = async () => {
    try {
      const { fallback } = await ensureShareLink()
      flash(fallback ? '저장소 미연결로 긴 링크로 생성되었습니다.' : '짧은 공유 링크를 만들었습니다.')
    } catch {
      flash('공유 링크를 만들지 못했습니다.')
    }
  }

  const copyBandPost = async () => {
    try {
      const { link, fallback } = await ensureShareLink()
      await navigator.clipboard.writeText(createBandPost(form, link))
      flash(fallback ? '저장소 미연결로 긴 링크로 생성되었습니다.' : '밴드글을 복사했습니다.')
    } catch {
      flash('광고 저장 후 밴드글을 복사하지 못했습니다.')
    }
  }

  const copyShareLink = async () => {
    try {
      const { link, fallback } = await ensureShareLink()
      await navigator.clipboard.writeText(link)
      flash(fallback ? '저장소 미연결로 긴 링크로 생성되었습니다.' : '공유 링크를 복사했습니다.')
    } catch {
      flash('공유 링크를 만들지 못했습니다.')
    }
  }

  const downloadImage = async () => {
    if (!previewRef.current || downloading) return
    setDownloading(true)
    let restoreDownloadCard = null
    try {
      restoreDownloadCard = await prepareDownloadCard(previewRef.current)
      const captureHeight = Math.ceil(previewRef.current.scrollHeight)
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 720,
        height: captureHeight,
      })
      const link = document.createElement('a')
      link.download = `밴드-구인광고-${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
      flash('PNG 이미지를 저장했습니다.')
    } catch (error) {
      console.error(error)
      flash('이미지 저장 중 오류가 발생했습니다.')
    } finally {
      if (restoreDownloadCard) restoreDownloadCard()
      setDownloading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="site-brand" href="#home" aria-label="YMJ 광고등록 서비스 홈">
          <div className="brand-mark">Y</div>
          <div>
            <p className="eyebrow">YMJ PEOPLE</p>
            <h1>YMJ 광고등록 서비스</h1>
          </div>
        </a>
        <nav className="site-nav" aria-label="주요 메뉴">
          <a href="#home">홈</a>
          <a href="#ad-maker">광고 만들기</a>
          <a href="#board-maker">광고 묶음 만들기</a>
          <a href="#board-list">광고 묶음 목록</a>
          <a href="#how-to-use">사용 방법</a>
        </nav>
      </header>

      <section className="home-hero" id="home">
        <div className="hero-copy">
          <p className="eyebrow">CONSTRUCTION RECRUIT AD SERVICE</p>
          <h2>건설현장 모집광고를<br />이미지, 링크, 묶음페이지로 쉽게 제작합니다.</h2>
          <p>
            밴드에 올릴 광고를 빠르게 만들고, 광고를 클릭한 사람이 전화·문자 문의까지 바로 연결할 수 있습니다.
          </p>
          <div className="hero-actions">
            <a href="#ad-maker">광고 만들기 시작</a>
            <a href="#board-maker">광고 묶음 만들기</a>
          </div>
        </div>
        <div className="hero-panel" aria-label="서비스 요약">
          <strong>YMJ 광고 운영 도구</strong>
          <span>/ad/8자리ID 개별 광고</span>
          <span>/board/8자리ID 묶음 페이지</span>
          <span>전화·문자 문의 바로 연결</span>
        </div>
      </section>

      <section className="feature-section" aria-labelledby="feature-title">
        <div className="homepage-heading">
          <p className="step">SERVICE</p>
          <h2 id="feature-title">주요 기능</h2>
        </div>
        <div className="feature-grid">
          <article>
            <span>01</span>
            <h3>광고 이미지 제작</h3>
            <p>현장명과 모집내용을 입력하면 밴드용 광고 이미지를 만들 수 있습니다.</p>
          </article>
          <article>
            <span>02</span>
            <h3>짧은 광고 링크</h3>
            <p>광고마다 /ad/8자리ID 링크가 생성됩니다.</p>
          </article>
          <article>
            <span>03</span>
            <h3>광고 묶음 페이지</h3>
            <p>여러 광고를 하나의 /board 링크로 묶어 보여줄 수 있습니다.</p>
          </article>
          <article>
            <span>04</span>
            <h3>전화·문자 문의 연결</h3>
            <p>광고를 클릭한 사람이 바로 전화 또는 문자 문의를 할 수 있습니다.</p>
          </article>
        </div>
      </section>

      <section className="maker-section" id="ad-maker" aria-labelledby="ad-maker-title">
        <div className="homepage-heading">
          <p className="step">MAKE AD</p>
          <h2 id="ad-maker-title">광고 만들기</h2>
          <span>Step 1. 광고 내용 입력 → Step 2. 템플릿 선택 → Step 3. 미리보기 → Step 4. 다운로드/공유</span>
        </div>
        <main className="workspace">
        <section className="editor-panel" aria-labelledby="editor-title">
          <div className="section-heading">
            <div>
              <p className="step">STEP 01</p>
              <h2 id="editor-title">광고 내용 입력</h2>
            </div>
            <span className="save-state">● 자동 저장</span>
          </div>

          <div className="template-section">
            <div className="template-section-title">
              <strong>디자인 템플릿</strong>
              <span>{getTemplate(form.templateId).name} 선택됨</span>
            </div>
            <div className="template-grid" role="radiogroup" aria-label="광고 디자인 템플릿">
              {templates.map((template) => {
                const selected = form.templateId === template.id
                return (
                  <button
                    className={`template-option ${selected ? 'selected' : ''}`}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    key={template.id}
                    onClick={() => setForm((current) => ({ ...current, templateId: template.id }))}
                  >
                    <span className={`template-thumb thumb-${template.id}`}>
                      <i className="thumb-top" />
                      <i className="thumb-title" />
                      <i className="thumb-body" />
                      <i className="thumb-actions" />
                    </span>
                    <span className="template-copy">
                      <b>{template.name}</b>
                      <small>{template.description}</small>
                      <span className="template-swatches">
                        {template.colors.map((color) => <i key={color} style={{ background: color }} />)}
                      </span>
                    </span>
                    {selected && <span className="selected-badge">✓ 선택</span>}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="fields">
            <label>
              <span>상단 강조문구</span>
              <input value={form.highlight} onChange={update('highlight')} placeholder="당일지급 / 초보가능" />
            </label>
            <label>
              <span>광고 제목</span>
              <input value={form.title} onChange={update('title')} placeholder="현장 모집 제목" />
            </label>
            <label>
              <span>밴드 카드 제목</span>
              <input
                value={form.cardTitle}
                onChange={update('cardTitle')}
                maxLength="160"
                placeholder={'\uC608) \uAC80\uB2E8\uC2E0\uB3C4\uC2DC \uC2E0\uADDC \uC544\uD30C\uD2B8\uD604\uC7A5\uFF5C\uB2F9\uC77C\uC9C0\uAE09 \uC870\uACF5\u00B7\uAE30\uACF5\u00B7\uBC18\uC7A5 \uBAA8\uC9D1'}
              />
            </label>
            <label className="wide-field">
              <span>밴드 카드 설명</span>
              <input
                value={form.cardDescription}
                onChange={update('cardDescription')}
                maxLength="220"
                placeholder={'\uC608) \uCD9C\uD1F4\uADFC \uAC00\uB2A5 \u00B7 \uC548\uC804\uBCA8\uD2B8/\uC5F0\uC7A5 \uD480\uCC29\uC6A9 \uD544\uC218 \u00B7 \uD074\uB9AD \uD6C4 \uC804\uD654\u00B7\uBB38\uC790 \uBC14\uB85C \uBB38\uC758'}
              />
            </label>
            <label className="wide-field">
              <span>긴 광고 텍스트</span>
              <small>밴드에 올릴 문구를 줄바꿈 그대로 붙여넣으세요.</small>
              <textarea value={form.body} onChange={update('body')} rows="13" placeholder="광고 내용을 입력하세요." />
            </label>
            <div className="body-controls wide-field">
              <div className="body-controls-heading">
                <div>
                  <strong>본문 표시 조절</strong>
                  <small>미리보기, PNG, 공유페이지에 동일하게 적용됩니다.</small>
                </div>
                <button type="button" onClick={resetBodyControls}>↺ 본문 조절 초기화</button>
              </div>
              <label className="slider-control">
                <span><b>본문 위치</b><output>{form.bodyOffsetY > 0 ? `아래 ${form.bodyOffsetY}px` : form.bodyOffsetY < 0 ? `위 ${Math.abs(form.bodyOffsetY)}px` : '가운데'}</output></span>
                <input
                  type="range"
                  min="-80"
                  max="120"
                  step="1"
                  value={form.bodyOffsetY}
                  onChange={update('bodyOffsetY')}
                />
                <small><i>위로</i><i>아래로</i></small>
              </label>
              <label className="slider-control">
                <span><b>본문 글씨 크기</b><output>{form.bodyFontSize}px</output></span>
                <input
                  type="range"
                  min="24"
                  max="60"
                  step="2"
                  value={form.bodyFontSize}
                  onChange={update('bodyFontSize')}
                />
                <small><i>작게</i><i>크게</i></small>
              </label>
              <fieldset className="line-spacing-control">
                <legend>줄 간격</legend>
                {[
                  ['narrow', '좁게'],
                  ['normal', '기본'],
                  ['wide', '넓게'],
                ].map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name="bodyLineHeight"
                      value={value}
                      checked={form.bodyLineHeight === value}
                      onChange={update('bodyLineHeight')}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </fieldset>
              <p className="body-controls-current">
                현재 조절값 · 본문 위치: {form.bodyOffsetY}px / 글씨 크기: {form.bodyFontSize}px / 줄간격: {
                  { narrow: '좁게', normal: '기본', wide: '넓게' }[form.bodyLineHeight]
                }
              </p>
            </div>
            <label>
              <span>전화번호</span>
              <input value={form.phone} onChange={update('phone')} inputMode="tel" placeholder="010-0000-0000" />
            </label>
            <label>
              <span>문자 자동문구</span>
              <input value={form.smsMessage} onChange={update('smsMessage')} placeholder="문자 내용을 입력하세요." />
            </label>
            <label className="wide-field">
              <span>하단 안내문구</span>
              <input value={form.footer} onChange={update('footer')} placeholder="문의는 전화 또는 문자 주세요." />
            </label>
          </div>
        </section>

        <section className="preview-panel" aria-labelledby="preview-title">
          <div className="section-heading">
            <div>
              <p className="step">STEP 02</p>
              <h2 id="preview-title">실시간 미리보기</h2>
            </div>
            <span className="ratio-badge">4 : 5</span>
          </div>

          <div className="preview-stage">
            <AdCard form={form} cardRef={previewRef} />
          </div>

          <div className="primary-actions">
            <button className="download-button" type="button" onClick={downloadImage} disabled={downloading}>
              <span>↓</span> {downloading ? '이미지 만드는 중...' : 'PNG 이미지 다운로드'}
            </button>
          </div>

          <div className="contact-actions">
            <a className="real-button call" href={`tel:${cleanPhone}`} aria-disabled={!cleanPhone}>☎ 전화하기</a>
            <a className="real-button message" href={smsHref} aria-disabled={!cleanPhone}>✉ 문자보내기</a>
          </div>

          <div className="share-link-box">
            <div>
              <strong>공유용 광고 페이지</strong>
              <span>
                {shareMode === 'legacy'
                  ? '저장소 미연결로 기존 긴 링크를 사용합니다.'
                  : '저장소 연결 시 짧은 링크가 생성됩니다.'}
              </span>
            </div>
            <input
              readOnly
              value={shareLink}
              placeholder="짧은 공유 링크를 생성해 주세요."
              aria-label="공유용 광고 링크"
            />
            <div className="share-link-actions">
              <button type="button" onClick={shareLink ? copyShareLink : createShare} disabled={savingShare}>
                {savingShare ? '저장 중...' : shareLink ? '링크 복사' : '짧은 링크 만들기'}
              </button>
              {shareLink ? (
                <a href={shareLink} target="_blank" rel="noreferrer">페이지 열기 ↗</a>
              ) : (
                <button type="button" onClick={createShare} disabled={savingShare}>광고 저장</button>
              )}
            </div>
          </div>

          <div className="band-copy">
            <div>
              <strong>밴드에 같이 올릴 글</strong>
              <span>실제 전화·문자 기능이 있는 공유 링크가 포함됩니다.</span>
            </div>
            <textarea readOnly value={bandPost} rows="4" aria-label="자동 생성된 밴드글" />
            <button type="button" onClick={copyBandPost} disabled={savingShare}>
              {savingShare ? '광고 저장 중...' : '▣ 밴드글 복사'}
            </button>
          </div>
        </section>
        </main>
      </section>

      <section className="board-home-section" aria-labelledby="board-maker-title">
        <div className="homepage-heading">
          <p className="step">BOARD MAKER</p>
          <h2 id="board-maker-title">광고 묶음 만들기</h2>
          <span>여러 개별 광고 링크를 최대 50개까지 모아 하나의 묶음 페이지로 저장합니다.</span>
        </div>
        <BoardBuilder
          flash={flash}
          editingBoard={editingBoard}
          onSaved={() => setBoardListVersion((version) => version + 1)}
        />
        <BoardList
          flash={flash}
          refreshKey={boardListVersion}
          onEdit={(board) => setEditingBoard({ ...board, loadedAt: Date.now() })}
        />
      </section>

      <section className="how-to-section" id="how-to-use" aria-labelledby="how-to-title">
        <div className="homepage-heading">
          <p className="step">GUIDE</p>
          <h2 id="how-to-title">사용 방법</h2>
        </div>
        <ol className="how-to-list">
          <li><strong>1단계.</strong> 광고 내용을 입력합니다.</li>
          <li><strong>2단계.</strong> 광고 이미지를 확인합니다.</li>
          <li><strong>3단계.</strong> 밴드글을 복사합니다.</li>
          <li><strong>4단계.</strong> 여러 광고는 묶음으로 저장합니다.</li>
          <li><strong>5단계.</strong> 밴드에 붙여넣고 게시합니다.</li>
        </ol>
      </section>
      <div className={`toast ${notice ? 'show' : ''}`} role="status">{notice}</div>
    </div>
  )
}

function App() {
  const pathname = window.location.pathname
  const shortRoute = pathname.match(/^\/(?:ad|s)\/([23456789A-HJ-NP-Za-km-z]{8})\/?$/)
  const boardRoute = pathname.match(/^\/board\/([23456789A-HJ-NP-Za-km-z]{8})\/?$/)
  const isLegacyShareRoute = /^\/(ad|share)\/?$/.test(pathname)
  const isShareArea = /^\/(ad|share|s)(\/|$)/.test(pathname)
  const [sharedForm] = useState(() => (isLegacyShareRoute ? readSharedForm() : null))

  if (boardRoute) return <BoardPage boardId={boardRoute[1]} />

  if (shortRoute) return <RemoteSharePage adId={shortRoute[1]} />

  if (isLegacyShareRoute) {
    return sharedForm ? <SharePage form={sharedForm} /> : <InvalidSharePage />
  }

  if (isShareArea) return <InvalidSharePage />

  return <EditorApp />
}

export default App
