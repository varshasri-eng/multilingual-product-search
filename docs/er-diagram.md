# ER Diagram — Store2Home MVP
**Local Delivery | Lathrop & Mountain House, CA**
**Stack: React + Flask + PostgreSQL**

---

## Entity Relationship Diagram

```
┌──────────────────┐
│  delivery_zones  │
├──────────────────┤
│ PK id            │
│    city          │
│    zip_code      │
│    delivery_fee  │
│    is_active     │
└────────┬─────────┘
         │ 1
         │ referenced by addresses & orders
         │ N
┌────────┴─────────┐         ┌──────────────────┐
│    addresses     │         │     vendors      │
├──────────────────┤         ├──────────────────┤
│ PK id            │         │ PK id            │
│ FK customer_id   │         │    name          │
│ FK delivery_zone │         │    phone         │
│    label         │         │    city          │
│    address_line1 │         │    is_active     │
│    city          │         └────────┬─────────┘
│    zip_code      │                  │ 1
│    delivery_notes│                  │ supplies
│    is_default    │                  │ N
└────────┬─────────┘         ┌────────┴─────────┐
         │ N                 │    categories    │
         │                   ├──────────────────┤
┌────────┴─────────┐         │ PK id            │
│    customers     │         │    name          │
├──────────────────┤         │    slug          │
│ PK id            │         │    is_active     │
│    name          │         └────────┬─────────┘
│    phone         │                  │ 1
│    whatsapp      │                  │
│    email         │                  │ N
│    pref_language │         ┌────────┴─────────┐
│    role          │         │     products     │
│    is_verified   │         ├──────────────────┤
└──┬───┬───┬───┬───┘         │ PK id            │
   │   │   │   │             │ FK category_id   │
   │   │   │   │             │ FK vendor_id     │
   │   │   │   │             │    name          │
   │   │   │   │             │    name_telugu   │
   │   │   │   │             │    name_hindi    │
   │   │   │   │             │    name_tamil    │
   │   │   │   │             │    price         │
   │   │   │   │             │    disc_price    │
   │   │   │   │             │    unit          │
   │   │   │   │             │    is_active     │
   │   │   │   │             └──┬───────────────┘
   │   │   │   │                │ 1
   │   │   │   │                ├──────────────────────┐
   │   │   │   │                │ 1                    │ 1
   │   │   │   │         ┌──────┴──────┐    ┌──────────┴──────────┐
   │   │   │   │         │  inventory  │    │ customer_product_   │
   │   │   │   │         ├─────────────┤    │      views          │
   │   │   │   │         │ PK id       │    ├─────────────────────┤
   │   │   │   │         │ FK product  │    │ PK id               │
   │   │   │   │         │ qty_avail   │    │ FK customer_id      │
   │   │   │   │         │ qty_reserved│    │ FK product_id       │
   │   │   │   │         │ reorder_lvl │    │    viewed_at        │
   │   │   │   │         └─────────────┘    └─────────────────────┘
   │   │   │   │
   │   │   │   └──── otp_verifications
   │   │   │         sessions
   │   │   │
   │   │   └──── customer_search_history
   │   │         ├─ customer_id
   │   │         ├─ query
   │   │         └─ results_count
   │   │
   │   └──── notifications
   │         ├─ FK customer_id
   │         ├─ FK order_id
   │         ├─ type (order_placed|confirmed|delivered)
   │         ├─ channel (whatsapp|sms)
   │         └─ is_sent
   │
   └──── orders
         ├─ PK id
         ├─ FK customer_id
         ├─ FK address_id
         ├─ FK delivery_zone_id
         │    order_number (S2H-10001)
         │    order_type (delivery|pickup)
         │    status
         │    subtotal / delivery_fee / total
         │    requested_date / time_slot
         │
         ├── order_items
         │   ├─ FK order_id
         │   ├─ FK product_id
         │   ├─ product_name (snapshot)
         │   ├─ quantity
         │   └─ line_total
         │
         └── payments
             ├─ FK order_id
             ├─ payment_method (cash|zelle)
             ├─ amount
             ├─ status
             └─ transaction_ref
```

---

## Table Summary

| # | Table | Purpose |
|---|-------|---------|
| 1 | delivery_zones | Lathrop and Mountain House — only valid delivery areas |
| 2 | vendors | Local stores/suppliers that provide products |
| 3 | categories | Product groupings: Flowers, Leaves, Grocery |
| 4 | products | Full catalog with regional names (Telugu, Hindi, Tamil) |
| 5 | inventory | Stock levels per product, reorder alerts |
| 6 | customers | Customer profiles, phone-first, language preference |
| 7 | addresses | Multiple addresses per customer, linked to delivery zone |
| 8 | otp_verifications | Phone OTP login — no passwords |
| 9 | sessions | Active login sessions per customer |
| 10 | orders | Order header with status, schedule, totals |
| 11 | order_items | Line items per order (product snapshot) |
| 12 | payments | Cash or Zelle, linked to order |
| 13 | notifications | WhatsApp/SMS alerts for order updates |
| 14 | customer_product_views | What each customer browses (feeds recommendations) |
| 15 | customer_search_history | What each customer searches (improves results) |

---

## Key Relationships

- One **customer** has many **addresses**, many **orders**, many **notifications**
- One **order** has many **order_items** and one **payment**
- One **product** belongs to one **category** and one **vendor**
- One **product** has one **inventory** record
- **delivery_zones** restricts which addresses are valid at checkout
- **customer_product_views** and **customer_search_history** feed the recommendation engine

---

## Key Design Decisions

**1. delivery_zones as a table, not a hardcoded list**
Lathrop and Mountain House are the only zones now, but new zones can be added by inserting a row — no code change needed.

**2. inventory is separate from products**
Stock levels change constantly. Separating them means product details stay clean and inventory can be updated independently without touching the product record.

**3. payment_method is cash or zelle only**
No Stripe, no credit card processing complexity in MVP. Keeps the system simple and matches how this community actually pays.

**4. product_name snapshot on order_items**
If a product name changes later, old orders still show the correct name at time of purchase.

**5. order_number auto-generated as S2H-10001**
Human-readable, store-branded, sequential. Generated by a PostgreSQL trigger — no application logic needed.

**6. phone-first auth**
No password table. OTP sent to phone, verified, session token issued. Matches how this customer base operates — every real DeliveryHub order had a phone number, not all had email.
