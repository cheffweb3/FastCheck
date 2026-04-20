let timelineEnabled = true

chrome.storage.local.get(['timelineEnabled'], (res) => {
  timelineEnabled = res.timelineEnabled !== false
})

setInterval(() => {
  try {
    chrome.storage.local.get(['timelineEnabled'], (res) => {
      if (chrome.runtime.lastError) return
      timelineEnabled = res.timelineEnabled !== false
    })
  } catch {}
}, 1000)

function simpleHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

function getOrCreateFloatingPanel() {
  let panel = document.getElementById('fc-floating-panel')
  if (panel) return panel

  panel = document.createElement('div')
  panel.id = 'fc-floating-panel'
  panel.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 320px;
    background: #0d0d0f;
    border: 0.5px solid rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 14px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
    font-size: 13px;
    color: #fff;
    z-index: 999999;
    display: none;
    animation: fcSlideIn 0.2s ease;
  `

  document.body.appendChild(panel)
  return panel
}

function showFloatingLoading() {
  const panel = getOrCreateFloatingPanel()
  panel.style.display = 'block'
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.18);font-weight:500">Fact Check</span>
      <button id="fc-float-close" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:15px;line-height:1;padding:0;font-family:inherit">×</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;color:rgba(255,255,255,0.4)">
      <div style="width:14px;height:14px;border:1.5px solid rgba(255,255,255,0.1);border-top-color:#3b82f6;border-radius:50%;animation:fcTermSpin 0.7s linear infinite;flex-shrink:0"></div>
      <span style="font-size:12px">Checking sources...</span>
    </div>
  `
  document.getElementById('fc-float-close').addEventListener('click', () => {
    panel.style.display = 'none'
  })
}

