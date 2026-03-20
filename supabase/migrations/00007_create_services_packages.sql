-- myWash: Service catalog, wash packages, pricing, and premium fees
-- Slice 1: Cars + Services + Packages

-- Service catalog (individual wash services and add-ons)
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'wash',
  is_add_on BOOLEAN NOT NULL DEFAULT false,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Wash packages (subscription plans and one-time pricing)
CREATE TABLE wash_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  frequency wash_frequency NOT NULL,
  included_services UUID[] NOT NULL,
  base_price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  is_location_specific BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_subscription BOOLEAN NOT NULL DEFAULT true,
  multi_car_discount_pct DECIMAL(5,2) DEFAULT 0,
  max_cars_for_discount INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER wash_packages_updated_at
  BEFORE UPDATE ON wash_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Location-specific pricing overrides
CREATE TABLE package_location_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES wash_packages(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  UNIQUE(package_id, location_id)
);

-- Premium fees (emergency, time-slot, one-time surcharge, peak-hour)
CREATE TABLE premium_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  fee_type TEXT NOT NULL,
  amount DECIMAL(10,2),
  percentage DECIMAL(5,2),
  location_id UUID REFERENCES locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
