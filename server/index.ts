import 'dotenv/config'
import cors from 'cors'
import express from 'express'

type Result = { title: string; url: string; description: string; favicon?: string; imageUrl?: string; age?: string }
const app = express()
const port = Number(process.env.PORT || 8787)
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))

app.get('/api/health', (_request, response) => response.json({ ok: true, provider: process.env.BRAVE_SEARCH_API_KEY ? 'brave' : 'free-public-api' }))
app.get('/api/search', async (request, response) => {
  const query = typeof request.query.q === 'string' ? request.query.q.trim() : ''
  const type = request.query.type === 'images' || request.query.type === 'news' ? request.query.type : 'web'
  const page = Math.max(1, Number(request.query.page) || 1)
  const key = process.env.BRAVE_SEARCH_API_KEY
  if (!query || query.length > 300) return response.status(400).json({ error: 'Enter a search query up to 300 characters.' })
  if (!key) {
    try {
      const results = type === 'images' ? await searchWikimediaImages(query) : await searchFree(query, page)
      return response.json({ results, page, type, provider: 'free-public-api' })
    } catch { return response.status(502).json({ error: 'Free search providers could not be reached. Check your internet connection and try again.' }) }
  }
  const endpoint = `https://api.search.brave.com/res/v1/${type}/search?q=${encodeURIComponent(query)}&count=10&offset=${(page - 1) * 10}`
  try {
    const upstream = await fetch(endpoint, { headers: { Accept: 'application/json', 'X-Subscription-Token': key } })
    if (!upstream.ok) return response.status(upstream.status).json({ error: `Search provider returned ${upstream.status}.` })
    const data = await upstream.json() as { web?: { results?: Array<{ title: string; url: string; description?: string; profile?: { img?: string }; age?: string }> }; news?: { results?: Array<{ title: string; url: string; description?: string; age?: string; meta_url?: { favicon?: string } }> }; results?: Array<{ title: string; url: string; description?: string; thumbnail?: { src?: string } }> }
    const raw = type === 'web' ? data.web?.results || [] : type === 'news' ? data.news?.results || [] : data.results || []
    const results = raw.map(item => ({ title: item.title, url: item.url, description: item.description || 'Open this result to learn more.', favicon: 'profile' in item ? item.profile?.img : 'meta_url' in item ? item.meta_url?.favicon : 'thumbnail' in item ? item.thumbnail?.src : undefined, age: 'age' in item ? item.age : undefined }))
    return response.json({ results, page, type, provider: 'brave' })
  } catch { return response.status(502).json({ error: 'Could not reach the search provider.' }) }
})

async function searchDuckDuckGo(query: string, page: number): Promise<Result[]> {
  const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${(page - 1) * 30}`
  const upstream = await fetch(endpoint, { headers: { 'User-Agent': 'NovaSearch/1.0 (search prototype)' }, signal: AbortSignal.timeout(1400) })
  if (!upstream.ok) throw new Error(`DuckDuckGo returned ${upstream.status}`)
  const html = await upstream.text()
  const results: Result[] = []
  const matches = html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)
  for (const match of matches) {
    const url = decodeRedirect(match[1])
    if (!url.startsWith('http')) continue
    results.push({ title: cleanHtml(match[2]), url, description: cleanHtml(match[3]), favicon: `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico` })
    if (results.length === 10) break
  }
  return results
}

async function searchFree(query: string, page: number): Promise<Result[]> {
  try {
    const duckResults = await searchDuckDuckGo(query, page)
    if (duckResults.length) return duckResults
  } catch { /* Try Wikimedia when DuckDuckGo is unavailable. */ }

  const api = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=10&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*`
  const upstream = await fetch(api, { headers: { 'User-Agent': 'NovaSearch/1.0' } })
  if (!upstream.ok) throw new Error(`Free API returned ${upstream.status}`)
  const data = await upstream.json() as { query?: { pages?: Record<string, { title: string; fullurl?: string; extract?: string; imageinfo?: Array<{ url?: string; extmetadata?: { ImageDescription?: { value?: string } } }> }> } }
  const pages = Object.values(data.query?.pages || {})
  return pages.map(pageData => {
    const image = pageData.imageinfo?.[0]
    const url = pageData.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageData.title.replace(/ /g, '_'))}`
    return { title: pageData.title.replace(/^File:/, ''), url, description: cleanHtml(pageData.extract || image?.extmetadata?.ImageDescription?.value || 'Open this result to learn more.'), favicon: `https://icons.duckduckgo.com/ip3/${new URL(url).hostname}.ico`, imageUrl: image?.url }
  })
}

async function searchWikimediaImages(query: string): Promise<Result[]> {
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&format=json&origin=*`
  const upstream = await fetch(api, { headers: { 'User-Agent': 'NovaSearch/1.0' }, signal: AbortSignal.timeout(1800) })
  if (!upstream.ok) throw new Error(`Wikimedia returned ${upstream.status}`)
  const data = await upstream.json() as { query?: { pages?: Record<string, { title: string; fullurl?: string; imageinfo?: Array<{ url?: string; thumburl?: string; extmetadata?: { ImageDescription?: { value?: string } } }> }> } }
  return Object.values(data.query?.pages || {}).map(pageData => {
    const image = pageData.imageinfo?.[0]
    const imageUrl = image?.thumburl || image?.url
    const url = pageData.fullurl || imageUrl || 'https://commons.wikimedia.org/'
    return { title: pageData.title.replace(/^File:/, ''), url, imageUrl, description: cleanHtml(image?.extmetadata?.ImageDescription?.value || 'Open image') }
  }).filter(result => Boolean(result.imageUrl))
}

function decodeRedirect(url: string) {
  const normalized = url.startsWith('//') ? `https:${url}` : url
  try { const parsed = new URL(normalized); return parsed.searchParams.get('uddg') || normalized } catch { return normalized }
}

function cleanHtml(value: string) {
  return value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
}

app.listen(port, () => console.log(`NovaSearch server listening on http://localhost:${port}`))
