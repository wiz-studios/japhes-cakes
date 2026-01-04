-- GPS Delivery Columns
-- "Zones Must Die" - we keep delivery_zone_id for legacy but these new fields take precedence

ALTER TABLE orders
ADD COLUMN delivery_lat DOUBLE PRECISION,
ADD COLUMN delivery_lng DOUBLE PRECISION,
ADD COLUMN delivery_address TEXT,
ADD COLUMN delivery_distance_km DOUBLE PRECISION;

-- We already have delivery_fee, but now it will be strictly calculated.
-- No new index needed immediately unless we search by location often.
