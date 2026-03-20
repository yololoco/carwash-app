-- myWash: RLS for inventory and costs
-- Slice 9: Inventory + Cost Tracking

-- ============ INVENTORY ITEMS ============
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read inventory items"
  ON inventory_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage inventory items"
  ON inventory_items FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ INVENTORY STOCK ============
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all stock"
  ON inventory_stock FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers see location stock"
  ON inventory_stock FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND location_id = inventory_stock.location_id
        AND role = 'location_manager' AND is_active = true
    )
  );

-- ============ INVENTORY TRANSACTIONS ============
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Washers create usage transactions"
  ON inventory_transactions FOR INSERT
  WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Admins manage transactions"
  ON inventory_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers see location transactions"
  ON inventory_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND location_id = inventory_transactions.location_id
        AND role = 'location_manager' AND is_active = true
    )
  );

-- ============ SERVICE MATERIAL REQUIREMENTS ============
ALTER TABLE service_material_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read material requirements"
  ON service_material_requirements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage material requirements"
  ON service_material_requirements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============ COST RECORDS ============
ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all costs"
  ON cost_records FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Managers see location costs"
  ON cost_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND location_id = cost_records.location_id
        AND role = 'location_manager' AND is_active = true
    )
  );
