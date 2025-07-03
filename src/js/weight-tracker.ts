// Weight Tracker Module for NutriValor
import { getCurrentAuthUser } from './auth';
import { saveWeightEntryToDatabase, loadWeightEntriesFromDatabase, clearAllWeightEntriesFromDatabase } from './database';

interface WeightEntry {
  date: string;
  weight: number;
  user_id?: string;
}

let weights: WeightEntry[] = [];
let startingWeight: string = '';
let idealWeight: string = '';
let targetDate: string = '';
let weightChart: any = null;
let isClearingData: boolean = false;

// Initialize weight tracker functionality
export async function initializeWeightTracker(): Promise<void> {
  // Removed excessive logging for performance
  await loadWeightData();
  setupWeightChart();
  setupEventListeners();
  setupFieldListeners();
  updateChart();
  updateProgress();
  setTodayAsDefault();
  checkForMissingProfileData();
}

// Setup listeners to check when fields are filled and hide tip if complete
function setupFieldListeners(): void {
  const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;

  const checkFieldsAndHideTip = () => {
    // Check if ideal weight is now filled
    if (idealWeightInput?.value) {
      hidePersistentProfileTip();
    }
  };

  // Add listener to ideal weight field
  if (idealWeightInput) idealWeightInput.addEventListener('input', checkFieldsAndHideTip);
}

// Check for missing profile data and show persistent tip
function checkForMissingProfileData(): void {
  setTimeout(() => {
    const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
    
    if (!idealWeightInput?.value) {
      showPersistentProfileTip('💡 Tip: Fill out your ideal weight in Settings → Profile to auto-populate here');
    } else {
      hidePersistentProfileTip();
    }
  }, 500);
}

// Load weight data from Supabase
async function loadWeightData(): Promise<void> {
  // Skip loading if we're currently clearing data
  if (isClearingData) {
    return;
  }
  
  try {
    const weightEntries = await loadWeightEntriesFromDatabase();
    weights = weightEntries.map(entry => ({
      date: entry.entry_date,
      weight: entry.weight,
      user_id: entry.user_id
    }));
  } catch (error) {
    weights = [];
  }
  
  // Load ideal weight from user profile, fallback to localStorage for other goals
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  try {
    // Import database functions to load profile
    const { loadProfileFromDatabase } = await import('./database');
    const profileData = await loadProfileFromDatabase();
    
    if (profileData && profileData.ideal_weight) {
      // Convert weight to kg if it's in lbs
      let idealWeightInKg = profileData.ideal_weight;
      if (profileData.weight_unit === 'lbs') {
        idealWeightInKg = profileData.ideal_weight * 0.453592; // Convert lbs to kg
      }
      idealWeight = idealWeightInKg.toString();
      
      // Add visual indicator that ideal weight came from profile
      setTimeout(() => {
        const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
        if (idealWeightInput) {
          addProfileIndicator(idealWeightInput, `Ideal weight loaded from profile (${profileData.ideal_weight} ${profileData.weight_unit})`);
        }
      }, 100); // Small delay to ensure DOM is ready
    } else {
      // Fallback to localStorage
      idealWeight = localStorage.getItem(`idealWeight_${userId}`) || '';
    }
  } catch (error) {
    idealWeight = localStorage.getItem(`idealWeight_${userId}`) || '';
  }
  
  // Other goals still stored locally
  startingWeight = localStorage.getItem(`startingWeight_${userId}`) || '';
  targetDate = localStorage.getItem(`targetDate_${userId}`) || '';
}

// Save goals data to localStorage (weight entries are saved to Supabase)
function saveGoalsData(): void {
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  localStorage.setItem(`startingWeight_${userId}`, startingWeight);
  localStorage.setItem(`idealWeight_${userId}`, idealWeight);
  localStorage.setItem(`targetDate_${userId}`, targetDate);
}

// Set today as default date
function setTodayAsDefault(): void {
  const today = new Date().toISOString().split('T')[0];
  const entryDateInput = document.getElementById('entryDate') as HTMLInputElement;
  if (entryDateInput && !entryDateInput.value) {
    entryDateInput.value = today;
  }
}

