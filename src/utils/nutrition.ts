/**
 * Types for nutrient calculations
 */
export interface MacrosPer100g {
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
}

export interface NutrientCalculatorInput {
  macrosPer100g: MacrosPer100g;
  inputType: 'grams' | 'unit';
  quantity: number;
  gramsPerUnit?: number;
  unitType?: string;  // Add unit type to identify EACH units
}

export interface NutrientCalculatorOutput {
  totalGrams: number;
  calories: number;
  fat: number;
  protein: number;
  carbs: number;
}

/**
 * Calculates nutrient totals for a food item based on quantity and input type
 * @param input The calculation parameters
 * @returns Calculated nutrient totals and total grams
 * @throws Error if invalid input is provided
 */
export function calculateNutrientsFromInput({
  macrosPer100g,
  inputType,
  quantity,
  gramsPerUnit,
  unitType
}: NutrientCalculatorInput): NutrientCalculatorOutput {
  // Input validation
  if (quantity < 0) {
    throw new Error('Quantity cannot be negative');
  }

  // For EACH units, use direct multiplication (no grams calculation needed)
  if (unitType?.toUpperCase() === 'EACH') {
    return {
      totalGrams: null, // Don't track grams for EACH units
      calories: macrosPer100g.calories * quantity,
      fat: macrosPer100g.fat * quantity,
      protein: macrosPer100g.protein * quantity,
      carbs: macrosPer100g.carbs * quantity
    };
  }

  // For other units, require gramsPerUnit
  if (inputType === 'unit' && (!gramsPerUnit || gramsPerUnit <= 0)) {
    throw new Error('Valid gramsPerUnit is required when using unit input type');
  }

  // Calculate total grams based on input type
  const totalGrams = inputType === 'grams' 
    ? quantity 
    : quantity * (gramsPerUnit as number);

  // Calculate nutrients based on total grams
  const factor = totalGrams / 100;

  return {
    totalGrams,
    calories: macrosPer100g.calories * factor,
    fat: macrosPer100g.fat * factor,
    protein: macrosPer100g.protein * factor,
    carbs: macrosPer100g.carbs * factor
  };
} 