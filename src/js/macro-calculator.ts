// Macro Calculator Module for NutriValor
import { getCurrentAuthUser } from './auth';

interface MacroProfile {
  age: number;
  gender: string;
  weight: number;
  height: number;
  activity: number;
  lossRate: number;
  proteinRatio: number;
  fatRatio: number;
}

interface MacroResults {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  bmr: number;
  tdee: number;
}

// Initialize macro calculator functionality
export async function initializeMacroCalculator(): Promise<void> {
  console.log('🧮 Initializing macro calculator...');
  loadSavedProfile();
  setDefaultValues();
}

// Load saved profile from localStorage
function loadSavedProfile(): void {
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  const savedProfile = localStorage.getItem(`macroProfile_${userId}`);
  if (savedProfile) {
    try {
      const profile: MacroProfile = JSON.parse(savedProfile);
      populateForm(profile);
    } catch (error) {
      console.error('Error loading saved macro profile:', error);
    }
  }
}

// Set default values
function setDefaultValues(): void {
  const ageInput = document.getElementById('macro-age') as HTMLInputElement;
  const weightInput = document.getElementById('macro-weight') as HTMLInputElement;
  const heightInput = document.getElementById('macro-height') as HTMLInputElement;
  
  if (ageInput && !ageInput.value) ageInput.value = '30';
  if (weightInput && !weightInput.value) weightInput.value = '70';
  if (heightInput && !heightInput.value) heightInput.value = '175';
}

// Populate form with saved profile data
function populateForm(profile: MacroProfile): void {
  const ageInput = document.getElementById('macro-age') as HTMLInputElement;
  const genderSelect = document.getElementById('macro-gender') as HTMLSelectElement;
  const weightInput = document.getElementById('macro-weight') as HTMLInputElement;
  const heightInput = document.getElementById('macro-height') as HTMLInputElement;
  const activitySelect = document.getElementById('macro-activity') as HTMLSelectElement;
  const lossRateSelect = document.getElementById('macro-lossRate') as HTMLSelectElement;
  const proteinRatioSelect = document.getElementById('macro-proteinRatio') as HTMLSelectElement;
  const fatRatioSelect = document.getElementById('macro-fatRatio') as HTMLSelectElement;
  
  if (ageInput) ageInput.value = profile.age.toString();
  if (genderSelect) genderSelect.value = profile.gender;
  if (weightInput) weightInput.value = profile.weight.toString();
  if (heightInput) heightInput.value = profile.height.toString();
  if (activitySelect) activitySelect.value = profile.activity.toString();
  if (lossRateSelect) lossRateSelect.value = profile.lossRate.toString();
  if (proteinRatioSelect) proteinRatioSelect.value = profile.proteinRatio.toString();
  if (fatRatioSelect) fatRatioSelect.value = profile.fatRatio.toString();
}

// Calculate macros using Mifflin-St Jeor Equation
export function calculateMacros(): void {
  const ageInput = document.getElementById('macro-age') as HTMLInputElement;
  const genderSelect = document.getElementById('macro-gender') as HTMLSelectElement;
  const weightInput = document.getElementById('macro-weight') as HTMLInputElement;
  const heightInput = document.getElementById('macro-height') as HTMLInputElement;
  const activitySelect = document.getElementById('macro-activity') as HTMLSelectElement;
  const lossRateSelect = document.getElementById('macro-lossRate') as HTMLSelectElement;
  const proteinRatioSelect = document.getElementById('macro-proteinRatio') as HTMLSelectElement;
  const fatRatioSelect = document.getElementById('macro-fatRatio') as HTMLSelectElement;
  
  const age = parseFloat(ageInput?.value || '0');
  const gender = genderSelect?.value || 'male';
  const weight = parseFloat(weightInput?.value || '0');
  const height = parseFloat(heightInput?.value || '0');
  const activity = parseFloat(activitySelect?.value || '1.55');
  const lossRate = parseFloat(lossRateSelect?.value || '0'); // kcal deficit
  const proteinRatio = parseFloat(proteinRatioSelect?.value || '2.2');
  const fatRatio = parseFloat(fatRatioSelect?.value || '0.8');
  
  // Validation
  if (!age || !weight || !height) {
    showMessage('Please fill in all required fields (Age, Weight, Height)', 'error');
    return;
  }
  
  if (age < 10 || age > 120) {
    showMessage('Please enter a valid age between 10 and 120', 'error');
    return;
  }
  
  if (weight < 20 || weight > 300) {
    showMessage('Please enter a valid weight between 20 and 300 kg', 'error');
    return;
  }
  
  if (height < 100 || height > 250) {
    showMessage('Please enter a valid height between 100 and 250 cm', 'error');
    return;
  }
  
  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  // Calculate TDEE (Total Daily Energy Expenditure)
  let tdee = bmr * activity;
  
  // Adjust for weight loss rate
  const adjustedCalories = tdee + lossRate; // lossRate is negative for weight loss
  
  // Calculate macros
  let protein = weight * proteinRatio;
  let fat = weight * fatRatio;
  let carbs = (adjustedCalories - (protein * 4) - (fat * 9)) / 4;
  
  // Ensure no negative values and minimum 10g carbs
  protein = Math.max(0, Math.round(protein));
  fat = Math.max(0, Math.round(fat));
  carbs = Math.max(10, Math.round(carbs));
  
  const results: MacroResults = {
    protein,
    carbs,
    fat,
    calories: Math.round(adjustedCalories),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee)
  };
  
  // Display results
  displayResults(results);
  showMessage('Macro calculations completed successfully!', 'success');
}

