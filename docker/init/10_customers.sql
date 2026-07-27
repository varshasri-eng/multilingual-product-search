-- ============================================================
-- Migration: customers table for authentication
-- ============================================================
-- Email+password for now (not phone+OTP, which is what the original
-- DeliveryHub proposal specified) — OTP needs a paid SMS/WhatsApp API
-- (Twilio/MSG91) and external account setup, which is a separate
-- infrastructure decision, not something to guess at silently.
-- This structure doesn't block adding OTP later.

CREATE TABLE IF NOT EXISTS customers (
    customer_id     SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);