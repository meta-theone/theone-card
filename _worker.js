// theone-card Worker - clean path routing + legacy query compatibility
// /{org}          -> create card form (join_code auto-injected)
// /{org}/{member} -> view card
// /admin , /v/?... , /new/?... , / (hub) -> served as before
const SB_URL = 'https://tynqmbmwvrkjzscvrree.supabase.co';
const SB_KEY = 'sb_publishable_4XgU_L-7zywgwRfkxtf4tQ_jMkE2Uku';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const segs = url.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const last = segs.length ? segs[segs.length - 1] : '';
    const hasDot = last.includes('.');

    if (segs.length === 0 || hasDot || segs[0] === 'v' || segs[0] === 'new' || segs[0] === 'assets') {
      return env.ASSETS.fetch(request);
    }

    if (segs[0] === 'admin') {
      return env.ASSETS.fetch(new Request(url.origin + '/admin/index.html'));
    }

    if (segs.length >= 2) {
      const q = '?o=' + encodeURIComponent(segs[0]) + '&m=' + encodeURIComponent(segs[1]);
      return serveInjected(env, url.origin, '/v/index.html', q);
    }

    const org = segs[0];
    let code = '';
    try {
      const r = await fetch(SB_URL + '/rest/v1/organizations?slug=eq.' + encodeURIComponent(org) + '&select=join_code', {
        headers: { apikey: SB_KEY, authorization: 'Bearer ' + SB_KEY }
      });
      const j = await r.json();
      if (Array.isArray(j) && j[0] && j[0].join_code) code = j[0].join_code;
    } catch (e) {}
    const q = '?o=' + encodeURIComponent(org) + (code ? '&code=' + encodeURIComponent(code) : '');
    return serveInjected(env, url.origin, '/new/index.html', q);
  }
};

async function serveInjected(env, origin, assetPath, query) {
  const res = await env.ASSETS.fetch(new Request(origin + assetPath));
  if (!res.ok) return res;
  let html = await res.text();
  html = html.split('location.search').join(JSON.stringify(query));
  return new Response(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}
