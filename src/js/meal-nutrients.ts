import { MacrosPer100g } from './types';

interface CalculatorInput {
  macrosPer100g: MacrosPer100g;
  inputType: 'grams' | 'unit';
  quantity: number;
  gramsPerUnit?: number;
  unitType?: string;  // Add unit type to identify EACH units
}

interface CalculatorOutput {
  totalGrams: number | null;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

/**
 * Calculates total nutrients for a food item in a meal based on quantity and input type
 * For EACH units:
 * - Values in macrosPer100g are assumed to be per unit (not per 100g)
 * - Direct multiplication is used (quantity * value)
 * For other units:
 * - Values in macrosPer100g are per 100g
 * - Calculation uses grams conversion
 * @throws Error if invalid input is provided
 */
export function calculateMealFoodNutrients(input: CalculatorInput): CalculatorOutput {
  const { macrosPer100g, inputType, quantity, gramsPerUnit, unitType } = input;

  // Input validation
  if (quantity < 0) {
    throw new Error('Quantity cannot be negative');
  }

  // For EACH units, use direct multiplication (no grams calculation needed)
  // Values in macrosPer100g are assumed to be per unit for EACH units
  if (unitType?.toUpperCase() === 'EACH') {
    return {
      totalGrams: null, // Don't track grams for EACH units
      calories: Math.round((macrosPer100g.calories * quantity) * 10) / 10,
      fat: Math.round((macrosPer100g.fat * quantity) * 10) / 10,
      protein: Math.round((macrosPer100g.protein * quantity) * 10) / 10,
      carbs: Math.round((macrosPer100g.carbs * quantity) * 10) / 10
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

  // Round all values to 1 decimal place for consistency
  return {
    totalGrams,
    calories: Math.round((macrosPer100g.calories * factor) * 10) / 10,
    fat: Math.round((macrosPer100g.fat * factor) * 10) / 10,
    protein: Math.round((macrosPer100g.protein * factor) * 10) / 10,
    carbs: Math.round((macrosPer100g.carbs * factor) * 10) / 10
  };
} 