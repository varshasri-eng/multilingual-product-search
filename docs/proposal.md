# Store2Home — MVP Design Proposal

**Prepared by:** Pavan Reddy
**Date:** July 18, 2026
**Version:** 1.0
**Project:** Store2Home — Local Delivery Platform

---

## 1. Executive Summary

Store2Home is a new business unit focused on local delivery of fresh flowers,
leaves, and groceries to residents of Lathrop and Mountain House, CA. Products
are sourced from local vendors and delivered same-day or on a scheduled slot.

The MVP delivers two portals on a single platform:

- **Admin Portal** — for the store operator to manage products, inventory, orders, vendors, and customers
- **Public Portal** — for customers to browse, search, and order with a phone-first experience

**Tech Stack: React + Flask + PostgreSQL, running on Docker.**

---

## 2. Business Context

| Item | Detail |
|------|--------|
| Business Unit | Store2Home (separate from DeliveryHub) |
| Service Area | Lathrop, CA (95330) and Mountain House, CA (95391) |
| Product Focus | Fresh flowers, leaves, groceries |
| Supply Model | Sourced from local vendors and stores |
| Payment Methods | Cash and Zelle only |
| Customer Base | Indian diaspora community in Lathrop and Mountain House |
| Communication | WhatsApp-first for order updates and notifications |

---

## 3. MVP Scope

The MVP covers the following modules:

| Module | Description |
|--------|-------------|
| Customers | Registration, phone OTP login, profiles, addresses |
| Products | Catalog with categories, regional names, images |
| Categories | Flowers, Leaves, Grocery and sub-categories |
| Inventory | Stock tracking per product with reorder alerts |
| Orders | Place, track, and manage orders |
| Payments | Cash and Zelle payment recording |
| Notifications | WhatsApp and SMS alerts for order status |
| Vendors | Manage local suppliers |
| Delivery Zones | Restrict orders to Lathrop and Mountain House only |
| Search | Product search with regional name support |
| Recommendations | Based on browse and search history |

---

## 4. Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   React Admin       │     │   React Public      │
│   (Admin Portal)    │     │   (Customer Portal) │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           └──────────┬────────────────┘
                      │ HTTP / REST API
           ┌──────────┴──────────┐
           │    Flask Backend    │
           │    (Python API)     │
           └──────────┬──────────┘
                      │ SQLAlchemy ORM
           ┌──────────┴──────────┐
           │     PostgreSQL      │
           │   (Docker Volume)   │
           └─────────────────────┘
```

- React Admin and React Public are two separate route groups in one React app
- Flask serves all REST API endpoints for both portals
- PostgreSQL runs in Docker with local volume storage (portable, no data loss on restart)
- pgAdmin available at http://localhost:5051 for database management

---

## 5. Database Schema

### 5.1 Tables Overview

| # | Table | Purpose |
|---|-------|---------|
| 1 | delivery_zones | Valid delivery areas — Lathrop and Mountain House |
| 2 | vendors | Local stores and suppliers |
| 3 | categories | Product groupings (Flowers, Leaves, Grocery) |
| 4 | products | Full catalog with Telugu, Hindi, Tamil regional names |
| 5 | inventory | Stock per product, reorder level alerts |
| 6 | customers | Customer profiles, phone-first, language preference |
| 7 | addresses | Multiple addresses per customer, zone-validated |
| 8 | otp_verifications | Phone OTP codes for login |
| 9 | sessions | Active login sessions |
| 10 | orders | Order header with status, schedule, totals |
| 11 | order_items | Line items with product snapshot |
| 12 | payments | Cash or Zelle, linked to order |
| 13 | notifications | WhatsApp/SMS order alerts |
| 14 | customer_product_views | Browse tracking for recommendations |
| 15 | customer_search_history | Search tracking for improvements |

### 5.2 ER Diagram Summary

```
delivery_zones
    └── addresses (zone validation)
    └── orders (zone tracking)

