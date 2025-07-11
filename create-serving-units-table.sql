-- Create serving_units table
CREATE TABLE serving_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID REFERENCES foods(id) ON DELETE CASCADE,
  unit_name TEXT NOT NULL,
  grams_per_unit REAL,  -- Allow NULL for EACH units
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (food_id, unit_name),
  CONSTRAINT check_grams_per_unit_null CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
  )
);

-- Create index for faster lookups
CREATE INDEX idx_serving_units_food_id ON serving_units(food_id);
CREATE INDEX idx_serving_units_default ON serving_units(food_id, is_default) WHERE is_default = TRUE;

-- Enable RLS (Row Level Security)
ALTER TABLE serving_units ENABLE ROW LEVEL SECURITY;

-- Create policy for serving_units (allow all authenticated users to read, admins to modify)
CREATE POLICY "Allow authenticated users to read serving units" ON serving_units
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert serving units" ON serving_units
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update serving units" ON serving_units
  FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete serving units" ON serving_units
  FOR DELETE TO authenticated
  USING (true);

-- Function to automatically create default serving unit for new foods
CREATE OR REPLACE FUNCTION create_default_serving_unit()
RETURNS TRIGGER AS $$
BEGIN
  -- For foods that are typically counted (e.g., eggs, chicken breasts)
  -- we'll create an EACH unit with NULL grams_per_unit
  IF NEW.name ILIKE '%egg%' OR 
     NEW.name ILIKE '%chicken breast%' OR
     NEW.name ILIKE '%banana%' OR
     NEW.name ILIKE '%apple%' OR
     NEW.name ILIKE '%orange%' OR
     NEW.name ILIKE '%eggplant%' OR
     NEW.name ILIKE '%aubergine%' THEN
    
    INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
    VALUES (NEW.id, 'EACH', NULL, TRUE);
  ELSE
    -- For all other foods (including sliced/grated items), create default gram unit
    INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
    VALUES (NEW.id, 'g', 1.0, TRUE);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add default serving unit when food is created
CREATE TRIGGER trigger_create_default_serving_unit
  AFTER INSERT ON foods
  FOR EACH ROW
  EXECUTE FUNCTION create_default_serving_unit();

-- Add some common serving units for existing foods (optional - can be run separately)
-- This will add default gram units for all existing foods that don't have serving units yet
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'g', 1.0, TRUE 
FROM foods 
WHERE id NOT IN (SELECT DISTINCT food_id FROM serving_units WHERE food_id IS NOT NULL)
AND NOT (
  name ILIKE '%egg%' OR 
  name ILIKE '%chicken breast%' OR
  name ILIKE '%banana%' OR
  name ILIKE '%apple%' OR
  name ILIKE '%orange%' OR
  name ILIKE '%eggplant%' OR
  name ILIKE '%aubergine%'
);

-- Add EACH units for typically counted foods
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', NULL, TRUE 
FROM foods 
WHERE id NOT IN (SELECT DISTINCT food_id FROM serving_units WHERE food_id IS NOT NULL)
AND (
  name ILIKE '%egg%' OR 
  name ILIKE '%chicken breast%' OR
  name ILIKE '%banana%' OR
  name ILIKE '%apple%' OR
  name ILIKE '%orange%' OR
  name ILIKE '%eggplant%' OR
  name ILIKE '%aubergine%'
);

COMMENT ON TABLE serving_units IS 'Stores alternative serving sizes for foods with conversion to grams. EACH units have NULL grams_per_unit.';
COMMENT ON COLUMN serving_units.food_id IS 'Foreign key reference to foods table';
COMMENT ON COLUMN serving_units.unit_name IS 'Name of the serving unit (e.g., EACH, slice, cup, tbsp)';
COMMENT ON COLUMN serving_units.grams_per_unit IS 'How many grams this unit represents. NULL for EACH units which are count-based.';
COMMENT ON COLUMN serving_units.is_default IS 'Whether this is the default unit for this food'; 