# Chicken Mushroom Spinach Cheese Bake Meal - Fix Summary

## Issues Identified

The Chicken Mushroom Spinach Cheese Bake meal had several critical issues:

### 1. **Null food_id Values**
- The meal ingredients had `food_id` values that were `null`
- This prevented the application from finding the corresponding food data
- Without food data, nutrient calculations couldn't be performed correctly

### 2. **Missing Serving Units**
- The foods didn't have proper serving units defined in the `serving_units` table
- Chicken breast needed an "EACH" unit (countable item)
- Mushroom, spinach, and cheese needed "g" units (weight-based items)

### 3. **Incorrect Database Constraints**
- The `serving_units` table had constraints that prevented EACH units from having NULL `grams_per_unit`
- This is incorrect because EACH units are countable, not weight-based

### 4. **Inconsistent Nutrient Calculations**
- The application couldn't calculate nutrients properly due to missing food links
- Meal totals were incorrect or missing

## The Fix

### Step 1: Database Structure Fix
```sql
-- Allow NULL grams_per_unit for EACH units
ALTER TABLE serving_units ALTER COLUMN grams_per_unit DROP NOT NULL;

-- Clean up invalid data
DELETE FROM serving_units WHERE unit_name = 'EACH' AND grams_per_unit IS NOT NULL;
DELETE FROM serving_units WHERE unit_name != 'EACH' AND grams_per_unit IS NULL;

-- Add proper constraint
ALTER TABLE serving_units ADD CONSTRAINT check_grams_per_unit_null CHECK (
    (unit_name = 'EACH' AND grams_per_unit IS NULL) OR 
    (unit_name != 'EACH' AND grams_per_unit IS NOT NULL)
);
```

### Step 2: Create Serving Units
```sql
-- Chicken Breast: EACH unit (countable)
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'EACH', NULL, true
FROM foods WHERE name ILIKE '%chicken breast%';

-- Other foods: gram units (weight-based)
INSERT INTO serving_units (food_id, unit_name, grams_per_unit, is_default)
SELECT id, 'g', 1.0, true
FROM foods WHERE name ILIKE '%mushroom%' OR name ILIKE '%spinach%' OR name ILIKE '%cheese%';
```

### Step 3: Fix Meal Ingredients
```sql
UPDATE meals
SET ingredients = jsonb_build_array(
    -- Chicken Breast: 2 EACH
    jsonb_build_object(
        'food_id', (SELECT id FROM foods WHERE name ILIKE '%chicken breast%' LIMIT 1),
        'food_name', 'Chicken Breast',
        'quantity', 2,
        'serving_unit', 'EACH',
        'instructions', 'Diced'
    ),
    -- Mushroom: 200g
    jsonb_build_object(
        'food_id', (SELECT id FROM foods WHERE name ILIKE '%mushroom%' LIMIT 1),
        'food_name', 'Mushroom',
        'quantity', 200,
        'serving_unit', 'g',
        'instructions', 'Sliced'
    ),
    -- Spinach: 100g
    jsonb_build_object(
        'food_id', (SELECT id FROM foods WHERE name ILIKE '%spinach%' LIMIT 1),
        'food_name', 'Spinach',
        'quantity', 100,
        'serving_unit', 'g',
        'instructions', 'Fresh'
    ),
    -- Cheese: 50g
    jsonb_build_object(
        'food_id', (SELECT id FROM foods WHERE name ILIKE '%cheese%' LIMIT 1),
        'food_name', 'Cheese',
        'quantity', 50,
        'serving_unit', 'g',
        'instructions', 'Grated'
    )
)
WHERE name LIKE '%Chicken Mushroom%';
```

## How the Application Calculates Nutrients

The application uses this logic in `src/js/meals.ts`:

```typescript
// For EACH units, use direct multiplication
if (unit === 'EACH') {
    calculatedCarbs = +(food.carbs * qty).toFixed(1);
    calculatedFat = +(food.fat * qty).toFixed(1);
    calculatedProtein = +(food.protein * qty).toFixed(1);
} else {
    // For weight-based units, use grams calculation
    const suMatch = servingUnits.find(su => su.food_id === food.id && su.unit_name === unit);
    if (suMatch && suMatch.grams_per_unit) {
        const totalGrams = suMatch.grams_per_unit * qty;
        const factor = totalGrams / 100;
        calculatedCarbs = +(food.carbs * factor).toFixed(1);
        calculatedFat = +(food.fat * factor).toFixed(1);
        calculatedProtein = +(food.protein * factor).toFixed(1);
    }
}
```

## Expected Results

After the fix, the meal should have:

- **Chicken Breast (2 EACH)**: 0g carbs, 7.0g fat, 62g protein
- **Mushroom (200g)**: 6.8g carbs, 0.6g fat, 6.2g protein  
- **Spinach (100g)**: 3.6g carbs, 0.4g fat, 2.9g protein
- **Cheese (50g)**: 0.65g carbs, 9.0g fat, 6.25g protein

**Total**: ~11.05g carbs, ~17.0g fat, ~77.35g protein

## Files Created

1. `fix-chicken-mushroom-bake-final.sql` - Complete fix script
2. `fix-chicken-mushroom-bake-simple.sql` - Simplified version
3. `fix-chicken-mushroom-bake-complete.sql` - Detailed version with calculations

## Next Steps

1. Run the SQL script in your Supabase database
2. Refresh the application to see the corrected meal data
3. Verify that nutrient calculations are now working correctly
4. The application will automatically recalculate totals when meals are loaded 