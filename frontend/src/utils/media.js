/**
 * Resolves a relative media path (e.g. "/static/uploads/payment_qr/qr_current.png?v=...")
 * for use as an <img src>/<a href>.
 *
 * As of the /static proxy added to vite.config.js, relative paths
 * already resolve correctly against the dev server (which proxies
 * both /api and /static to the same backend) — so this is currently
 * a pass-through. It's kept as a single function, rather than using
 * the raw path directly everywhere it's rendered, so that IF a future
 * production setup (e.g. before an nginx reverse proxy unifying
 * frontend/backend under one origin exists) needs different handling
 * again, there's exactly one place to change it instead of hunting
 * down every <img>/<a> that renders a QR code or payment screenshot.
 */
export function resolveMediaUrl(path) {
  if (!path) return path;

  // Already absolute — e.g. an admin pasted an externally-hosted QR
  // URL via Payment Settings' "Advanced" option. Leave it alone.
  if (/^https?:\/\//i.test(path)) return path;

  return path;
}