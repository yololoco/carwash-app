-- myWash: Cars table
-- Slice 1: Cars + Services + Packages

CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  color TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  primary_location_id UUID REFERENCES locations(id),
  parking_spot TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cars_owner ON cars(owner_id);
CREATE INDEX idx_cars_location ON cars(primary_location_id);
CREATE INDEX idx_cars_plate ON cars(plate_number);

CREATE TRIGGER cars_updated_at
  BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
