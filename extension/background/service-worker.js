const API_URL = 'https://fastcheck-api-production.up.railway.app/api'

async function getToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (res) => resolve(res.authToken))
  })
}

async function verifyToken(token) {
  const res = await fetch(`${API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ token })
  })
  return res.json()
}

async function runFactCheck(tweetId, tweetText, token) {
  const res = await fetch(`${API_URL}/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ tweetId, tweetText, token })
  })
  return res.json()
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'VERIFY_TOKEN') {
    verifyToken(msg.token)
      .then(sendResponse)
      .catch(() => sendResponse({ valid: false }))
    return true
  }

  if (msg.type === 'FACT_CHECK') {
    getToken().then(token => {
      if (!token) return sendResponse({ error: 'not_authenticated' })
      runFactCheck(msg.tweetId, msg.tweetText, token)
        .then(sendResponse)
        .catch(() => sendResponse({ error: 'request_failed' }))
    })
    return true
  }

  if (msg.type === 'GET_AUTH') {
    getToken().then(token => sendResponse({ token }))
    return true
  }
})