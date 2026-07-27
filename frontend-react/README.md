# Store2Home — Public Portal (Product Details Page)

React version of the product details page, matching the stack from the
Store2Home SDD (React, React Router, Material UI, Axios). Wires up both
APIs from `backend/server.js`.

## Setup

```powershell
cd frontend-react
npm install
copy .env.example .env
```

`.env` just needs `VITE_API_BASE_URL=http://localhost:3001` (already the
default in `.env.example` — only edit it if your backend runs elsewhere).

## Run

Make sure the backend from the previous deliverable is already running
(`cd backend && npm start`), then in a separate terminal:

```powershell
npm run dev
```

Opens at `http://localhost:5173`, defaulting to product 1. Visit
`http://localhost:5173/products/8` for a specific product (e.g. Gongura
Pickle).

## What's built

- **`src/pages/ProductDetailsPage.jsx`** — the actual deliverable. Loads
  product details on mount, loads related products, and wires the search
  bar to the keyword-search API. Handles loading and error states.
- **`src/components/ProductInfo.jsx`** — product name, price, stock,
  description, category/subcategory.
- **`src/components/AliasChips.jsx`** — the "Also known as" chip row,
  pulling real `search_terms` aliases from the API. This is the one
  visual element that's specifically designed around the project's core
  idea (one product, many valid names) rather than being generic UI.
- **`src/components/RelatedProducts.jsx`** — reused for both the product
  page's related-products section and the search results grid, each card
  tagged `history` or `category` depending on which signal found it.
- **`src/components/SearchBar.jsx`** — the search button, wired to
  `GET /api/related?keyword=`.
- **`src/api.js`** — Axios wrapper for both endpoints, plus the same
  anonymous session-id logic as the earlier static prototype.

## Verification note

I don't have a live browser/npm environment in this sandbox to actually
run `npm install` and click through it, so **you should do a first
`npm run dev` smoke test yourself** before showing this to your mentor.
What I did verify: every `.jsx`/`.js` file passes a real esbuild syntax
transform (catches actual syntax errors, not just a visual read-through)
— so if something's wrong, it's more likely a missing-package or runtime
issue than a typo in the code itself.

## Known gaps

- Same as the static prototype: no real product images yet (`image_url`
  is returned by the API but not rendered as an `<img>`), no pagination,
  no auth.
- Single route (`/products/:id`) — homepage, cart, and checkout from the
  DeliveryHub proposal's page list aren't built yet; this is scoped to
  exactly what was assigned (product details page).