// Setup event listeners
function setupEventListeners(): void {
  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
  const targetDateInput = document.getElementById('targetDate') as HTMLInputElement;
  
  if (startInput) {
    startInput.value = startingWeight;
    startInput.addEventListener('input', saveGoalAndUpdateWithoutPopulate);
    startInput.addEventListener('change', saveGoalAndUpdate);
    
    // Also listen for blur event as backup for change
    startInput.addEventListener('blur', () => {
      saveGoalAndUpdate();
    });
  }
  
  if (idealWeightInput) {
    idealWeightInput.value = idealWeight;
    idealWeightInput.addEventListener('change', saveGoalAndUpdate);
  }
  
  if (targetDateInput) {
    targetDateInput.value = targetDate;
    targetDateInput.addEventListener('change', saveGoalAndUpdate);
  }
}

// Setup weight chart
function setupWeightChart(): void {
  const ctx = document.getElementById('weightChart') as HTMLCanvasElement;
  if (!ctx) return;

  // Load Chart.js if not already loaded
  if (typeof (window as any).Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => createWeightChart();
    document.head.appendChild(script);
  } else {
    createWeightChart();
  }
}

// Create weight chart
function createWeightChart(): void {
  const ctx = document.getElementById('weightChart') as HTMLCanvasElement;
  if (!ctx) return;

  // Destroy existing chart if it exists
  if (weightChart) {
    weightChart.destroy();
    weightChart = null;
  }

  const chartCtx = ctx.getContext('2d');
  if (!chartCtx) return;

  weightChart = new (window as any).Chart(chartCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Actual Weight',
        data: [],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.3,
        fill: true
      }, {
        label: 'Ideal Path',
        data: [],
        borderColor: '#10b981',
        borderDash: [5, 5],
        tension: 0,
        fill: false,
        pointRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { 
          title: { display: true, text: 'Date' }
        },
        y: { 
          title: { display: true, text: 'Weight (kg)' }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Weight Progress',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            padding: 20,
            font: {
              size: 12
            }
          }
        }
      }
    }
  });
}

// Calculate ideal weight path
function calculateIdealPath(labels: string[]): any[] {
  // Need at least starting weight, ideal weight, and some weight entries
  if (!startingWeight || !idealWeight || weights.length === 0) {
    return [];
  }
  
  const firstDateStr = weights[0].date;
  const startDate = new Date(firstDateStr).getTime();
  
  // If no target date, use a reasonable timeline (e.g., 6 months from first entry)
  let endDate: number;
  if (targetDate) {
    endDate = new Date(targetDate).getTime();
  } else {
    // Default to 6 months from start date if no target date
    endDate = startDate + (6 * 30 * 24 * 60 * 60 * 1000); // 6 months in milliseconds
  }
  
  const totalTime = endDate - startDate;
  if (totalTime <= 0) {
    return [];
  }
  
  const startWeight = parseFloat(startingWeight);
  const endWeight = parseFloat(idealWeight);
  const weightDiff = endWeight - startWeight;

  // Create a combined set of labels to ensure the ideal line extends properly
  const allLabels = targetDate ? [...new Set([...labels, targetDate])].sort() : labels;

  const idealPath = allLabels.map(label => {
    const currentDate = new Date(label).getTime();
    if (currentDate < startDate) return null;

    const timeElapsed = currentDate - startDate;
    const progress = Math.min(1, timeElapsed / totalTime);
    const idealWeightForDate = startWeight + (weightDiff * progress);
    return { x: label, y: parseFloat(idealWeightForDate.toFixed(1)) };
  }).filter(item => item !== null);
  
  return idealPath;
}

// Update chart with current data
function updateChart(): void {
  if (!weightChart) {
    return;
  }
  
  weights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = weights.map(w => w.date);

  // Update actual weight data (dataset 0)
  const actualWeightData = weights.map(w => ({ x: w.date, y: w.weight }));
  weightChart.data.datasets[0].data = actualWeightData;
  
  // Update ideal path data (dataset 1)
  const idealPathData = calculateIdealPath(labels);
  weightChart.data.datasets[1].data = idealPathData;
  
  // Set chart labels
  const allLabels = [...new Set([...labels, targetDate].filter(Boolean))].sort();
  if (targetDate && startingWeight && idealWeight) {
    weightChart.data.labels = allLabels;
  } else {
    weightChart.data.labels = labels;
  }

  weightChart.update();
}

