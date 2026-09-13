-- =============================================================
-- Store2Home MVP Database Schema
-- Local delivery of flowers, leaves & groceries
-- Serving Lathrop and Mountain House, CA
-- Stack: React + Flask + PostgreSQL
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- =============================================================
-- SECTION 1: DELIVERY ZONES
-- Only Lathrop and Mountain House are served
-- =============================================================

CREATE TABLE delivery_zones (
    id              SERIAL PRIMARY KEY,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(50) DEFAULT 'CA',
    zip_code        VARCHAR(10) NOT NULL UNIQUE,
    is_active       BOOLEAN DEFAULT TRUE,
    delivery_fee    NUMERIC(6,2) DEFAULT 0.00,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed delivery zones immediately
INSERT INTO delivery_zones (city, zip_code, delivery_fee) VALUES
    ('Lathrop',        '95330', 2.99),
    ('Mountain House', '95391', 3.99);

-- =============================================================
-- SECTION 2: VENDORS
-- Local stores/vendors that supply products
-- =============================================================

CREATE TABLE vendors (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    contact_name    VARCHAR(255),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    address         TEXT,
    city            VARCHAR(100),
    zip_code        VARCHAR(10),
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SECTION 3: CATEGORIES & PRODUCTS
-- =============================================================

CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    image_url       TEXT,
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id                  SERIAL PRIMARY KEY,
    category_id         INTEGER NOT NULL REFERENCES categories(id),
    vendor_id           INTEGER REFERENCES vendors(id),

    -- Names
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL UNIQUE,
    name_telugu         VARCHAR(255),       -- regional name Telugu
    name_hindi          VARCHAR(255),       -- regional name Hindi
    name_tamil          VARCHAR(255),       -- regional name Tamil

    -- Pricing
    price               NUMERIC(10,2) NOT NULL,
    discounted_price    NUMERIC(10,2),
    unit                VARCHAR(50),        -- "per bunch", "per piece", "100gm", "5ft"

    -- Details
    description         TEXT,
    image_url           TEXT,
    thumbnail_url       TEXT,
    is_active           BOOLEAN DEFAULT TRUE,
    is_featured         BOOLEAN DEFAULT FALSE,
    tags                TEXT,               -- searchable tags

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);

-- =============================================================
-- SECTION 4: INVENTORY
-- Track stock per product, updated when orders placed
-- =============================================================

CREATE TABLE inventory (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity_available  INTEGER NOT NULL DEFAULT 0,
    quantity_reserved   INTEGER NOT NULL DEFAULT 0,   -- in active carts/orders
    reorder_level       INTEGER DEFAULT 5,             -- alert when stock hits this
    last_restocked_at   TIMESTAMPTZ,
    notes               TEXT,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id)
);

CREATE INDEX idx_inventory_product ON inventory(product_id);

-- =============================================================
-- SECTION 5: CUSTOMERS
-- Phone-first, OTP login, language preference
-- =============================================================

CREATE TABLE customers (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) NOT NULL UNIQUE,
    whatsapp_number     VARCHAR(20),
    email               VARCHAR(255),
    preferred_language  VARCHAR(20) DEFAULT 'english',  -- telugu|hindi|tamil|english
    dietary_preference  VARCHAR(20) DEFAULT 'veg',      -- veg|nonveg|both
    default_order_type  VARCHAR(20) DEFAULT 'delivery', -- delivery|pickup
    role                VARCHAR(20) DEFAULT 'customer', -- customer|admin
    is_verified         BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_role  ON customers(role);

-- =============================================================
-- SECTION 6: ADDRESSES
-- Multiple addresses per customer, one default
-- Only Lathrop and Mountain House allowed
-- =============================================================

