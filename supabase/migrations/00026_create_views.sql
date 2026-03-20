-- myWash: Analytics views
-- Slice 10: Analytics + Reporting

-- Location daily summary
CREATE OR REPLACE VIEW location_daily_summary AS
SELECT
  b.location_id,
  b.scheduled_date,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_shows,
  COUNT(*) FILTER (WHERE b.is_one_time) AS one_time_count,
  COUNT(*) FILTER (WHERE NOT b.is_one_time) AS subscription_count,
  COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'completed'), 0) AS total_revenue,
  AVG(ws.duration_minutes) FILTER (WHERE ws.completed_at IS NOT NULL) AS avg_wash_duration
FROM bookings b
LEFT JOIN wash_sessions ws ON ws.booking_id = b.id
GROUP BY b.location_id, b.scheduled_date;

-- Customer lifetime value
CREATE OR REPLACE VIEW customer_ltv AS
SELECT
  p.id AS customer_id,
  p.full_name,
  p.email,
  COUNT(DISTINCT s.id) AS active_subscriptions,
  COUNT(DISTINCT b.id) AS total_bookings,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'succeeded'), 0) AS total_spent,
  AVG(qs.overall_rating) AS avg_rating_given,
  MIN(b.created_at) AS first_booking,
  MAX(b.created_at) AS last_booking
FROM profiles p
LEFT JOIN subscriptions s ON s.customer_id = p.id AND s.status = 'active'
LEFT JOIN bookings b ON b.customer_id = p.id
LEFT JOIN payments pay ON pay.customer_id = p.id
LEFT JOIN quality_surveys qs ON qs.customer_id = p.id
WHERE p.role = 'customer'
GROUP BY p.id, p.full_name, p.email;
