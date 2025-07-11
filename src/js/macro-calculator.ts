// Macro Calculator Module for NutriValor
import { getCurrentAuthUser } from './auth';
import { loadProfileFromDatabase } from './database';
import { supabase } from './supabase-client';

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
  // Removed excessive logging for performance
  await loadSavedProfile();
  setDefaultValues();
  setupFieldListeners();
}

// Setup listeners to check when fields are filled and hide tip if complete
function setupFieldListeners(): void {
  const ageInput = document.getElementById('macro-age') as HTMLInputElement;
  const genderSelect = document.getElementById('macro-gender') as HTMLSelectElement;
  const heightInput = document.getElementById('macro-height') as HTMLInputElement;

  const checkFieldsAndHideTip = () => {
    // Check if all critical fields are now filled
    if (ageInput?.value && genderSelect?.value && heightInput?.value) {
      hidePersistentProfileTip();
    }
  };

  // Add listeners to all critical fields
  if (ageInput) ageInput.addEventListener('input', checkFieldsAndHideTip);
  if (genderSelect) genderSelect.addEventListener('change', checkFieldsAndHideTip);
  if (heightInput) heightInput.addEventListener('input', checkFieldsAndHideTip);
}

// Load saved profile from localStorage
async function loadSavedProfile(): Promise<void> {
  try {
    // First try to load from Supabase profile (height, age, gender)
    const userProfile = await loadProfileFromDatabase();
    if (userProfile) {
      // Removed excessive logging for performance
      
      // Pre-populate with profile data
      const ageInput = document.getElementById('macro-age') as HTMLInputElement;
      const genderSelect = document.getElementById('macro-gender') as HTMLSelectElement;
      const heightInput = document.getElementById('macro-height') as HTMLInputElement;
      
      if (ageInput && userProfile.age) {
        ageInput.value = userProfile.age.toString();
        addProfileIndicator(ageInput, 'Age loaded from profile');
        // Removed excessive logging for performance
      }
      if (genderSelect && userProfile.gender) {
        genderSelect.value = userProfile.gender;
        addProfileIndicator(genderSelect, 'Gender loaded from profile');
        // Removed excessive logging for performance
      }
      if (heightInput && userProfile.height) {
        // Convert height to cm if needed
        let heightInCm = userProfile.height;
        if (userProfile.height_unit === 'ft') {
          heightInCm = userProfile.height * 30.48; // Convert feet to cm
        }
        heightInput.value = heightInCm.toString();
        addProfileIndicator(heightInput, `Height loaded from profile (${userProfile.height} ${userProfile.height_unit})`);
        // Removed excessive logging for performance
      }
    }
    
    // Check if critical profile fields are missing and show helpful tip
    setTimeout(() => {
      const ageInput = document.getElementById('macro-age') as HTMLInputElement;
      const genderSelect = document.getElementById('macro-gender') as HTMLSelectElement;
      const heightInput = document.getElementById('macro-height') as HTMLInputElement;
      
      const missingFields = [];
      if (!ageInput?.value) missingFields.push('Age');
      if (!genderSelect?.value || genderSelect?.value === '') missingFields.push('Gender');
      if (!heightInput?.value) missingFields.push('Height');
      
      if (missingFields.length > 0) {
        const missingText = missingFields.join(', ');
        showPersistentProfileTip(`💡 Tip: Fill out your profile in Settings to auto-populate ${missingText}`);
      } else {
        // Hide the tip if all fields are filled
        hidePersistentProfileTip();
      }
    }, 500);
    
    // Then load macro-specific settings (weight, activity, etc.)
    const user = getCurrentAuthUser();
    const userId = user?.id || 'anonymous';
    
    const savedProfile = localStorage.getItem(`macroProfile_${userId}`);
    if (savedProfile) {
      try {
        const profile: MacroProfile = JSON.parse(savedProfile);
        
        // Only populate fields that aren't already set from user profile
        if (!userProfile) {
          populateForm(profile);
        } else {
          // Populate only macro-specific fields (not personal data like age, height, gender, weight)
          const weightInput = document.getElementById('macro-weight') as HTMLInputElement;
          const activitySelect = document.getElementById('macro-activity') as HTMLSelectElement;
          const lossRateSelect = document.getElementById('macro-lossRate') as HTMLSelectElement;
          const proteinRatioSelect = document.getElementById('macro-proteinRatio') as HTMLSelectElement;
          const fatRatioSelect = document.getElementById('macro-fatRatio') as HTMLSelectElement;
          
          // Only load non-personal data from localStorage
          if (activitySelect) activitySelect.value = profile.activity.toString();
          if (lossRateSelect) lossRateSelect.value = profile.lossRate.toString();
          if (proteinRatioSelect) proteinRatioSelect.value = profile.proteinRatio.toString();
          if (fatRatioSelect) fatRatioSelect.value = profile.fatRatio.toString();
          
          // Don't load weight from localStorage - let user enter it manually
        }
      } catch (error) {
        // Removed excessive logging for performance
      }
    } else {
      // Removed excessive logging for performance
    }
  } catch (error) {
    // Removed excessive logging for performance
    // Fall back to local macro profile only
    const user = getCurrentAuthUser();
    const userId = user?.id || 'anonymous';
    
    const savedProfile = localStorage.getItem(`macroProfile_${userId}`);
    if (savedProfile) {
      try {
        const profile: MacroProfile = JSON.parse(savedProfile);
        populateForm(profile);
      } catch (error) {
        // Removed excessive logging for performance
      }
    }
  }
}