CREATE TABLE addresses (
    id                  SERIAL PRIMARY KEY,
    customer_id         INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    delivery_zone_id    INTEGER REFERENCES delivery_zones(id),
    label               VARCHAR(50) DEFAULT 'Home',    -- Home | Work | Other
    address_line1       TEXT NOT NULL,
    address_line2       TEXT,
    city                VARCHAR(100) NOT NULL,
    state               VARCHAR(50) DEFAULT 'CA',
    zip_code            VARCHAR(10) NOT NULL,
    delivery_notes      TEXT,                           -- gate code, apt number etc
    is_default          BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_customer ON addresses(customer_id);

-- =============================================================
-- SECTION 7: OTP / SESSIONS
-- Phone OTP login ΓÇö no passwords
-- =============================================================


-- =============================================================
-- SECTION 8: ORDERS
-- =============================================================

CREATE TABLE orders (
    id                  SERIAL PRIMARY KEY,
    order_number        VARCHAR(20) NOT NULL UNIQUE,    -- e.g. S2H-10001
    customer_id         INTEGER NOT NULL REFERENCES customers(id),
    address_id          INTEGER REFERENCES addresses(id),
    delivery_zone_id    INTEGER REFERENCES delivery_zones(id),

    -- Totals
    subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
    delivery_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_amount        NUMERIC(10,2) NOT NULL DEFAULT 0,

    -- Fulfillment
    order_type          VARCHAR(20) DEFAULT 'delivery', -- delivery | pickup
    status              VARCHAR(30) DEFAULT 'pending',
    -- pending | confirmed | processing | out_for_delivery | delivered | cancelled

    -- Scheduling
    requested_date      DATE,
    requested_time_slot VARCHAR(50),                    -- "Morning 9-12", "Evening 4-7"
    delivered_at        TIMESTAMPTZ,

    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer    ON orders(customer_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_orders_date        ON orders(requested_date);

CREATE TABLE order_items (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id),
    product_name    VARCHAR(255) NOT NULL,          -- snapshot at time of order
    unit            VARCHAR(50),
    quantity        INTEGER NOT NULL DEFAULT 1,
    unit_price      NUMERIC(10,2) NOT NULL,
    line_total      NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- =============================================================
-- SECTION 9: PAYMENTS
-- Cash and Zelle only (per MVP spec)
-- =============================================================

CREATE TABLE payments (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_method      VARCHAR(20) NOT NULL,       -- cash | zelle
    amount              NUMERIC(10,2) NOT NULL,
    status              VARCHAR(20) DEFAULT 'pending',
    -- pending | received | confirmed | refunded
    transaction_ref     VARCHAR(255),               -- Zelle confirmation number
    notes               TEXT,
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);

-- =============================================================
-- SECTION 10: NOTIFICATIONS
-- WhatsApp/SMS order alerts to customers
-- =============================================================

CREATE TABLE notifications (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id        INTEGER REFERENCES orders(id),
    type            VARCHAR(50) NOT NULL,
    -- order_placed | order_confirmed | out_for_delivery | delivered | cancelled
    channel         VARCHAR(20) DEFAULT 'whatsapp', -- whatsapp | sms
    message         TEXT NOT NULL,
    is_sent         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_customer ON notifications(customer_id);
CREATE INDEX idx_notifications_unsent   ON notifications(is_sent) WHERE is_sent = FALSE;

-- =============================================================
-- SECTION 11: CUSTOMER BEHAVIOR TRACKING
-- Feeds recommendations and search improvements
-- =============================================================

-- Track which products a customer has viewed
CREATE TABLE customer_product_views (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    product_id      INTEGER REFERENCES products(id) ON DELETE CASCADE,
    session_id      VARCHAR(255),                   -- for guest tracking
    viewed_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cpv_customer ON customer_product_views(customer_id);
CREATE INDEX idx_cpv_product  ON customer_product_views(product_id);

-- Track search history per customer
CREATE TABLE customer_search_history (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    session_id      VARCHAR(255),                   -- for guest tracking
    query           VARCHAR(500) NOT NULL,
    results_count   INTEGER DEFAULT 0,
    searched_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csh_customer ON customer_search_history(customer_id);
CREATE INDEX idx_csh_query    ON customer_search_history USING gin(query gin_trgm_ops);

-- =============================================================
-- SECTION 12: AUTO-UPDATE TRIGGERS
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendors_updated_at
    BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inventory_updated_at
    BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_addresses_updated_at
    BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- SECTION 13: ORDER NUMBER GENERATOR
-- Auto-generates S2H-10001, S2H-10002, etc.
-- =============================================================

CREATE SEQUENCE order_number_seq START 10001;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number = 'S2H-' || nextval('order_number_seq');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_order_number();

-- =============================================================
-- SECTION 14: HOUSEHOLDS (family sharing)
-- Added in Sprint 1 alongside customer auth
-- =============================================================

CREATE TABLE IF NOT EXISTS households (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    created_by  INTEGER REFERENCES customers(id),
    invite_code VARCHAR(20) UNIQUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS household_members (
    id           SERIAL PRIMARY KEY,
    household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    role         VARCHAR(20) DEFAULT 'member',   -- head | member
    joined_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(household_id, customer_id)
);

-- =============================================================
-- SECTION 15: CUSTOMER ADDRESS LINKS
-- Junction table: many customers Γåö many addresses
-- Two customers can share the same address_id (household)
-- =============================================================

CREATE TABLE IF NOT EXISTS customer_address_links (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_id  INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    label       VARCHAR(50) DEFAULT 'Home',
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, address_id)
);

CREATE INDEX IF NOT EXISTS idx_cal_customer ON customer_address_links(customer_id);
CREATE INDEX IF NOT EXISTS idx_cal_address  ON customer_address_links(address_id);

-- =============================================================
-- SECTION 16: OTP VERIFICATIONS & SESSIONS (auth)
-- =============================================================

CREATE TABLE IF NOT EXISTS otp_verifications (
    id          SERIAL PRIMARY KEY,
    identifier  VARCHAR(255) NOT NULL,   -- email or phone
    otp_code    VARCHAR(10) NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_verifications(identifier);

CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token       VARCHAR(255) NOT NULL UNIQUE,
    is_active   BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token    ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON sessions(customer_id);

-- add household_id column to customers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='customers' AND column_name='household_id'
  ) THEN
    ALTER TABLE customers ADD COLUMN household_id INTEGER REFERENCES households(id);
  END IF;
END$$;