vendors
    └── products

categories
    └── products
            └── inventory          (1-to-1)
            └── order_items        (1-to-many)
            └── customer_product_views

customers
    ├── addresses                  (1-to-many)
    ├── sessions                   (1-to-many)
    ├── orders                     (1-to-many)
    │       ├── order_items        (1-to-many)
    │       └── payments           (1-to-1)
    ├── notifications              (1-to-many)
    └── customer_search_history    (1-to-many)
```

### 5.3 Key Design Decisions

**Delivery zones as a table** — New cities added by inserting a row,
no code change needed.

**Inventory separate from products** — Stock updates frequently.
Keeping it separate keeps the product record clean.

**Cash and Zelle only** — No payment gateway complexity in MVP.
Matches how this community pays today.

**Product name snapshot on order items** — Historical orders remain
accurate even if product names change later.

**Order number auto-generated** — Format S2H-10001, generated by
a PostgreSQL trigger. No application logic needed.

**Phone-first authentication** — OTP to phone, no passwords.
Matches real customer behavior observed in order history.

---

## 6. Customer Workflows

### 6.1 New Customer (Guest → Registered)

```
1. Visit site (guest)
2. Browse products and categories
3. Add items to cart
4. Proceed to checkout
5. Enter phone number → receive OTP via WhatsApp
6. Verify OTP → account created automatically
7. Enter name, address, language preference
8. Select delivery date and time slot
9. Choose payment method (Cash / Zelle)
10. Place order → receive WhatsApp confirmation
11. Track order status
12. Receive delivery notification
```

### 6.2 Returning Customer

```
1. Visit site
2. Enter phone number → OTP → logged in
3. Profile and address pre-filled
4. Browse or search (recommendations shown based on history)
5. Add to cart → checkout (all details pre-filled)
6. Confirm and place order
```

### 6.3 Order Status Flow

```
pending → confirmed → processing → out_for_delivery → delivered
                                                    → cancelled (any stage)
```

Each status change triggers a WhatsApp notification to the customer.

---

## 7. Admin Portal

**URL: /admin (protected, role = admin)**

| Page | What It Does |
|------|-------------|
| Dashboard | Today's orders, revenue, low stock alerts, recent activity |
| Orders | All orders, filter by status/date/zone, update order status |
| Products | Add, edit, delete products, toggle visibility |
| Categories | Manage product categories |
| Inventory | View and update stock levels, see reorder alerts |
| Vendors | Add and manage local suppliers |
| Customers | View profiles, order history, contact via WhatsApp |
| Notifications | View sent and pending notifications |
| Reports | Sales by date, top products, zone-wise orders |

---

## 8. Public Portal

**URL: / (open to all, login required for checkout)**

| Page | URL | What It Does |
|------|-----|-------------|
| Home | / | Featured products, categories, search bar |
| Search | /search | Search by name, regional name, category |
| Category | /category/:slug | Products filtered by category |
| Product Detail | /product/:slug | Name, price, stock, add to cart |
| Cart | /cart | Items, quantities, delivery fee, total |
| Checkout | /checkout | Address, time slot, payment method |
| Login / Register | /login | Phone OTP login, auto-register on first OTP |
| My Account | /account | Profile, language preference, saved addresses |
| Order History | /account/orders | Past orders with status and reorder button |

---

## 9. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React.js | Component-based, single codebase for admin and public |
| Styling | Tailwind CSS | Fast to build, responsive by default |
| Backend | Flask (Python) | Lightweight, easy to extend, SQLAlchemy ORM |
| Database | PostgreSQL 16 | Reliable, supports full-text and fuzzy search |
| ORM | SQLAlchemy | Clean database interaction from Flask |
| Containerization | Docker + Docker Compose | Portable — one command to run everything |
| Auth | Phone OTP | No passwords, WhatsApp delivery |
| Notifications | WhatsApp Business API / Twilio | Primary channel for this community |
| Local Storage | Docker named volume (./pgdata) | Data persists on machine, no cloud dependency |

---

## 10. User Data Collection

### At Registration

| Field | Required | Purpose |
|-------|----------|---------|
| Full name | Yes | Order label |
| Phone number | Yes | OTP login, primary contact |
| WhatsApp number | Yes | Order notifications |
| ZIP code | Yes | Validate delivery zone (Lathrop/Mountain House only) |
| Preferred language | Yes | Telugu, Hindi, Tamil, English |
| Email | No | Optional, for receipts |

### At Checkout

| Field | Required | Purpose |
|-------|----------|---------|
| Full address | Yes (delivery) | Shipping |
| Delivery date | Yes | Schedule |
| Time slot | Yes | Morning 9–12 / Evening 4–7 |
| Delivery notes | No | Gate code, apartment number |
| Payment method | Yes | Cash or Zelle |

---

## 11. Local Testing Setup

```bash
# Clone and start
git clone <repo>
cd store2home
cp .env.example .env

