import { calculateNutrientsFromInput } from '../js/nutrient-calculator';
import { MacrosPer100g } from '../js/types';

export interface FoodUnit {
  name: string;          // e.g., "slice", "each"
  gramsPerUnit: number;  // e.g., 17 for bacon slice
}

export interface MealFood {
  name: string;
  macrosPer100g: MacrosPer100g;
  unit: FoodUnit;
  quantity: number;
}

export interface Meal {
  name: string;
  foods: Array<{
    name: string;
    macrosPer100g: MacrosPer100g;
    quantity: number;
    unit: {
      name: string;
      gramsPerUnit: number;
    };
  }>;
}

export interface MealNutrients {
  totalGrams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  foodBreakdown: Array<{
    foodName: string;
    nutrients: {
      totalGrams: number | null;
      calories: number;
      protein: number;
      fat: number;
      carbs: number;
    };
  }>;
}

/**
 * Calculates total nutrients for a meal by aggregating nutrients from all foods
 * @param meal The meal data containing foods and their quantities
 * @returns Total nutrients for the meal and breakdown by food
 */
export function calculateMealNutrients(meal: Meal): MealNutrients {
  // Initialize totals
  const mealTotals: MealNutrients = {
    totalGrams: 0,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    foodBreakdown: []
  };

  // Calculate nutrients for each food and aggregate
  meal.foods.forEach(food => {
    const foodNutrients = calculateNutrientsFromInput({
      macrosPer100g: food.macrosPer100g,
      inputType: 'unit',
      quantity: food.quantity,
      gramsPerUnit: food.unit.gramsPerUnit,
      unitType: food.unit.name
    });

    // Add to meal totals
    if (foodNutrients.totalGrams !== null) {
      mealTotals.totalGrams += foodNutrients.totalGrams;
    }
    mealTotals.calories += foodNutrients.calories;
    mealTotals.protein += foodNutrients.protein;
    mealTotals.fat += foodNutrients.fat;
    mealTotals.carbs += foodNutrients.carbs;

    // Add to food breakdown
    mealTotals.foodBreakdown.push({
      foodName: food.name,
      nutrients: foodNutrients
    });
  });

  return mealTotals;
} 