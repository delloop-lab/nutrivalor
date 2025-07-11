import { describe, expect, it } from 'vitest';
import { calculateNutrientsFromInput } from '../nutrition';

describe('calculateNutrientsFromInput', () => {
  // Test data
  const sampleMacros = {
    calories: 541,
    fat: 42,
    protein: 37,
    carbs: 1.4
  };

  it('calculates nutrients correctly for gram-based input', () => {
    const result = calculateNutrientsFromInput({
      macrosPer100g: sampleMacros,
      inputType: 'grams',
      quantity: 200
    });

    expect(result.totalGrams).toBe(200);
    expect(result.calories).toBeCloseTo(1082, 1);
    expect(result.fat).toBeCloseTo(84, 1);
    expect(result.protein).toBeCloseTo(74, 1);
    expect(result.carbs).toBeCloseTo(2.8, 1);
  });

  it('calculates nutrients correctly for unit-based input (bacon example)', () => {
    const result = calculateNutrientsFromInput({
      macrosPer100g: sampleMacros,
      inputType: 'unit',
      quantity: 3,
      gramsPerUnit: 17
    });

    expect(result.totalGrams).toBe(51);
    expect(result.calories).toBeCloseTo(275.91, 2);
    expect(result.fat).toBeCloseTo(21.42, 2);
    expect(result.protein).toBeCloseTo(18.87, 2);
    expect(result.carbs).toBeCloseTo(0.71, 2);
  });

  it('throws error for negative quantity', () => {
    expect(() => calculateNutrientsFromInput({
      macrosPer100g: sampleMacros,
      inputType: 'grams',
      quantity: -1
    })).toThrow('Quantity cannot be negative');
  });

  it('throws error for unit-based input without gramsPerUnit', () => {
    expect(() => calculateNutrientsFromInput({
      macrosPer100g: sampleMacros,
      inputType: 'unit',
      quantity: 1
    })).toThrow('Valid gramsPerUnit is required when using unit input type');
  });

  it('throws error for unit-based input with invalid gramsPerUnit', () => {
    expect(() => calculateNutrientsFromInput({
      macrosPer100g: sampleMacros,
      inputType: 'unit',
      quantity: 1,
      gramsPerUnit: 0
    })).toThrow('Valid gramsPerUnit is required when using unit input type');
  });

  it('handles zero quantity correctly', () => {
    const result = calculateNutrientsFromInput({
      macrosPer100g: sampleMacros,
      inputType: 'grams',
      quantity: 0
    });

    expect(result.totalGrams).toBe(0);
    expect(result.calories).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbs).toBe(0);
  });
}); 