docker compose up -d

# Services running:
# PostgreSQL  → localhost:5433
# pgAdmin     → http://localhost:5051
# Flask API   → http://localhost:5000
# React App   → http://localhost:3000
```

Database schema loads automatically on first startup.
pgAdmin connects at http://localhost:5051 with credentials in .env.

---

## 12. Testing Plan

### Unit Tests
- CRUD operations for all 15 tables
- Flask API endpoint validation
- Inventory deduction on order placement
- Payment recording (Cash / Zelle)
- OTP generation and expiry
- Delivery zone validation (reject non-Lathrop/Mountain House)
- Notification trigger on order status change

### Integration Tests
- End-to-end customer workflow: browse → cart → OTP → checkout → order
- End-to-end admin workflow: receive order → confirm → mark delivered
- Returning customer: login → prefilled checkout → reorder
- Zero-stock product blocked from checkout

---

## 13. Development Timeline

| Sprint | Days | Focus | Deliverables |
|--------|------|-------|-------------|
| 1 | 1–2 | Infrastructure + Database | Docker setup, schema.sql, ER diagram ✅ |
| 2 | 3–4 | Flask API — core | Customer, product, category, inventory endpoints |
| 3 | 5–6 | Flask API — orders | Cart, checkout, order, payment endpoints |
| 4 | 7–8 | Public Portal | Home, search, product, cart, checkout pages |
| 5 | 9–10 | Auth + Account | OTP login, profile, address, order history |
| 6 | 11–12 | Admin Portal | Dashboard, orders, products, inventory, customers |
| 7 | 13–14 | Notifications + Polish | WhatsApp alerts, recommendations, QA |
| 8 | 15 | Demo | End-to-end demo, documentation, beta rollout |

---

## 14. Current Progress

| Item | Status |
|------|--------|
| Project folder structure | ✅ Done |
| Docker Compose (PostgreSQL + Flask + React + pgAdmin) | ✅ Done |
| Database schema — all 15 tables | ✅ Done |
| ER diagram | ✅ Done |
| Delivery zones seeded (Lathrop + Mountain House) | ✅ Done |
| Flask backend | 🔲 Sprint 2 |
| Public portal (React) | 🔲 Sprint 4 |
| Admin portal (React) | 🔲 Sprint 6 |
| Notifications | 🔲 Sprint 7 |

---

## 15. Project Folder Structure

```
store2home/
├── docker-compose.yml       ← all 4 services
├── .env                     ← credentials (not in git)
├── .env.example             ← template for teammates
├── .gitignore
├── db/
│   └── schema.sql           ← all 15 tables, triggers, sequences
├── docs/
│   ├── er-diagram.md        ← ER diagram and design decisions
│   └── proposal.md          ← this document
├── backend/                 ← Flask API (Sprint 2)
└── frontend/                ← React app (Sprint 4)
```

---

*End of Proposal — Store2Home MVP v1.0*
