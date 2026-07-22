import { useEffect, useMemo, useRef, useState } from 'react'
import { toJpeg, toPng } from 'html-to-image'
import LZString from 'lz-string'
import { getTemplate, templates } from './templates'

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || ''
const PRODUCTION_ORIGIN = 'https://ymj-people.vercel.app'

const STORAGE_KEY = 'ymj-band-ad-image-maker:form'
const BOARD_STORAGE_KEY = 'ymj-band-ad-image-maker:board'
const MAX_BOARD_ADS = 15
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
  const bodyOffsetY = Number(form.bodyOffsetY) || 0
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
        <span><b>₩</b>당일지급</span>
        <span><b>♟</b>팀원모집</span>
        <span><b>✓</b>초보가능</span>
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
  return (
    <div className="share-page">
      <main className="share-content">
        <AdCard form={normalizeForm(form)} interactive />
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

function BoardBuilder({ flash }) {
  const [board, setBoard] = useState(loadBoardDraft)
  const [boardLink, setBoardLink] = useState('')
  const [savingBoard, setSavingBoard] = useState(false)
  const boardOgRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify({
      title: board.title,
      description: board.description,
      items: board.items.map(({ link, id }) => ({ link, id })),
    }))
  }, [board])

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
    setBoard((current) => current.items.length >= MAX_BOARD_ADS
      ? current
      : { ...current, items: [...current.items, { link: '', id: '', preview: null, error: '' }] })
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
        if (boardOgRef.current) {
          boardImage = await toJpeg(boardOgRef.current, {
            cacheBust: true,
            quality: 0.9,
            pixelRatio: 1,
            width: 1200,
            height: 630,
          })
        }
      } catch (error) {
        console.warn('Board preview image generation failed', error)
      }

      const response = await fetch(`${API_ORIGIN}/api/boards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      setBoardLink(nextLink)
      flash('광고 묶음 링크를 만들었습니다.')
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
    <section className="board-builder" aria-labelledby="board-builder-title">
      <div className="section-heading">
        <div>
          <p className="step">STEP 03</p>
          <h2 id="board-builder-title">광고 묶음 만들기</h2>
        </div>
        <span className="ratio-badge">최대 {MAX_BOARD_ADS}개</span>
      </div>

      <div className="fields">
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

      <button className="add-board-item" type="button" onClick={addItem} disabled={board.items.length >= MAX_BOARD_ADS}>
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
      <BoardOgPreview
        refNode={boardOgRef}
        title={board.title.trim() || BOARD_DEFAULT_TITLE}
        description={board.description.trim() || BOARD_DEFAULT_DESCRIPTION}
        total={validItems.length}
        adTitles={ogPreviewAds}
      />
    </section>
  )
}

function BoardOgPreview({ refNode, title, description, total, adTitles }) {
  return (
    <div className="board-og-capture" ref={refNode} aria-hidden="true">
      <div className="board-og-frame">
        <p>YMJ 광고 묶음</p>
        <h2>{title}</h2>
        <span>{description}</span>
        <strong>총 {total}개 모집공고</strong>
        <ol>
          {adTitles.map((adTitle, index) => <li key={`${index}-${adTitle}`}>{adTitle}</li>)}
        </ol>
        {total > 3 && <b>+ 외 {total - 3}개 더보기</b>}
        <small>클릭 후 전체 광고 보기 · 전화/문자 문의 가능</small>
      </div>
    </div>
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
  const boardTitle = String(state.board.title || '').trim() || BOARD_DEFAULT_TITLE
  const boardDescription = String(state.board.description || '').trim() || BOARD_DEFAULT_DESCRIPTION

  return (
    <main className="board-page">
      <section className="board-hero">
        <p>YMJ 광고 묶음</p>
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
        <div className="brand-mark">Y</div>
        <div>
          <p className="eyebrow">YMJ BAND AD MAKER</p>
          <h1>밴드 광고 이미지 만들기</h1>
        </div>
      </header>

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
      <BoardBuilder flash={flash} />
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