// Display calculation results
function displayResults(results: MacroResults): void {
  const proteinValue = document.getElementById('protein-value');
  const carbsValue = document.getElementById('carbs-value');
  const fatValue = document.getElementById('fat-value');
  const caloriesValue = document.getElementById('calories-value');
  const bmrValue = document.getElementById('bmr-value');
  const tdeeValue = document.getElementById('tdee-value');
  const adjustedCaloriesValue = document.getElementById('adjusted-calories');
  const macroResults = document.getElementById('macro-results');
  const macroExplanation = document.getElementById('macro-explanation');
  
  if (proteinValue) proteinValue.textContent = `${results.protein}g`;
  if (carbsValue) carbsValue.textContent = `${results.carbs}g`;
  if (fatValue) fatValue.textContent = `${results.fat}g`;
  if (caloriesValue) caloriesValue.textContent = results.calories.toString();
  if (bmrValue) bmrValue.textContent = results.bmr.toString();
  if (tdeeValue) tdeeValue.textContent = results.tdee.toString();
  if (adjustedCaloriesValue) adjustedCaloriesValue.textContent = results.calories.toString();
  
  if (macroResults) {
    macroResults.style.display = 'grid';
    macroResults.classList.add('show-results');
  }
  
  if (macroExplanation) {
    macroExplanation.style.display = 'block';
  }
}

// Save macro profile
export function saveMacroProfile(): void {
  const ageInput = document.getElementById('macro-age') as HTMLInputElement;
  const genderSelect = document.getElementById('macro-gender') as HTMLSelectElement;
  const weightInput = document.getElementById('macro-weight') as HTMLInputElement;
  const heightInput = document.getElementById('macro-height') as HTMLInputElement;
  const activitySelect = document.getElementById('macro-activity') as HTMLSelectElement;
  const lossRateSelect = document.getElementById('macro-lossRate') as HTMLSelectElement;
  const proteinRatioSelect = document.getElementById('macro-proteinRatio') as HTMLSelectElement;
  const fatRatioSelect = document.getElementById('macro-fatRatio') as HTMLSelectElement;
  
  const profile: MacroProfile = {
    age: parseFloat(ageInput?.value || '0'),
    gender: genderSelect?.value || 'male',
    weight: parseFloat(weightInput?.value || '0'),
    height: parseFloat(heightInput?.value || '0'),
    activity: parseFloat(activitySelect?.value || '1.55'),
    lossRate: parseFloat(lossRateSelect?.value || '0'),
    proteinRatio: parseFloat(proteinRatioSelect?.value || '2.2'),
    fatRatio: parseFloat(fatRatioSelect?.value || '0.8')
  };
  
  // Validation
  if (!profile.age || !profile.weight || !profile.height) {
    showMessage('Please fill in all required fields before saving', 'error');
    return;
  }
  
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  try {
    localStorage.setItem(`macroProfile_${userId}`, JSON.stringify(profile));
    showMessage('Macro profile saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving macro profile:', error);
    showMessage('Error saving macro profile', 'error');
  }
}

// Show message helper
function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('macro-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'macro-message';
    messageEl.className = 'message';
    const container = document.getElementById('macro-calculator') || document.body;
    container.insertBefore(messageEl, container.firstChild);
  }
  
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  // Hide after 4 seconds
  setTimeout(() => {
    if (messageEl) messageEl.style.display = 'none';
  }, 4000);
}

// Make functions globally available
declare global {
  interface Window {
    calculateMacros: () => void;
    saveMacroProfile: () => void;
  }
}

window.calculateMacros = calculateMacros;
window.saveMacroProfile = saveMacroProfile; 