// Update progress text
function updateProgress(): void {
  const progressText = document.getElementById('progressText');
  if (!progressText) return;
  
  // Clear progress text if no starting weight or no weight entries
  if (!startingWeight || weights.length === 0) {
    progressText.textContent = '';
    return;
  }
  
  // Additional check: ensure we have valid numeric starting weight
  const startWeight = parseFloat(startingWeight);
  if (isNaN(startWeight)) {
    progressText.textContent = '';
    return;
  }
  
  if (weights.length > 0 && !startingWeight) {
    progressText.textContent = 'Please click "Clear All Data" to reset tracking.';
    progressText.style.color = '#d97706';
    return;
  }
  
  const latest = weights[weights.length - 1].weight;
  const diff = (startWeight - latest).toFixed(1);
  
  if (parseFloat(diff) > 0) {
    progressText.textContent = `Congratulations! You've lost ${diff}kg so far.`;
    progressText.style.color = '#065f46';
  } else if (parseFloat(diff) < 0) {
    progressText.textContent = `You've gained ${Math.abs(parseFloat(diff))}kg. Keep going!`;
    progressText.style.color = '#991b1b';
  } else {
    progressText.textContent = 'You\'re at your starting weight. Keep going!';
    progressText.style.color = '#1e293b';
  }
}

// Add weight entry
export async function addWeightEntry(): Promise<void> {
  const dateInput = document.getElementById('entryDate') as HTMLInputElement;
  const weightInput = document.getElementById('entryWeight') as HTMLInputElement;
  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  
  const date = dateInput?.value;
  const weight = parseFloat(weightInput?.value || '0');
  const start = parseFloat(startInput?.value || '0');
  
  if (!date || !weight) {
    showMessage('Please enter a date and weight.');
    return;
  }
  
  if (!start && !startingWeight) {
    showMessage('Please enter a starting weight first.');
    return;
  }
  
  if (start && !startingWeight) {
    startingWeight = start.toString();
  }
  
  try {
    // Save to Supabase
    await saveWeightEntryToDatabase(weight, date);
    
    // Update local array for immediate UI update
    const existingEntryIndex = weights.findIndex(w => w.date === date);
    if (existingEntryIndex > -1) {
      weights[existingEntryIndex].weight = weight;
    } else {
      weights.push({ date, weight });
    }
    
    saveGoalsData(); // Save goals locally
    updateChart();
    updateProgress();
    
    // Clear the weight input
    if (weightInput) weightInput.value = '';
    
    showMessage('Weight entry added successfully!');
  } catch (error) {
    showMessage('Error saving weight entry. Please try again.');
  }
}

// Save goals and update chart/progress (without population logic - for input events)
async function saveGoalAndUpdateWithoutPopulate(): Promise<void> {
  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
  const targetDateInput = document.getElementById('targetDate') as HTMLInputElement;
  
  // For input events, we only update ideal weight and target date, NOT starting weight
  // This prevents the starting weight from being updated on every keystroke
  const newIdealWeight = idealWeightInput?.value || '';
  const newTargetDate = targetDateInput?.value || '';

  // Check if ideal weight changed before updating
  const idealWeightChanged = newIdealWeight && newIdealWeight !== idealWeight;
  
  // Update local values (but skip starting weight for input events)
  idealWeight = newIdealWeight;
  targetDate = newTargetDate;

  // Save to localStorage for target date only (starting weight saved in change event)
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  localStorage.setItem(`idealWeight_${userId}`, idealWeight);
  localStorage.setItem(`targetDate_${userId}`, targetDate);
  
  // Sync ideal weight to user profile if it changed
  if (idealWeightChanged) {
    try {
      const { loadProfileFromDatabase, saveProfileToDatabase } = await import('./database');
      const profileData = await loadProfileFromDatabase();
      
      if (profileData) {
        // Update the profile with the new ideal weight
        const updatedProfileData = {
          name: profileData.name,
          dateOfBirth: profileData.date_of_birth,
          age: profileData.age,
          gender: profileData.gender,
          height: profileData.height,
          heightUnit: profileData.height_unit,
          idealWeight: newIdealWeight, // Update ideal weight
          weightUnit: profileData.weight_unit || 'kg',
          country: profileData.country,
          avatar: profileData.avatar_url
        };
        
        await saveProfileToDatabase(updatedProfileData);
      }
    } catch (error) {
      // Continue with local storage update even if profile sync fails
    }
  }

  updateChart();
  updateProgress();
}

