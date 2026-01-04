-- Add friendly_id column
ALTER TABLE orders 
ADD COLUMN friendly_id TEXT UNIQUE;

-- Optional: Backfill existing orders (best effort using truncated ID)
-- Ideally we would reproduce the full logic but usually simpler is fine for backfill
UPDATE orders 
SET friendly_id = UPPER(SUBSTRING(id::text FROM 1 FOR 8)) 
WHERE friendly_id IS NULL;

-- Make it not null after backfill
ALTER TABLE orders 
ALTER COLUMN friendly_id SET NOT NULL;
