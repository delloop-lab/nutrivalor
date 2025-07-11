import { describe, expect, it } from 'vitest';
import { calculateMealNutrients, Meal } from '../meal-nutrition-service';

describe('Meal Nutrition Service', () => {
  // Test data for "Bacon and Eggs" meal
  const baconAndEggsMeal: Meal = {
    name: "Bacon and Eggs",
    foods: [
      {
        name: "Bacon",
        macrosPer100g: {
          calories: 541,
          protein: 37,
          fat: 42,
          carbs: 1.4
        },
        unit: {
          name: "slice",
          gramsPerUnit: 17
        },
        quantity: 3
      },
      {
        name: "Eggs",
        macrosPer100g: {
          // Converting per-unit values to per 100g
          // Each egg is: 1g carb, 5g fat, 6g protein
          // Each egg is 50g, so multiply by (100/50) = 2 to get per 100g values
          calories: ((5 * 9 + 6 * 4 + 1 * 4) * 2), // (fat*9 + protein*4 + carb*4) * 2
          protein: 12, // 6g * 2
          fat: 10,     // 5g * 2
          carbs: 2     // 1g * 2
        },
        unit: {
          name: "each",
          gramsPerUnit: 50
        },
        quantity: 2
      }
    ]
  };

  it('calculates total nutrients for Bacon and Eggs meal correctly', () => {
    const result = calculateMealNutrients(baconAndEggsMeal);

    // Expected values for 3 slices of bacon (51g total)
    const expectedBaconNutrients = {
      totalGrams: 51,
      calories: 275.91,
      protein: 18.87,
      fat: 21.42,
      carbs: 0.71
    };

    // Expected values for 2 eggs (direct unit values * quantity)
    const expectedEggNutrients = {
      totalGrams: 100, // 2 eggs * 50g
      calories: 2 * (5 * 9 + 6 * 4 + 1 * 4), // 2 * (fat*9 + protein*4 + carb*4)
      protein: 12, // 2 eggs * 6g
      fat: 10,     // 2 eggs * 5g
      carbs: 2     // 2 eggs * 1g
    };

    // Test total grams
    expect(result.totalGrams).toBeCloseTo(151, 1); // 51g bacon + 100g eggs

    // Test total nutrients (sum of both foods)
    expect(result.calories).toBeCloseTo(expectedBaconNutrients.calories + expectedEggNutrients.calories, 1);
    expect(result.protein).toBeCloseTo(expectedBaconNutrients.protein + expectedEggNutrients.protein, 1);
    expect(result.fat).toBeCloseTo(expectedBaconNutrients.fat + expectedEggNutrients.fat, 1);
    expect(result.carbs).toBeCloseTo(expectedBaconNutrients.carbs + expectedEggNutrients.carbs, 1);

    // Test individual food breakdown
    expect(result.foodBreakdown).toHaveLength(2);
    
    // Test bacon breakdown
    const baconResult = result.foodBreakdown.find(f => f.foodName === "Bacon")?.nutrients;
    expect(baconResult?.totalGrams).toBeCloseTo(expectedBaconNutrients.totalGrams, 1);
    expect(baconResult?.calories).toBeCloseTo(expectedBaconNutrients.calories, 1);
    expect(baconResult?.protein).toBeCloseTo(expectedBaconNutrients.protein, 1);
    expect(baconResult?.fat).toBeCloseTo(expectedBaconNutrients.fat, 1);
    expect(baconResult?.carbs).toBeCloseTo(expectedBaconNutrients.carbs, 1);

    // Test eggs breakdown
    const eggsResult = result.foodBreakdown.find(f => f.foodName === "Eggs")?.nutrients;
    expect(eggsResult?.totalGrams).toBeCloseTo(expectedEggNutrients.totalGrams, 1);
    expect(eggsResult?.calories).toBeCloseTo(expectedEggNutrients.calories, 1);
    expect(eggsResult?.protein).toBeCloseTo(expectedEggNutrients.protein, 1);
    expect(eggsResult?.fat).toBeCloseTo(expectedEggNutrients.fat, 1);
    expect(eggsResult?.carbs).toBeCloseTo(expectedEggNutrients.carbs, 1);
  });
}); 