// Types for the nutrient calculator
interface MacrosPer100g {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface NutrientCalculatorInput {
  macrosPer100g: MacrosPer100g;
  inputType: 'grams' | 'unit';
  quantity: number;
  gramsPerUnit?: number;
  unitType?: string;  // Add unit type to identify EACH units
}

interface NutrientCalculatorOutput {
  totalGrams: number | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * Calculates total nutrients based on input quantity and type
 * @param input The calculation input parameters
 * @returns Calculated total nutrients and grams
 * @throws Error if invalid input is provided
 */
export function calculateNutrientsFromInput(input: NutrientCalculatorInput): NutrientCalculatorOutput {
  const { macrosPer100g, inputType, quantity, gramsPerUnit, unitType } = input;

  // Input validation
  if (quantity < 0) {
    throw new Error('Quantity cannot be negative');
  }

  // For EACH units, use direct multiplication (no grams calculation needed)
  if (unitType?.toUpperCase() === 'EACH') {
    return {
      totalGrams: null, // Don't track grams for EACH units
      calories: macrosPer100g.calories * quantity,
      protein: macrosPer100g.protein * quantity,
      fat: macrosPer100g.fat * quantity,
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
    protein: macrosPer100g.protein * factor,
    fat: macrosPer100g.fat * factor,
    carbs: macrosPer100g.carbs * factor
  };
} 