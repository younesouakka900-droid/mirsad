export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, lang } = req.query;
  if (!q || !lang) return res.status(400).json({ error: 'Missing parameters' });

  const queries = q.split('|').slice(0, 2); // max 2 sub-queries
  const mainQ   = queries[0].trim();

  // Language map for APIs that need locale codes
  const localeMap = { ar: 'ar', fr: 'fr', en: 'en' };
  const locale    = localeMap[lang] || 'en';

  // ── Fetchers ──────────────────────────────────────────

  async function fromGNews(query) {
    const key = process.env.GNEWS_API_KEY;
    if (!key) return [];
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=${locale}&max=10&apikey=${key}`;
    const d = await fetch(url).then(r => r.json()).catch(() => ({}));
    return (d.articles || []).map(a => normalize(a, 'gnews'));
  }

  async function fromNewsAPI(query) {
    const key = process.env.NEWSAPI_KEY;
    if (!key) return [];
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=${locale}&pageSize=20&sortBy=publishedAt&apiKey=${key}`;
    const d = await fetch(url).then(r => r.json()).catch(() => ({}));
    return (d.articles || []).map(a => normalize(a, 'newsapi'));
  }

  async function fromCurrents(query) {
    const key = process.env.CURRENTS_KEY;
    if (!key) return [];
    const url = `https://api.currentsapi.services/v1/search?keywords=${encodeURIComponent(query)}&language=${locale}&apiKey=${key}`;
    const d = await fetch(url).then(r => r.json()).catch(() => ({}));
    return (d.news || []).map(a => normalize(a, 'currents'));
  }

  async function fromTheNewsAPI(query) {
    const key = process.env.THENEWSAPI_KEY;
    if (!key) return [];
    const url = `https://api.thenewsapi.com/v1/news/all?search=${encodeURIComponent(query)}&language=${locale}&limit=10&api_token=${key}`;
    const d = await fetch(url).then(r => r.json()).catch(() => ({}));
    return (d.data || []).map(a => normalize(a, 'thenewsapi'));
  }

  async function fromMediaStack(query) {
    const key = process.env.MEDIASTACK_KEY;
    if (!key) return [];
    const url = `http://api.mediastack.com/v1/news?access_key=${key}&keywords=${encodeURIComponent(query)}&languages=${locale}&limit=25&sort=published_desc`;
    const d = await fetch(url).then(r => r.json()).catch(() => ({}));
    return (d.data || []).map(a => normalize(a, 'mediastack'));
  }

  // ── Normalize to common format ─────────────────────────
  function normalize(a, src) {
    switch(src) {
      case 'gnews':
        return { title: a.title, description: a.description, url: a.url, image: a.image, publishedAt: a.publishedAt, source: { name: a.source?.name || 'GNews' } };
      case 'newsapi':
        return { title: a.title, description: a.description, url: a.url, image: a.urlToImage, publishedAt: a.publishedAt, source: { name: a.source?.name || 'NewsAPI' } };
      case 'currents':
        return { title: a.title, description: a.description, url: a.url, image: a.image, publishedAt: a.published, source: { name: (a.author || 'Currents') } };
      case 'thenewsapi':
        return { title: a.title, description: a.description, url: a.url, image: a.image_url, publishedAt: a.published_at, source: { name: a.source || 'TheNewsAPI' } };
      case 'mediastack':
        return { title: a.title, description: a.description, url: a.url, image: a.image, publishedAt: a.published_at, source: { name: a.source || 'MediaStack' } };
      default:
        return a;
    }
  }

  try {
    // Run all APIs in parallel
    const allResults = await Promise.all([
      fromGNews(mainQ),
      fromNewsAPI(mainQ),
      fromCurrents(mainQ),
      fromTheNewsAPI(mainQ),
      fromMediaStack(mainQ),
      // Second query if provided
      queries[1] ? fromGNews(queries[1].trim()) : Promise.resolve([]),
      queries[1] ? fromNewsAPI(queries[1].trim()) : Promise.resolve([]),
    ]);

    // Merge, deduplicate by URL, filter nulls
    const seen = new Set();
    const articles = allResults.flat().filter(a => {
      if (!a || !a.url || !a.title) return false;
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    // Sort newest first
    articles.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json({ articles, totalArticles: articles.length });

  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch news', detail: err.message });
  }
}
