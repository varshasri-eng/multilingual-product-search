import api from "../api/client";

/**
 * Turns a relative path like "/static/uploads/payment_qr/qr_current.png?v=..."
 * (as returned by the backend for QR codes and payment screenshots)
 * into an absolute URL against the same origin the app already uses
 * for every other API call.
 *
 * Why this is needed: a relative <img src="/static/..."> resolves
 * against the CURRENT PAGE's origin (the Vite dev server / whatever
 * serves the frontend), not the API's origin. Locally that's usually
 * the same host on a different port, and on a VPS it's often a
 * completely different port too (e.g. frontend :4001, backend :5002)
 * — the browser ends up requesting /static/... from the frontend
 * server, which doesn't have that file and falls back to index.html,
 * producing a broken image.
 *
 * This reads api.defaults.baseURL directly (however it was
 * configured — env var, hardcoded, whatever) rather than
 * reimplementing that config, so there's exactly one source of truth
 * for "where is the backend". It also self-corrects once a reverse
 * proxy unifies frontend/backend under one origin in the future:
 * at that point baseURL becomes relative (e.g. "/api"), stripping
 * "/api" yields "", and the path is returned as-is — which is
 * correct, since the page origin IS the right origin once /api and
 * /static are proxied together.
 */
export function resolveMediaUrl(path) {
  if (!path) return path;

  // Already absolute — e.g. an admin pasted an externally-hosted QR
  // URL via Payment Settings' "Advanced" option. Leave it alone.
  if (/^https?:\/\//i.test(path)) return path;

  const base = api.defaults.baseURL || "";
  // baseURL is typically ".../api" — /static is served at the API's
  // root, not under /api, so strip a trailing "/api" (with or
  // without a trailing slash) to get just the origin.
  const origin = base.replace(/\/?api\/?$/i, "").replace(/\/$/, "");

  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}