function showFloatingVerdict(response) {
  const panel = getOrCreateFloatingPanel()
  panel.style.display = 'block'

  if (response.error === 'not_authenticated') {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.18);font-weight:500">Fact Check</span>
        <button id="fc-float-close" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:15px;line-height:1;padding:0;font-family:inherit">×</button>
      </div>
      <p style="color:#f87171;font-size:12px">Not connected. Click the FastCheck extension icon to log in.</p>
    `
    document.getElementById('fc-float-close').addEventListener('click', () => panel.style.display = 'none')
    return
  }

  if (response.error) {
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <span style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.18);font-weight:500">Fact Check</span>
        <button id="fc-float-close" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:15px;line-height:1;padding:0;font-family:inherit">×</button>
      </div>
      <p style="color:#f87171;font-size:12px">${response.error}</p>
    `
    document.getElementById('fc-float-close').addEventListener('click', () => panel.style.display = 'none')
    return
  }

  const colors = { TRUE: '#22c55e', FALSE: '#ef4444', UNVERIFIED: '#f59e0b' }
  const bgColors = { TRUE: 'rgba(34,197,94,0.1)', FALSE: 'rgba(239,68,68,0.1)', UNVERIFIED: 'rgba(245,158,11,0.1)' }
  const color = colors[response.verdict] || 'rgba(255,255,255,0.3)'
  const bg = bgColors[response.verdict] || 'rgba(255,255,255,0.05)'
  const conf = response.confidence || 0

  const sources = (response.sources || []).slice(0, 4)
    .map(s => `<a href="${s.url || '#'}" target="_blank" style="display:block;font-size:11px;color:#5b9cf6;text-decoration:none;padding:3px 0;border-bottom:0.5px solid rgba(255,255,255,0.04);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0.85">${s.domain || s.url || 'source'}</a>`)
    .join('')

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.18);font-weight:500">Fact Check</span>
      <button id="fc-float-close" style="background:none;border:none;color:rgba(255,255,255,0.2);cursor:pointer;font-size:15px;line-height:1;padding:0;font-family:inherit">×</button>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:3px 10px;border-radius:6px;background:${bg};color:${color}">${response.verdict}</div>
      <span style="font-size:11px;font-weight:500;color:rgba(255,255,255,0.25)">${conf}%</span>
    </div>
    <div style="height:1px;background:rgba(255,255,255,0.06);border-radius:1px;margin-bottom:12px;overflow:hidden">
      <div style="height:100%;width:${conf}%;background:${color};border-radius:1px"></div>
    </div>
    <p style="font-size:12px;color:rgba(255,255,255,0.72);line-height:1.65;margin-bottom:${sources ? '12px' : '0'}">${response.summary || 'No summary available.'}</p>
    ${sources ? `
      <div style="font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.15);font-weight:500;margin-bottom:6px">Sources</div>
      ${sources}
    ` : ''}
  `

  document.getElementById('fc-float-close').addEventListener('click', () => panel.style.display = 'none')
}

function buildButton() {
  const btn = document.createElement('button')
  btn.className = 'fc-terminal-btn'
  btn.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
    </svg>
    FastCheck
  `
  btn.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    background: #111113;
    color: rgba(255,255,255,0.7);
    border: 0.5px solid rgba(255,255,255,0.12);
    border-radius: 20px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    transition: background 0.15s;
    width: 100%;
    justify-content: center;
  `
  btn.addEventListener('mouseenter', () => btn.style.background = '#1a1a1c')
  btn.addEventListener('mouseleave', () => btn.style.background = '#111113')
  return btn
}

function attachClickHandler(btn, tweetId, tweetText) {
  btn.addEventListener('mousedown', (e) => {
    e.stopPropagation()
    e.stopImmediatePropagation()
  })

  btn.addEventListener('click', async (e) => {
    e.stopPropagation()
    e.stopImmediatePropagation()
    e.preventDefault()

    if (!chrome.runtime?.id) {
      showFloatingVerdict({ error: 'Extension reloaded — refresh the page.' })
      return
    }

    showFloatingLoading()
    btn.disabled = true
    btn.style.opacity = '0.5'

    chrome.runtime.sendMessage(
      { type: 'FACT_CHECK', tweetId, tweetText },
      (response) => {
        btn.disabled = false
        btn.style.opacity = '1'

        if (chrome.runtime.lastError || !response) {
          showFloatingVerdict({ error: 'Request failed. Is the API running?' })
          return
        }

        showFloatingVerdict(response)
      }
    )
  })
}

function getTweetText(popup) {
  const el = popup.querySelector('span.text-\\[18px\\]')
  return el ? el.innerText.trim() : ''
}

function injectFastCheckButton(popup) {
  if (popup.querySelector('.fc-terminal-btn')) return

  const tweetText = getTweetText(popup)
  if (!tweetText) return

  const link = popup.querySelector('a[href*="/status/"]')
  const match = link?.href.match(/\/status\/(\d+)/)
  const tweetId = match ? match[1] : 'terminal_' + simpleHash(tweetText)

  const btn = buildButton()
  btn.style.marginTop = '6px'

  attachClickHandler(btn, tweetId, tweetText)

  const firstDivider = popup.querySelector('div.mx-\\[16px\\].h-\\[1px\\]')
  if (firstDivider) {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 8px 16px 4px;'
    wrapper.appendChild(btn)
    firstDivider.after(wrapper)
  }
}

function getPadreTweetText(popup) {
  const all = popup.querySelectorAll('span[class*="MuiTypography-paragraph1"]')
  for (const el of all) {
    const text = el.innerText.trim()
    if (text.length > 20 && 
        !text.includes('Replying to') && 
        !text.match(/^\d+$/) &&
        !text.match(/^\d+[smhd]$/) &&
        !text.includes('followers') &&
        !text.includes('PM ·') &&
        !text.includes('AM ·') &&
        !text.includes('Read more') &&
        !text.startsWith('@') &&
        text !== '/') {
      return text
    }
  }
  return ''
}

function getPadreTweetId(popup) {
  const link = popup.querySelector('a[href*="/status/"]')
  if (!link) return null
  const match = link.href.match(/\/status\/(\d+)/)
  return match ? match[1] : null
}

function injectPadreButton(popup) {
  if (popup.querySelector('.fc-terminal-btn')) return

  const tweetText = getPadreTweetText(popup)
  if (!tweetText) return

  const tweetId = getPadreTweetId(popup) || 'padre_' + simpleHash(tweetText)
  const btn = buildButton()
  attachClickHandler(btn, tweetId, tweetText)

  const all = popup.querySelectorAll('span[class*="MuiTypography-paragraph1"]')
  let tweetTextEl = null
  for (const el of all) {
    if (el.innerText.trim() === tweetText) {
      tweetTextEl = el
      break
    }
  }

  if (tweetTextEl) {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 4px 0 8px;'
    wrapper.appendChild(btn)
    tweetTextEl.parentElement.insertBefore(wrapper, tweetTextEl)
  }
}

function injectSpinStyle() {
  if (document.getElementById('fc-terminal-styles')) return
  const style = document.createElement('style')
  style.id = 'fc-terminal-styles'
  style.textContent = `
    @keyframes fcTermSpin { to { transform: rotate(360deg) } }
    @keyframes fcSlideIn { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  `
  document.head.appendChild(style)
}

function scanForPopups() {
  document.querySelectorAll('div.pointer-events-auto.fixed').forEach(popup => {
    if (popup.querySelector('span.text-\\[18px\\]')) injectFastCheckButton(popup)
  })

  document.querySelectorAll('.padre-no-scroll').forEach(popup => {
    if (popup.querySelector('a[href*="x.com"][href*="/status/"]') &&
        popup.querySelector('span[class*="MuiTypography-paragraph1"]')) {
      injectPadreButton(popup)
    }
  })

  document.querySelectorAll('div.pi-tooltip-container, div[id="_r_ds_"]').forEach(popup => {
    if (popup.querySelector('span.font-mono') || popup.querySelector('[data-sentry-component="CollapsibleText"]')) {
      injectGmgnButton(popup)
    }
  })
}

function getGmgnTweetText(popup) {
  const el = popup.querySelector('span.font-mono')
  if (el) return el.innerText.trim()
  const el2 = popup.querySelector('[data-sentry-component="CollapsibleText"]')
  return el2 ? el2.innerText.trim() : ''
}

function getGmgnTweetId(popup) {
  const links = popup.querySelectorAll('a[href*="/status/"]')
  for (const link of links) {
    const match = link.href.match(/\/status\/(\d+)/)
    if (match) return match[1]
  }
  return null
}

function injectGmgnButton(popup) {
  if (popup.querySelector('.fc-terminal-btn')) return

  const tweetText = getGmgnTweetText(popup)
  if (!tweetText) return

  const tweetId = getGmgnTweetId(popup) || 'gmgn_' + simpleHash(tweetText)
  const btn = buildButton()
  btn.style.width = '100%'
  btn.style.margin = '8px 0 4px'

  attachClickHandler(btn, tweetId, tweetText)

  const textEl = popup.querySelector('span.font-mono') ||
                 popup.querySelector('[data-sentry-component="CollapsibleText"]')

  if (textEl) {
    const target = textEl.parentElement.parentElement
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 0 14px; width: 100%; box-sizing: border-box;'
    wrapper.appendChild(btn)
    target.parentElement.insertBefore(wrapper, target)
    return
  }

  const readMore = popup.querySelector('a[href*="/status/"] div')
  if (readMore?.innerText?.includes('Read more')) {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 8px 14px 4px; background: transparent;'
    wrapper.appendChild(btn)
    readMore.closest('a').parentElement.insertBefore(wrapper, readMore.closest('a'))
    return
  }

  const divider = [...popup.querySelectorAll('div.h-\\[1px\\]')].pop()
  if (divider) {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'padding: 0 14px 8px; background: transparent;'
    wrapper.appendChild(btn)
    divider.after(wrapper)
  }
}

injectSpinStyle()
getOrCreateFloatingPanel()
const observer = new MutationObserver(scanForPopups)
observer.observe(document.body, { childList: true, subtree: true })
scanForPopups()