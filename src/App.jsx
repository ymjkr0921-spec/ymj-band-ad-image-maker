import { useEffect, useMemo, useRef, useState } from 'react'
import { toJpeg, toPng } from 'html-to-image'
import LZString from 'lz-string'
import { getTemplate, templates } from './templates'

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || ''
const PRODUCTION_ORIGIN = 'https://ymj-people.vercel.app'

const STORAGE_KEY = 'ymj-band-ad-image-maker:form'
const BODY_CONTROL_DEFAULTS = {
  bodyOffsetY: 20,
  bodyFontSize: 40,
  bodyLineHeight: 'normal',
}

const defaults = {
  templateId: 'construction',
  highlight: '당일지급 / 초보가능 / 장기가능',
  title: '안성 현대차 현장 모집',
  cardTitle: '안성 현대차 현장 모집',
  cardDescription: '클릭하면 모집 내용을 확인하고 전화·문자 문의할 수 있습니다.',
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
    cardTitle: data.cardTitle || data.title || defaults.cardTitle,
    cardDescription: data.cardDescription || defaults.cardDescription,
    bodyOffsetY: Number(data.bodyOffsetY ?? data.bodyOffset ?? BODY_CONTROL_DEFAULTS.bodyOffsetY),
    bodyFontSize: Number(data.bodyFontSize ?? BODY_CONTROL_DEFAULTS.bodyFontSize),
    bodyLineHeight: data.bodyLineHeight || data.bodyLineSpacing || BODY_CONTROL_DEFAULTS.bodyLineHeight,
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

function createLegacyShareLink(form) {
  const url = new URL('/ad', getShareOrigin())
  url.searchParams.set('data', compressToEncodedURIComponent(JSON.stringify(form)))
  return url.toString()
}

function createBandPost(form, shareLink) {
  return `👇 아래 광고카드를 클릭하면 상세내용 확인 후 전화·문자 문의가 가능합니다.\n${shareLink}`
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
  const isPhotoOriginalTemplate = template.id === 'character-photo-original'

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
        {isPhotoOriginalTemplate && (
          <p className="photo-template-subtitle">
            {form.cardDescription || form.highlight || '함께 성장할 성실한 인재를 찾습니다!'}
          </p>
        )}
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

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

async function prepareDownloadCard(card) {
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
      if (key === 'title' && (!current.cardTitle || current.cardTitle === current.title)) {
        return { ...current, title: value, cardTitle: value }
      }
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
      try {
        let cardImage = ''
        try {
          cardImage = await toJpeg(previewRef.current, {
            cacheBust: true,
            quality: 0.82,
            pixelRatio: 1,
            width: 720,
            height: 900,
          })
        } catch (error) {
          console.warn('Card preview image generation failed', error)
        }

        const response = await fetch(`${API_ORIGIN}/api/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, cardImage }),
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

      const fallbackLink = createLegacyShareLink(form)
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
              <input value={form.cardTitle} onChange={update('cardTitle')} placeholder="밴드 미리보기에 표시할 제목" />
            </label>
            <label className="wide-field">
              <span>밴드 카드 설명</span>
              <input
                value={form.cardDescription}
                onChange={update('cardDescription')}
                placeholder="클릭하면 모집 내용을 확인하고 전화·문자 문의할 수 있습니다."
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
      <div className={`toast ${notice ? 'show' : ''}`} role="status">{notice}</div>
    </div>
  )
}

function App() {
  const pathname = window.location.pathname
  const shortRoute = pathname.match(/^\/(?:ad|s)\/([23456789A-HJ-NP-Za-km-z]{8})\/?$/)
  const isLegacyShareRoute = /^\/(ad|share)\/?$/.test(pathname)
  const isShareArea = /^\/(ad|share|s)(\/|$)/.test(pathname)
  const [sharedForm] = useState(() => (isLegacyShareRoute ? readSharedForm() : null))

  if (shortRoute) return <RemoteSharePage adId={shortRoute[1]} />

  if (isLegacyShareRoute) {
    return sharedForm ? <SharePage form={sharedForm} /> : <InvalidSharePage />
  }

  if (isShareArea) return <InvalidSharePage />

  return <EditorApp />
}

export default App
