/**
 * Cloudflare Pages middleware: password gate + no-indexing.
 * - Every response carries X-Robots-Tag: noindex — nothing gets crawled.
 * - Unauthenticated requests get a deliberately generic gate page: no logo,
 *   no product or organisation name, nothing to identify what sits behind it.
 * - The password sets an HttpOnly cookie for 30 days.
 */
const PASSWORD = 'Design@2026'
const COOKIE = 'pv_auth'
const SALT = 'qfd-preview-2026'

async function token(): Promise<string> {
  const data = new TextEncoder().encode(PASSWORD + SALT)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const GATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Private preview</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { min-height: 100dvh; display: flex; align-items: center; justify-content: center;
         background: #101314; color: #e8e6e1; font-family: ui-sans-serif, system-ui, sans-serif; }
  form { width: min(360px, 90vw); text-align: center; }
  h1 { font-size: 17px; font-weight: 600; letter-spacing: 0.01em; }
  p  { margin-top: 10px; font-size: 13.5px; color: #9aa09e; line-height: 1.5; }
  input { margin-top: 24px; width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1px solid #33393a; background: #1a1e1f; color: #e8e6e1; font-size: 14px; outline: none; }
  input:focus { border-color: #5a6462; }
  button { margin-top: 12px; width: 100%; padding: 12px; border: 0; border-radius: 10px;
           background: #e8e6e1; color: #101314; font-size: 14px; font-weight: 600; cursor: pointer; }
  .err { margin-top: 12px; font-size: 12.5px; color: #c98484; }
</style>
</head>
<body>
<form method="POST">
  <h1>Private preview</h1>
  <p>This environment is restricted. Enter the access password to continue.</p>
  <input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password" />
  <button type="submit">Continue</button>
  {{ERROR}}
</form>
</body>
</html>`

export const onRequest: PagesFunction = async (context) => {
  const { request, next } = context
  const url = new URL(request.url)
  const expected = await token()

  // robots.txt always answers, unauthenticated
  if (url.pathname === '/robots.txt') {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'content-type': 'text/plain', 'x-robots-tag': 'noindex, nofollow' },
    })
  }

  const cookies = request.headers.get('cookie') ?? ''
  const authed = cookies.split(/;\s*/).some((c) => c === `${COOKIE}=${expected}`)

  if (!authed && request.method === 'POST') {
    const form = await request.formData().catch(() => null)
    const pw = form?.get('password')
    if (pw === PASSWORD) {
      return new Response(null, {
        status: 302,
        headers: {
          location: url.pathname,
          'set-cookie': `${COOKIE}=${expected}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
          'x-robots-tag': 'noindex, nofollow',
        },
      })
    }
    return new Response(GATE.replace('{{ERROR}}', '<div class="err">That password is not correct.</div>'), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' },
    })
  }

  if (!authed) {
    return new Response(GATE.replace('{{ERROR}}', ''), {
      status: 401,
      headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' },
    })
  }

  const res = await next()
  const out = new Response(res.body, res)
  out.headers.set('x-robots-tag', 'noindex, nofollow')
  return out
}