// Set default values only for fields that should have reasonable defaults
function setDefaultValues(): void {
  // Only set defaults for non-personal data fields
  // Age, Weight, and Height should come from profile or user input only
  // Activity level and ratios can have sensible defaults
  
  const activitySelect = document.getElementById('macro-activity') as HTMLSelectElement;
  const lossRateSelect = document.getElementById('macro-lossRate') as HTMLSelectElement;
  const proteinRatioSelect = document.getElementById('macro-proteinRatio') as HTMLSelectElement;
  const fatRatioSelect = document.getElementById('macro-fatRatio') as HTMLSelectElement;
  
  // Only set defaults if no value is already selected
  if (activitySelect && !activitySelect.value) activitySelect.value = '1.55'; // Moderately active
  if (lossRateSelect && !lossRateSelect.value) lossRateSelect.value = '0'; // Maintain weight
  if (proteinRatioSelect && !proteinRatioSelect.value) proteinRatioSelect.value = '2.2'; // 2.2g per kg
  if (fatRatioSelect && !fatRatioSelect.value) fatRatioSelect.value = '0.8'; // 0.8g per kg
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
    // Removed excessive logging for performance
    showMessage('Error saving macro profile', 'error');
  }
}

// Show message helper
function showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success'): void {
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

// Show persistent profile tip (orange warning that doesn't auto-hide)
function showPersistentProfileTip(message: string): void {
  // Create or update persistent tip element
  let tipEl = document.getElementById('macro-profile-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'macro-profile-tip';
    tipEl.className = 'message warning';
    const container = document.getElementById('macro-calculator') || document.body;
    container.insertBefore(tipEl, container.firstChild);
  }
  
  tipEl.textContent = message;
  tipEl.className = 'message warning';
  tipEl.style.display = 'block';
  
  // Don't auto-hide - it stays until profile is complete
}

// Hide persistent profile tip
function hidePersistentProfileTip(): void {
  const tipEl = document.getElementById('macro-profile-tip');
  if (tipEl) {
    tipEl.style.display = 'none';
  }
}

// Add visual indicator that data came from profile
function addProfileIndicator(element: HTMLElement, tooltipText: string): void {
  // Remove any existing indicator
  const existingIndicator = element.parentElement?.querySelector('.profile-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Create indicator element
  const indicator = document.createElement('span');
  indicator.className = 'profile-indicator';
  indicator.innerHTML = '👤';
  indicator.title = tooltipText;
  indicator.style.marginLeft = '8px';
  indicator.style.color = '#10b981';
  indicator.style.fontSize = '14px';
  indicator.style.cursor = 'help';
  indicator.style.filter = 'grayscale(0.3) brightness(1.2)';
  
  // Add some styling to the input to show it's from profile
  element.style.borderLeft = '3px solid #10b981';
  
  // Insert indicator after the element
  if (element.parentElement) {
    element.parentElement.style.position = 'relative';
    element.parentElement.appendChild(indicator);
  }
}

// Remove profile indicators (when data is manually changed)
function removeProfileIndicator(element: HTMLElement): void {
  const indicator = element.parentElement?.querySelector('.profile-indicator');
  if (indicator) {
    indicator.remove();
  }
  element.style.borderLeft = '';
}

// Refresh macro calculator data (useful when profile is updated)
export async function refreshMacroCalculator(): Promise<void> {
  try {
    // Refresh macro calculator data
    await loadSavedProfile();
    calculateMacros();
    
    // Macro calculator refreshed
  } catch (error) {
    // Removed excessive logging for performance
    showMessage('Error refreshing calculator', 'error');
  }
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