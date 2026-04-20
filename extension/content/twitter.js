const PROCESSED = new Set()
let timelineEnabled = true

chrome.storage.local.get(['timelineEnabled'], (res) => {
  timelineEnabled = res.timelineEnabled !== false
})

setInterval(() => {
    try {
      chrome.storage.local.get(['timelineEnabled'], (res) => {
        if (chrome.runtime.lastError) return
        const newVal = res.timelineEnabled !== false
        if (newVal !== timelineEnabled) {
          timelineEnabled = newVal
          if (!timelineEnabled) {
            document.querySelectorAll('.fc-btn').forEach(btn => {
              if (!location.href.includes('/status/')) btn.closest('div')?.remove()
            })
          } else {
            PROCESSED.clear()
            injectButtons()
          }
        }
      })
    } catch {
      // context invalidated, stop polling
    }
  }, 1000)

function getTweetId(article) {
  const link = article.querySelector('a[href*="/status/"]')
  if (!link) return null
  const match = link.href.match(/\/status\/(\d+)/)
  return match ? match[1] : null
}

function getTweetText(article) {
  const textEl = article.querySelector('[data-testid="tweetText"]')
  return textEl ? textEl.innerText.trim() : ''
}

function removeExistingPanel() {
  document.querySelectorAll('.fc-panel').forEach(p => p.remove())
}

function createPanel() {
    const panel = document.createElement('div')
    panel.className = 'fc-panel'
    panel.style.cssText = `
      background: #0d0d0f;
      border: 0.5px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 13px 15px;
      margin-top: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
      font-size: 12px;
      color: #fff;
      max-width: 480px;
      animation: fcFadeIn 0.15s ease;
    `
    return panel
  }

function getBadgeStyle(verdict) {
  const styles = {
    TRUE:       'background:#1a3d2b;color:#4ade80;border:1px solid #22c55e40',
    FALSE:      'background:#3d1a1a;color:#f87171;border:1px solid #ef444440',
    UNVERIFIED: 'background:#2d2a14;color:#fbbf24;border:1px solid #f59e0b40',
    NO_CLAIM:   'background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1)'
  }
  return styles[verdict] || styles.NO_CLAIM
}

function getConfColor(verdict) {
  return { TRUE: '#22c55e', FALSE: '#ef4444', UNVERIFIED: '#f59e0b' }[verdict] || '#888'
}

function renderPanel(panel, data) {
    const sources = (data.sources || []).slice(0, 4)
      .map(s => `<a href="${s.url || '#'}" target="_blank" style="display:block;font-size:11px;color:#5b9cf6;text-decoration:none;padding:3px 0;border-bottom:0.5px solid rgba(255,255,255,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0.85">${s.domain || s.url || 'source'}</a>`)
      .join('')
  
    const conf = data.confidence || 0
    const colors = { TRUE: '#22c55e', FALSE: '#ef4444', UNVERIFIED: '#f59e0b' }
    const bgColors = { TRUE: 'rgba(34,197,94,0.1)', FALSE: 'rgba(239,68,68,0.1)', UNVERIFIED: 'rgba(245,158,11,0.1)' }
    const color = colors[data.verdict] || 'rgba(255,255,255,0.3)'
    const bg = bgColors[data.verdict] || 'rgba(255,255,255,0.05)'
  
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.18);font-weight:500">Fact check</span>
        <button class="fc-close" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:15px;line-height:1;padding:0;font-family:inherit">×</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div style="display:inline-block;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:3px 10px;border-radius:6px;background:${bg};color:${color}">${data.verdict}</div>
        <span style="font-size:11px;font-weight:500;color:rgba(255,255,255,0.25)">${conf}%</span>
      </div>
      <div style="height:1px;background:rgba(255,255,255,0.06);border-radius:1px;margin-bottom:12px;overflow:hidden">
        <div style="height:100%;width:${conf}%;background:${color};border-radius:1px"></div>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,0.72);line-height:1.65;margin-bottom:${sources ? '12px' : '0'}">${data.summary || 'No summary available.'}</p>
      ${sources ? `
        <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.15);font-weight:500;margin-bottom:6px">Sources</div>
        ${sources}
      ` : ''}
    `
  
    panel.querySelector('.fc-close').addEventListener('click', () => panel.remove())
  }

function renderLoading(panel) {
  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;color:rgba(255,255,255,0.5)">
      <div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:fcSpin 0.7s linear infinite;flex-shrink:0"></div>
      Checking sources...
    </div>
  `
}

function renderError(panel, message) {
  panel.innerHTML = `<p style="color:#f87171">${message}</p>`
}

function injectStyles() {
  if (document.getElementById('fc-styles')) return
  const style = document.createElement('style')
  style.id = 'fc-styles'
  style.textContent = `
    @keyframes fcFadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }
    @keyframes fcSpin { to { transform:rotate(360deg) } }
    .fc-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 12px;
      background: #111113;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      transition: background 0.15s;
      margin-top: 8px;
    }
    .fc-btn:hover { background: #222; }
    .fc-btn:disabled { opacity: 0.5; cursor: default; }
  `
  document.head.appendChild(style)
}

function createButton(tweetId) {
  const btn = document.createElement('button')
  btn.className = 'fc-btn'
  btn.dataset.tweetId = tweetId
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
    </svg>
    FastCheck
  `
  return btn
}

function injectButtons() {
  const articles = document.querySelectorAll('article[data-testid="tweet"]')

  articles.forEach(article => {
    const tweetId = getTweetId(article)
    if (!tweetId || PROCESSED.has(tweetId)) return
    PROCESSED.add(tweetId)

    const tweetText = getTweetText(article)
    if (!tweetText) return

    const actionBar = article.querySelector('[role="group"]')
    if (!actionBar) return

    const isDetailPage = location.href.includes('/status/')
    if (!timelineEnabled && !isDetailPage) return

    const btn = createButton(tweetId)
    const wrapper = document.createElement('div')
    wrapper.appendChild(btn)

    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      removeExistingPanel()

      const panel = createPanel()
      wrapper.appendChild(panel)
      renderLoading(panel)

      btn.disabled = true
      btn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
        Checking...
      `

      if (!chrome.runtime?.id) {
        renderError(panel, 'Extension reloaded — please refresh the page.')
        btn.disabled = false
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
          </svg>
          FastCheck
        `
        return
      }

      chrome.runtime.sendMessage(
        { type: 'FACT_CHECK', tweetId, tweetText },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            renderError(panel, 'Request failed. Is the API running?')
          } else if (response.error === 'not_authenticated') {
            renderError(panel, 'Not connected. Click the FastCheck extension icon to log in.')
          } else if (response.error) {
            renderError(panel, response.error)
          } else {
            renderPanel(panel, response)
          }

          btn.disabled = false
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
            </svg>
            FastCheck
          `
        }
      )
    })

    actionBar.parentElement.appendChild(wrapper)
  })
}

injectStyles()

function onNavigate() {
  PROCESSED.clear()
  setTimeout(injectButtons, 500)
  setTimeout(injectButtons, 1500)
}

let lastUrl = location.href
const observer = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href
    onNavigate()
  }
  injectButtons()
})

observer.observe(document.body, { childList: true, subtree: true })
injectButtons()