-- myWash: Seed data for development
-- Slice 0: Database Foundation

-- Test locations
INSERT INTO locations (id, name, address, city, state, country, location_type, max_daily_capacity, parking_instructions, access_instructions, contact_name, contact_phone)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'Torre Reforma',
    'Paseo de la Reforma 483, Cuauhtemoc',
    'Ciudad de Mexico',
    'CDMX',
    'MX',
    'office_building',
    40,
    'Estacionamiento subterraneo nivel B1 y B2. Cajones numerados.',
    'Acceso por rampa lateral. Gafete de seguridad requerido.',
    'Carlos Martinez',
    '+52 55 1234 5678'
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'Residencial Polanco',
    'Av. Presidente Masaryk 200, Polanco',
    'Ciudad de Mexico',
    'CDMX',
    'MX',
    'residential_building',
    20,
    'Estacionamiento interior. Cajones asignados por departamento.',
    'Llamar a caseta de vigilancia al llegar.',
    'Ana Lopez',
    '+52 55 8765 4321'
  );

-- Operating hours for Torre Reforma (Mon-Fri 7:00-18:00, closed weekends)
INSERT INTO location_operating_hours (location_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'monday', '07:00', '18:00', false),
  ('a0000000-0000-0000-0000-000000000001', 'tuesday', '07:00', '18:00', false),
  ('a0000000-0000-0000-0000-000000000001', 'wednesday', '07:00', '18:00', false),
  ('a0000000-0000-0000-0000-000000000001', 'thursday', '07:00', '18:00', false),
  ('a0000000-0000-0000-0000-000000000001', 'friday', '07:00', '18:00', false),
  ('a0000000-0000-0000-0000-000000000001', 'saturday', '07:00', '18:00', true),
  ('a0000000-0000-0000-0000-000000000001', 'sunday', '07:00', '18:00', true);

-- Operating hours for Residencial Polanco (Mon-Sat 8:00-17:00, closed Sunday)
INSERT INTO location_operating_hours (location_id, day_of_week, open_time, close_time, is_closed) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'monday', '08:00', '17:00', false),
  ('a0000000-0000-0000-0000-000000000002', 'tuesday', '08:00', '17:00', false),
  ('a0000000-0000-0000-0000-000000000002', 'wednesday', '08:00', '17:00', false),
  ('a0000000-0000-0000-0000-000000000002', 'thursday', '08:00', '17:00', false),
  ('a0000000-0000-0000-0000-000000000002', 'friday', '08:00', '17:00', false),
  ('a0000000-0000-0000-0000-000000000002', 'saturday', '08:00', '17:00', false),
  ('a0000000-0000-0000-0000-000000000002', 'sunday', '08:00', '17:00', true);

-- App settings
INSERT INTO app_settings (key, value, description) VALUES
  ('overhead_per_wash', '15.00', 'Fixed overhead cost per wash in MXN'),
  ('late_cancellation_minutes', '120', 'Minutes before scheduled time when cancellation fee applies'),
  ('max_emergency_per_day', '5', 'Maximum emergency washes per location per day'),
  ('default_wash_duration_minutes', '30', 'Default estimated wash duration in minutes'),
  ('no_show_limit', '3', 'Consecutive no-shows before admin alert'),
  ('survey_delay_minutes', '30', 'Minutes after wash completion to send survey request'),
  ('waitlist_check_interval_minutes', '15', 'How often to check waitlist for openings'),
  ('referral_reward_type', '"free_wash"', 'Reward type for successful referrals'),
  ('referral_reward_amount', '0', 'Reward amount (0 for free_wash type)'),
  ('loyalty_points_per_wash', '10', 'Points earned per completed wash');
