// Weight Tracker Module for NutriValor
import { getCurrentAuthUser } from './auth';

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

// Initialize weight tracker functionality
export async function initializeWeightTracker(): Promise<void> {
  console.log('⚖️ Initializing weight tracker...');
  loadWeightData();
  setupWeightChart();
  setupEventListeners();
  updateChart();
  updateProgress();
  setTodayAsDefault();
}

// Load weight data from localStorage
function loadWeightData(): void {
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  weights = JSON.parse(localStorage.getItem(`weights_${userId}`) || '[]');
  startingWeight = localStorage.getItem(`startingWeight_${userId}`) || '';
  idealWeight = localStorage.getItem(`idealWeight_${userId}`) || '';
  targetDate = localStorage.getItem(`targetDate_${userId}`) || '';
}

// Save weight data to localStorage
function saveWeightData(): void {
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  localStorage.setItem(`weights_${userId}`, JSON.stringify(weights));
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
    startInput.addEventListener('change', saveGoalAndUpdate);
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
  if (!startingWeight || !idealWeight || !targetDate || weights.length === 0) {
    return [];
  }
  
  const firstDateStr = weights[0].date;
  const startDate = new Date(firstDateStr).getTime();
  const endDate = new Date(targetDate).getTime();
  const totalTime = endDate - startDate;
  
  if (totalTime <= 0) return [];
  
  const startWeight = parseFloat(startingWeight);
  const endWeight = parseFloat(idealWeight);
  const weightDiff = endWeight - startWeight;

  // Create a combined set of labels to ensure the ideal line extends to the target date
  const allLabels = [...new Set([...labels, targetDate])].sort();

  return allLabels.map(label => {
    const currentDate = new Date(label).getTime();
    if (currentDate < startDate) return null;

    const timeElapsed = currentDate - startDate;
    const progress = Math.min(1, timeElapsed / totalTime);
    const idealWeightForDate = startWeight + (weightDiff * progress);
    return { x: label, y: idealWeightForDate.toFixed(1) };
  }).filter(item => item !== null);
}

// Update chart with current data
function updateChart(): void {
  if (!weightChart) return;
  
  weights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = weights.map(w => w.date);

  weightChart.data.datasets[0].data = weights.map(w => ({ x: w.date, y: w.weight }));
  
  const idealPathData = calculateIdealPath(labels);
  weightChart.data.datasets[1].data = idealPathData;
  
  const allLabels = [...new Set([...labels, targetDate])].sort();
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
  if (!progressText || !startingWeight || weights.length === 0) {
    if (progressText) progressText.textContent = '';
    return;
  }
  
  const latest = weights[weights.length - 1].weight;
  const diff = (parseFloat(startingWeight) - latest).toFixed(1);
  
  if (parseFloat(diff) > 0) {
    progressText.textContent = `Congratulations! You've lost ${diff}kg so far.`;
    progressText.style.color = '#065f46';
  } else if (parseFloat(diff) < 0) {
    progressText.textContent = `You've gained ${Math.abs(parseFloat(diff))}kg. Keep going!`;
    progressText.style.color = '#991b1b';
  } else {
    progressText.textContent = 'Your weight is the same as your starting weight.';
    progressText.style.color = '#1e293b';
  }
}

// Add weight entry
export function addWeightEntry(): void {
  const dateInput = document.getElementById('entryDate') as HTMLInputElement;
  const weightInput = document.getElementById('entryWeight') as HTMLInputElement;
  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  
  const date = dateInput?.value;
  const weight = parseFloat(weightInput?.value || '0');
  const start = parseFloat(startInput?.value || '0');
  
  if (!date || !weight) {
    showMessage('Please enter a date and weight.', 'error');
    return;
  }
  
  if (!start && !startingWeight) {
    showMessage('Please enter a starting weight first.', 'error');
    return;
  }
  
  if (start && !startingWeight) {
    startingWeight = start.toString();
  }
  
  const existingEntryIndex = weights.findIndex(w => w.date === date);
  if (existingEntryIndex > -1) {
    weights[existingEntryIndex].weight = weight;
  } else {
    weights.push({ date, weight });
  }
  
  saveWeightData();
  updateChart();
  updateProgress();
  
  // Clear the weight input
  if (weightInput) weightInput.value = '';
  
  showMessage('Weight entry added successfully!', 'success');
}

// Save goals and update
function saveGoalAndUpdate(): void {
  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
  const targetDateInput = document.getElementById('targetDate') as HTMLInputElement;
  
  startingWeight = startInput?.value || '';
  idealWeight = idealWeightInput?.value || '';
  targetDate = targetDateInput?.value || '';

  saveWeightData();
  updateChart();
  updateProgress();
}

// Clear all weight data
export function clearWeightData(): void {
  if (!confirm('Are you sure you want to delete all weight data? This cannot be undone.')) {
    return;
  }
  
  const user = getCurrentAuthUser();
  const userId = user?.id || 'anonymous';
  
  localStorage.removeItem(`weights_${userId}`);
  localStorage.removeItem(`startingWeight_${userId}`);
  localStorage.removeItem(`idealWeight_${userId}`);
  localStorage.removeItem(`targetDate_${userId}`);

  weights = [];
  startingWeight = '';
  idealWeight = '';
  targetDate = '';

  if (weightChart) {
    weightChart.data.labels = [];
    weightChart.data.datasets[0].data = [];
    weightChart.data.datasets[1].data = [];
    weightChart.update();
  }

  const startInput = document.getElementById('startingWeight') as HTMLInputElement;
  const idealWeightInput = document.getElementById('idealWeight') as HTMLInputElement;
  const targetDateInput = document.getElementById('targetDate') as HTMLInputElement;
  const progressText = document.getElementById('progressText');
  
  if (startInput) startInput.value = '';
  if (idealWeightInput) idealWeightInput.value = '';
  if (targetDateInput) targetDateInput.value = '';
  if (progressText) progressText.textContent = '';
  
  showMessage('All weight data cleared successfully!', 'success');
}

// Show message helper
function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
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

// Make functions globally available
declare global {
  interface Window {
    addWeightEntry: () => void;
    clearWeightData: () => void;
  }
}

window.addWeightEntry = addWeightEntry;
window.clearWeightData = clearWeightData; 