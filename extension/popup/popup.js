const views = {
  onboarding: document.getElementById('view-onboarding'),
  main: document.getElementById('view-main')
}

function showView(name) {
  Object.values(views).forEach(v => v.classList.add('hidden'))
  views[name].classList.remove('hidden')
}

async function init() {
  const { authToken, timelineEnabled } = await chrome.storage.local.get(['authToken', 'timelineEnabled'])

  if (!authToken) {
    showView('onboarding')
    return
  }

  const res = await chrome.runtime.sendMessage({ type: 'VERIFY_TOKEN', token: authToken }).catch(() => null)

  if (!res?.valid) {
    showView('onboarding')
    return
  }

  const plan = res.plan || 'free'
  const limits = { free: 5, basic: 100, pro: 300 }
  const limit = limits[plan] || 5
  const planLabels = {
    free: 'Free — 5/day',
    basic: 'Basic — 100/day',
    pro: 'Pro — 300/day'
  }

  document.getElementById('plan-badge').textContent = plan.charAt(0).toUpperCase() + plan.slice(1)
  document.getElementById('plan-badge').className = `plan-badge ${plan}`
  document.getElementById('stat-plan').textContent = planLabels[plan]

  const checksRow = document.getElementById('checks-row')
  if (plan === 'pro') {
    checksRow.style.display = 'none'
  } else {
    checksRow.style.display = ''
    document.getElementById('stat-checks').textContent = `${res.checksToday ?? '?'} / ${limit}`
  }

  const toggle = document.getElementById('timeline-toggle')
  toggle.checked = timelineEnabled !== false

  showView('main')
}

document.getElementById('connect-btn').addEventListener('click', async () => {
  const token = document.getElementById('token-input').value.trim()
  if (!token) return

  const btn = document.getElementById('connect-btn')
  btn.textContent = 'Connecting...'
  btn.disabled = true

  const res = await chrome.runtime.sendMessage({ type: 'VERIFY_TOKEN', token }).catch(() => null)

  if (res?.valid) {
    await chrome.storage.local.set({ authToken: token, timelineEnabled: true })
    init()
  } else {
    btn.textContent = 'Connect'
    btn.disabled = false
    document.getElementById('token-input').style.borderColor = '#ef4444'
    setTimeout(() => document.getElementById('token-input').style.borderColor = '', 2000)
  }
})

document.getElementById('timeline-toggle').addEventListener('change', (e) => {
  chrome.storage.local.set({ timelineEnabled: e.target.checked })
})

document.getElementById('disconnect-btn').addEventListener('click', () => {
  chrome.storage.local.clear(() => showView('onboarding'))
})

init()