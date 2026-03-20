-- myWash: Seed real services and wash packages
-- Fix 1: App needs usable data

-- Services
INSERT INTO service_catalog (id, name, description, category, is_add_on, estimated_duration_minutes, sort_order) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Lavado exterior', 'Lavado completo del exterior con shampoo automotriz y secado a mano.', 'wash', false, 25, 1),
  ('b0000000-0000-0000-0000-000000000002', 'Lavado interior', 'Aspirado de interiores, limpieza de tablero, consola y vidrios interiores.', 'wash', false, 20, 2),
  ('b0000000-0000-0000-0000-000000000003', 'Lavado completo', 'Exterior + interior. El paquete mas popular.', 'wash', false, 40, 3),
  ('b0000000-0000-0000-0000-000000000004', 'Encerado express', 'Capa protectora de cera para brillo y proteccion UV.', 'add_on', true, 15, 10),
  ('b0000000-0000-0000-0000-000000000005', 'Limpieza de rines', 'Limpieza profunda de rines y llantas con producto especial.', 'add_on', true, 10, 11),
  ('b0000000-0000-0000-0000-000000000006', 'Aromatizante premium', 'Aromatizante de larga duracion para interiores.', 'add_on', true, 5, 12),
  ('b0000000-0000-0000-0000-000000000007', 'Limpieza de motor', 'Desengrasado y limpieza del compartimiento del motor.', 'detailing', true, 30, 20),
  ('b0000000-0000-0000-0000-000000000008', 'Pulido de faros', 'Restauracion de faros opacos para mejor visibilidad.', 'detailing', true, 25, 21),
  ('b0000000-0000-0000-0000-000000000009', 'Ceramico express', 'Proteccion ceramica de rapida aplicacion. Dura 3 meses.', 'detailing', true, 45, 22);

-- Packages
INSERT INTO wash_packages (id, name, description, frequency, included_services, base_price, is_subscription, multi_car_discount_pct, sort_order) VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'Basico Semanal',
    'Un lavado exterior por semana. Perfecto para mantener tu auto limpio.',
    'weekly',
    ARRAY['b0000000-0000-0000-0000-000000000001']::uuid[],
    299.00,
    true,
    10,
    1
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Completo Semanal',
    'Lavado completo (exterior + interior) cada semana. Nuestro mas popular.',
    'weekly',
    ARRAY['b0000000-0000-0000-0000-000000000003']::uuid[],
    499.00,
    true,
    10,
    2
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'Premium Semanal',
    'Lavado completo + encerado + rines cada semana. La experiencia premium.',
    'weekly',
    ARRAY['b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000005']::uuid[],
    799.00,
    true,
    15,
    3
  ),
  (
    'c0000000-0000-0000-0000-000000000004',
    'Basico Quincenal',
    'Un lavado exterior cada dos semanas.',
    'biweekly',
    ARRAY['b0000000-0000-0000-0000-000000000001']::uuid[],
    199.00,
    true,
    10,
    4
  ),
  (
    'c0000000-0000-0000-0000-000000000005',
    'Lavado Unico Exterior',
    'Un lavado exterior sin suscripcion.',
    'one_time',
    ARRAY['b0000000-0000-0000-0000-000000000001']::uuid[],
    149.00,
    false,
    0,
    10
  ),
  (
    'c0000000-0000-0000-0000-000000000006',
    'Lavado Unico Completo',
    'Lavado completo sin suscripcion.',
    'one_time',
    ARRAY['b0000000-0000-0000-0000-000000000003']::uuid[],
    249.00,
    false,
    0,
    11
  );

-- Premium fees
INSERT INTO premium_fees (name, fee_type, amount, is_active) VALUES
  ('Cargo por emergencia', 'emergency', 150.00, true),
  ('Cargo por lavado unico', 'one_time_surcharge', 50.00, true),
  ('Cargo por horario especifico', 'time_slot', 75.00, true),
  ('Cargo hora pico (7-9am)', 'peak_hour', 50.00, true);

-- Inventory items (basic supplies)
INSERT INTO inventory_items (name, sku, category, unit, unit_cost, reorder_point, reorder_quantity) VALUES
  ('Shampoo automotriz', 'SHAM-001', 'chemical', 'litros', 45.00, 10, 20),
  ('Cera liquida', 'CERA-001', 'chemical', 'litros', 120.00, 5, 10),
  ('Limpiador de rines', 'RINS-001', 'chemical', 'litros', 85.00, 5, 10),
  ('Microfibra', 'MICR-001', 'consumable', 'unidades', 25.00, 20, 50),
  ('Aromatizante', 'AROM-001', 'consumable', 'unidades', 15.00, 30, 50),
  ('Desengrasante motor', 'DESC-001', 'chemical', 'litros', 95.00, 3, 5),
  ('Ceramico express', 'CERM-001', 'chemical', 'ml', 350.00, 2, 5),
  ('Pulidor de faros', 'PULF-001', 'chemical', 'unidades', 180.00, 3, 5),
  ('Agua purificada', 'AGUA-001', 'consumable', 'litros', 0.50, 100, 500);
