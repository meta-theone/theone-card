// theone-card Worker - clean path routing
// /{org}          -> 회원 안내 페이지 (guide)
// /{org}/join     -> 명함 만들기 폼 (join_code auto-injected)
// /{org}/{member} -> 명함 보기 (viewer)
// /admin , /v/?... , /new/?... , /guide/?... , / (hub) -> 기존대로
const SB_URL = 'https://tynqmbmwvrkjzscvrree.supabase.co';
const SB_KEY = 'sb_publishable_4XgU_L-7zywgwRfkxtf4tQ_jMkE2Uku';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const segs = url.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    const last = segs.length ? segs[segs.length - 1] : '';
    const hasDot = last.includes('.');

    if (segs.length === 0 || hasDot || segs[0] === 'v' || segs[0] === 'new' || segs[0] === 'assets' || segs[0] === 'guide') {
      return env.ASSETS.fetch(request);
    }
    if (segs[0] === 'admin') {
      return env.ASSETS.fetch(new Request(url.origin + '/admin/index.html'));
    }
    // 명함 보기: /{org}/{member}  (member != 'join')
    if (segs.length >= 2 && segs[1] !== 'join') {
      const q = '?o=' + encodeURIComponent(segs[0]) + '&m=' + encodeURIComponent(segs[1]);
      return serveInjected(env, url.origin, '/v/index.html', q);
    }
    // 안내(/{org}) 와 폼(/{org}/join) 은 가입코드가 필요
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
    if (segs.length >= 2 && segs[1] === 'join') {
      return serveInjected(env, url.origin, '/new/index.html', q);
    }
    return serveInjected(env, url.origin, '/guide/index.html', q);
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
