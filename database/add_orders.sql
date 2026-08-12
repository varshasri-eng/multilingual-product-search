-- ============================================================
-- Migration: orders + order_items + invoices + reviews
-- ============================================================
-- Full lifecycle, matching the mentor's exact flow:
--   customer places order -> admin reviews -> admin raises invoice
--   -> customer views invoice + pays -> admin processes -> customer reviews
--
-- Payment note: no real payment gateway wired up (no Stripe/Razorpay
-- keys, would need a real business account) -- "paid" here means
-- admin manually marks the invoice paid after receiving payment
-- outside the app (cash/UPI/bank transfer). Flag if a real payment
-- processor is actually wanted -- that's separate, bigger scope.

CREATE TABLE IF NOT EXISTS orders (
    order_id      SERIAL PRIMARY KEY,
    customer_id   INT NOT NULL REFERENCES customers(customer_id),
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN (
                      'pending',
                      'invoiced',
                      'paid',
                      'processed',
                      'completed',
                      'cancelled'
                  )),
    total_amount  DECIMAL(10,2) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id   SERIAL PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id      INT NOT NULL REFERENCES products(product_id),
    quantity        INT NOT NULL CHECK (quantity > 0),
    price_at_order  DECIMAL(10,2) NOT NULL,
    delivery_date   DATE NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoices (
    invoice_id      SERIAL PRIMARY KEY,
    order_id        INT NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
    amount          DECIMAL(10,2) NOT NULL,
    issued_by       INT NOT NULL REFERENCES customers(customer_id),
    issued_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at         TIMESTAMP,
    payment_note    TEXT,
    processed_at    TIMESTAMP,
    processed_by    INT REFERENCES customers(customer_id)
);

CREATE TABLE IF NOT EXISTS reviews (
    review_id    SERIAL PRIMARY KEY,
    order_id     INT NOT NULL UNIQUE REFERENCES orders(order_id) ON DELETE CASCADE,
    customer_id  INT NOT NULL REFERENCES customers(customer_id),
    rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

SELECT table_name FROM information_schema.tables
WHERE table_name IN ('orders', 'order_items', 'invoices', 'reviews');
