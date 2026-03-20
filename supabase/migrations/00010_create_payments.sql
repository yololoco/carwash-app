-- myWash: Payments table
-- Slice 2: Subscriptions + Payments

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  booking_id UUID,
  subscription_id UUID REFERENCES subscriptions(id),
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'mercadopago', 'cash', 'corporate', 'loyalty')),
  payment_method payment_method NOT NULL,
  external_payment_id TEXT,
  external_invoice_id TEXT,
  external_subscription_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_type TEXT NOT NULL,
  description TEXT,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_reason TEXT,
  -- Cash-specific
  cash_collected_by UUID REFERENCES profiles(id),
  cash_confirmed_by UUID REFERENCES profiles(id),
  cash_confirmed_at TIMESTAMPTZ,
  -- Tip
  tip_amount DECIMAL(10,2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created ON payments(created_at);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
