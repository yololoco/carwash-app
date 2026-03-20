-- myWash: Inventory management
-- Slice 9: Inventory + Cost Tracking

-- Inventory items (master catalog)
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sku TEXT UNIQUE,
  category TEXT NOT NULL,
  unit TEXT NOT NULL,
  unit_cost DECIMAL(10,4),
  supplier_name TEXT,
  supplier_contact TEXT,
  reorder_point DECIMAL(10,2),
  reorder_quantity DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Stock levels per location
CREATE TABLE inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 0,
  last_restocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id)
);

-- Inventory transactions (restock, usage, transfer, waste)
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  transaction_type inventory_tx_type NOT NULL,
  quantity DECIMAL(10,4) NOT NULL,
  wash_session_id UUID REFERENCES wash_sessions(id),
  performed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inv_tx_item ON inventory_transactions(item_id);
CREATE INDEX idx_inv_tx_location ON inventory_transactions(location_id);
CREATE INDEX idx_inv_tx_session ON inventory_transactions(wash_session_id);

-- Service material requirements (what each service uses)
CREATE TABLE service_material_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity_per_wash DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL,
  UNIQUE(service_id, material_id)
);

-- Trigger: update stock after transaction + low stock alert
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_stock (item_id, location_id, quantity)
  VALUES (NEW.item_id, NEW.location_id, NEW.quantity)
  ON CONFLICT (item_id, location_id)
  DO UPDATE SET
    quantity = inventory_stock.quantity + NEW.quantity,
    last_restocked_at = CASE WHEN NEW.transaction_type = 'restock' THEN now() ELSE inventory_stock.last_restocked_at END,
    updated_at = now();

  -- Low stock alert notification
  IF (SELECT quantity FROM inventory_stock WHERE item_id = NEW.item_id AND location_id = NEW.location_id)
     < (SELECT COALESCE(reorder_point, 0) FROM inventory_items WHERE id = NEW.item_id) THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT ls.user_id, 'low_stock_alert',
           'Alerta de inventario',
           (SELECT name FROM inventory_items WHERE id = NEW.item_id) || ' esta por debajo del minimo',
           jsonb_build_object('item_id', NEW.item_id, 'location_id', NEW.location_id)
    FROM location_staff ls
    WHERE ls.location_id = NEW.location_id
      AND ls.role IN ('location_manager')
      AND ls.is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_inventory_transaction
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION update_inventory_stock();
