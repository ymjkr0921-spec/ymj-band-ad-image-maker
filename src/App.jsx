import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import LZString from 'lz-string'
import { getTemplate, templates } from './templates'

const { compressToEncodedURIComponent, decompressFromEncodedURIComponent } = LZString
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || ''

const STORAGE_KEY = 'ymj-band-ad-image-maker:form'

const defaults = {
  templateId: 'construction',
  highlight: '당일지급 / 초보가능 / 장기가능',
  title: '안성 현대차 현장 모집',
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
    return { ...defaults, ...stored }
  } catch {
    return defaults
  }
}

function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '')
}

function createShortShareLink(id) {
  const publicOrigin = API_ORIGIN || import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin
  return new URL(`/ad/${id}`, publicOrigin).toString()
}

function createLegacyShareLink(form) {
  const publicOrigin = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin
  const url = new URL('/ad', publicOrigin)
  url.searchParams.set('data', compressToEncodedURIComponent(JSON.stringify(form)))
  return url.toString()
}

function createBandPost(form, shareLink) {
  return [
    form.highlight,
    form.title,
    form.body,
    `☎ 문의: ${form.phone}`,
    form.footer,
    '🔗 상세보기 · 전화 · 문자',
    shareLink,
  ]
    .filter(Boolean)
    .join('\n\n')
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
    return { ...defaults, ...parsed }
  } catch {
    return null
  }
}

function useBodyTextFit(bodyRef, body) {
  useEffect(() => {
    const element = bodyRef.current
    if (!element) return

    const fitText = () => {
      let size = 34
      element.classList.remove('is-overflowing')
      element.style.fontSize = `${size}px`
      while (element.scrollHeight > element.clientHeight && size > 9) {
        size -= 1
        element.style.fontSize = `${size}px`
      }
      element.classList.toggle('is-overflowing', size < 19)
    }

    fitText()
    document.fonts?.ready.then(fitText)
  }, [body, bodyRef])
}

function AdCard({ form, cardRef, bodyRef, interactive = false }) {
  const cleanPhone = normalizePhone(form.phone)
  const smsHref = `sms:${cleanPhone}?body=${encodeURIComponent(form.smsMessage)}`
  const CallElement = interactive ? 'a' : 'div'
  const MessageElement = interactive ? 'a' : 'div'
  const template = getTemplate(form.templateId)

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
        <strong className="body-label">▣ 모집 내용</strong>
        <span>{form.body || '광고 내용을 입력하면 이곳에 표시됩니다.'}</span>
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
  useBodyTextFit(bodyRef, `${form.body}-${form.templateId}`)

  return (
    <div className="share-page">
      <main className="share-content">
        <AdCard form={form} bodyRef={bodyRef} interactive />
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
      .then(({ ad }) => setState({ loading: false, form: { ...defaults, ...ad } }))
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

function EditorApp() {
  const [form, setForm] = useState(loadForm)
  const [notice, setNotice] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [shareMode, setShareMode] = useState('')
  const [savingShare, setSavingShare] = useState(false)
  const previewRef = useRef(null)
  const bodyRef = useRef(null)

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

  useBodyTextFit(bodyRef, `${form.body}-${form.templateId}`)

  const update = (key) => (event) => {
    setForm((current) => ({ ...current, [key]: event.target.value }))
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
        const response = await fetch(`${API_ORIGIN}/api/ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
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
    try {
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        width: 720,
        height: 900,
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
            <label className="wide-field">
              <span>긴 광고 텍스트</span>
              <small>밴드에 올릴 문구를 줄바꿈 그대로 붙여넣으세요.</small>
              <textarea value={form.body} onChange={update('body')} rows="13" placeholder="광고 내용을 입력하세요." />
            </label>
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
            <AdCard form={form} cardRef={previewRef} bodyRef={bodyRef} />
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
            <textarea readOnly value={bandPost} rows="6" aria-label="자동 생성된 밴드글" />
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