// Save goals and update chart/progress (with population logic - for change events)
async function saveGoalAndUpdate(): Promise<void> {
  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
  const targetDateInput = document.getElementById('targetDate') as HTMLInputElement;
  
  const newStartingWeight = startInput?.value || '';
  const newIdealWeight = idealWeightInput?.value || '';
  const newTargetDate = targetDateInput?.value || '';

  // Check if ideal weight changed before updating
  const idealWeightChanged = newIdealWeight && newIdealWeight !== idealWeight;

  // Update local values
  startingWeight = newStartingWeight;
  idealWeight = newIdealWeight;
  targetDate = newTargetDate;

  // Save to localStorage for starting weight and target date
  saveGoalsData();
  
  // Simple logic: populate weight field if starting weight exists and weight field is empty
  const entryWeightInput = document.getElementById('entryWeight') as HTMLInputElement;
  const today = new Date().toISOString().split('T')[0];
  const existingTodayEntry = weights.find(w => w.date === today);
  
  const shouldPopulateWeight = newStartingWeight && 
    entryWeightInput && 
    !entryWeightInput.value && 
    !existingTodayEntry;
    
  if (shouldPopulateWeight) {
    entryWeightInput.value = newStartingWeight;
    showMessage(`💡 Your starting weight (${newStartingWeight}kg) has been added to today's weight field. Click "Add Entry" to save it.`);
  }
  
  // Sync ideal weight to user profile if it changed
  if (idealWeightChanged) {
    try {
      const { loadProfileFromDatabase, saveProfileToDatabase } = await import('./database');
      const profileData = await loadProfileFromDatabase();
      
      if (profileData) {
        // Update the profile with the new ideal weight
        const updatedProfileData = {
          name: profileData.name,
          dateOfBirth: profileData.date_of_birth,
          age: profileData.age,
          gender: profileData.gender,
          height: profileData.height,
          heightUnit: profileData.height_unit,
          idealWeight: newIdealWeight, // Update ideal weight
          weightUnit: profileData.weight_unit || 'kg',
          country: profileData.country,
          avatar: profileData.avatar_url
        };
        
        await saveProfileToDatabase(updatedProfileData);
      }
    } catch (error) {
      // Continue with local storage update even if profile sync fails
    }
  }

  updateChart();
  updateProgress();
}

// Populate the Weight (kg) field with starting weight (user can then choose to add it)
function populateWeightFieldWithStartingWeight(startingWeightValue: number): void {
  if (isNaN(startingWeightValue) || startingWeightValue <= 0) {
    return;
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  // Check if there's already a weight entry for today
  const existingTodayEntry = weights.find(w => w.date === today);
  if (existingTodayEntry) {
    return;
  }
  
  const entryWeightInput = document.getElementById('entryWeight') as HTMLInputElement;
  
  if (entryWeightInput) {
    entryWeightInput.value = startingWeightValue.toString();
    showMessage(`💡 Your starting weight (${startingWeightValue}kg) has been added to today's weight field. Click "Add Entry" to save it.`);
  }
}

// Clear all weight data
export async function clearWeightData(): Promise<void> {
  if (!confirm('Are you sure you want to delete all weight data? This cannot be undone.')) {
    return;
  }
  
  // Set flag to prevent data reloading during clearing
  isClearingData = true;
  
  try {
    // Delete all weight entries from Supabase
    await clearAllWeightEntriesFromDatabase();
    
    // Verify clearing worked by trying to load again
    const verifyEntries = await loadWeightEntriesFromDatabase();
    
    if (verifyEntries.length > 0) {
      showMessage('Warning: Not all data was cleared. Please try again.');
      return; // Don't continue with clearing if database still has data
    }
    
    const user = getCurrentAuthUser();
    const userId = user?.id || 'anonymous';
    
    // Clear ALL goals from localStorage first
    localStorage.removeItem(`startingWeight_${userId}`);
    localStorage.removeItem(`idealWeight_${userId}`);
    localStorage.removeItem(`targetDate_${userId}`);

    // Reset ALL local data first
    weights = [];
    startingWeight = '';
    idealWeight = '';
    targetDate = '';

    // Clear ALL form inputs first
    const startInput = document.getElementById('startingWeight') as HTMLInputElement;
    const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
    const targetDateInput = document.getElementById('targetDate') as HTMLInputElement;
    const progressText = document.getElementById('progressText');
    const entryWeightInput = document.getElementById('entryWeight') as HTMLInputElement;
    
    if (startInput) startInput.value = '';
    if (idealWeightInput) idealWeightInput.value = '';
    if (targetDateInput) targetDateInput.value = '';
    if (entryWeightInput) entryWeightInput.value = '';
    if (progressText) progressText.textContent = '';

    // Check if we should restore ideal weight from profile
    let shouldRestoreIdealWeight = false;
    try {
      const { loadProfileFromDatabase } = await import('./database');
      const profileData = await loadProfileFromDatabase();
      if (profileData && profileData.ideal_weight) {
        shouldRestoreIdealWeight = true;
      }
    } catch (error) {
      // Don't restore ideal weight if no profile found
    }

    // Clear and update chart AFTER data is reset
    if (weightChart) {
      weightChart.data.labels = [];
      weightChart.data.datasets[0].data = [];
      weightChart.data.datasets[1].data = [];
      weightChart.update();
    }
    
    // Hide any persistent tips
    hidePersistentProfileTip();
    
    // Restore ideal weight from profile if it exists
    if (shouldRestoreIdealWeight) {
      await loadWeightData();
      
      // Update the ideal weight input field with profile value
      const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
      if (idealWeightInput && idealWeight) {
        idealWeightInput.value = idealWeight;
        addProfileIndicator(idealWeightInput, 'Ideal weight from profile');
      }
    }
    
    showMessage('All weight data cleared successfully!');
  } catch (error) {
    showMessage('Error clearing weight data. Please try again.');
  } finally {
    // Reset clearing flag
    isClearingData = false;
  }
}

// Show message helper
function showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('weight-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'weight-message';
    messageEl.className = 'message';
    const container = document.getElementById('weight-tracker') || document.body;
    container.insertBefore(messageEl, container.firstChild);
  }
  
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  // Hide after 3 seconds
  setTimeout(() => {
    if (messageEl) messageEl.style.display = 'none';
  }, 3000);
}

// Show persistent profile tip (orange warning that doesn't auto-hide)
function showPersistentProfileTip(message: string): void {
  // Create or update persistent tip element
  let tipEl = document.getElementById('weight-profile-tip');
  if (!tipEl) {
    tipEl = document.createElement('div');
    tipEl.id = 'weight-profile-tip';
    tipEl.className = 'message warning';
    const container = document.getElementById('weight-tracker') || document.body;
    container.insertBefore(tipEl, container.firstChild);
  }
  
  tipEl.textContent = message;
  tipEl.className = 'message warning';
  tipEl.style.display = 'block';
}

// Hide persistent profile tip
function hidePersistentProfileTip(): void {
  const tipEl = document.getElementById('weight-profile-tip');
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

// Refresh weight tracker data (useful when profile is updated)
export async function refreshWeightTracker(): Promise<void> {
  await loadWeightData();
  
  // Recheck if tip should be shown/hidden after refresh
  setTimeout(() => {
    if (!idealWeightInput?.value) {
      showPersistentProfileTip('💡 Tip: Fill out your ideal weight in Settings → Profile to auto-populate here');
    } else {
      hidePersistentProfileTip();
    }
  }, 100);
  
  updateChart();
  updateProgress();
}

// Make functions globally available
declare global {
  interface Window {
    addWeightEntry: () => void;
    clearWeightData: () => void;
  }
}

window.addWeightEntry = addWeightEntry;
window.clearWeightData = clearWeightData; 