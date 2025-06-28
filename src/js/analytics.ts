// Analytics Module for Nutrivalor
let nutritionChart = null;

// Update analytics display
function updateAnalytics() {
    updateNutritionStats();
    updateNutritionChart();
}

// Update nutrition statistics
function updateNutritionStats() {
    // Calculate totals from shopping list
    let totalCarbs = 0;
    let totalFat = 0;
    let totalProtein = 0;
    
    if (shoppingList && shoppingList.length > 0) {
        shoppingList.forEach(item => {
            totalCarbs += (item.carbs || 0) * item.quantity;
            totalFat += (item.fat || 0) * item.quantity;
            totalProtein += (item.protein || 0) * item.quantity;
        });
    }
    
    // Update stat cards
    const totalCarbsEl = document.getElementById('totalCarbs');
    const totalFatEl = document.getElementById('totalFat');
    const totalProteinEl = document.getElementById('totalProtein');
    
    if (totalCarbsEl) totalCarbsEl.textContent = formatNutrition(totalCarbs) + 'g';
    if (totalFatEl) totalFatEl.textContent = formatNutrition(totalFat) + 'g';
    if (totalProteinEl) totalProteinEl.textContent = formatNutrition(totalProtein) + 'g';
}

// Update nutrition chart
function updateNutritionChart() {
    const canvas = document.getElementById('nutritionChart');
    if (!canvas) return;
    
    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => createNutritionChart();
        document.head.appendChild(script);
    } else {
        createNutritionChart();
    }
}

// Create nutrition chart
function createNutritionChart() {
    const canvas = document.getElementById('nutritionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Calculate data from shopping list
    let totalCarbs = 0;
    let totalFat = 0;
    let totalProtein = 0;
    
    if (shoppingList && shoppingList.length > 0) {
        shoppingList.forEach(item => {
            totalCarbs += (item.carbs || 0) * item.quantity;
            totalFat += (item.fat || 0) * item.quantity;
            totalProtein += (item.protein || 0) * item.quantity;
        });
    }
    
    // Destroy existing chart if it exists
    if (nutritionChart) {
        nutritionChart.destroy();
    }
    
    // Create new chart
    nutritionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Carbs', 'Fat', 'Protein'],
            datasets: [{
                label: 'Nutrition Breakdown',
                data: [totalCarbs, totalFat, totalProtein],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Nutrition Breakdown',
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

// Generate nutrition report
function generateNutritionReport() {
    if (!shoppingList || shoppingList.length === 0) {
        showMessage('No data available for report. Add items to your shopping list first.', 'error');
        return;
    }
    
    let totalCarbs = 0;
    let totalFat = 0;
    let totalProtein = 0;
    let totalCalories = 0;
    
    // Calculate totals and estimated calories
    shoppingList.forEach(item => {
        const carbs = (item.carbs || 0) * item.quantity;
        const fat = (item.fat || 0) * item.quantity;
        const protein = (item.protein || 0) * item.quantity;
        
        totalCarbs += carbs;
        totalFat += fat;
        totalProtein += protein;
        
        // Estimated calories: 4 cal/g for carbs and protein, 9 cal/g for fat
        totalCalories += (carbs * 4) + (protein * 4) + (fat * 9);
    });
    
    const report = {
        date: new Date().toLocaleDateString(),
        items: shoppingList.length,
        nutrition: {
            carbs: formatNutrition(totalCarbs),
            fat: formatNutrition(totalFat),
            protein: formatNutrition(totalProtein),
            calories: Math.round(totalCalories)
        },
        breakdown: shoppingList.map(item => ({
            name: item.name,
            brand: item.brand || '',
            quantity: item.quantity,
            carbs: formatNutrition((item.carbs || 0) * item.quantity),
            fat: formatNutrition((item.fat || 0) * item.quantity),
            protein: formatNutrition((item.protein || 0) * item.quantity)
        }))
    };
    
    // Create and download report
    const reportStr = `
Nutrivalor Nutrition Report
Generated: ${report.date}

SUMMARY
=======
Total Items: ${report.items}
Total Carbs: ${report.nutrition.carbs}g
Total Fat: ${report.nutrition.fat}g
Total Protein: ${report.nutrition.protein}g
Estimated Calories: ${report.nutrition.calories}

DETAILED BREAKDOWN
==================
${report.breakdown.map(item => 
    `${item.name} ${item.brand ? `(${item.brand})` : ''} x${item.quantity}
    Carbs: ${item.carbs}g | Fat: ${item.fat}g | Protein: ${item.protein}g`
).join('\n\n')}

Generated by Nutrivalor - Your Personal Food Tracking Companion
    `;
    
    const blob = new Blob([reportStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nutrivalor-report-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    showMessage('Nutrition report downloaded!', 'success');
}

// Calculate macro percentages
function calculateMacroPercentages() {
    if (!shoppingList || shoppingList.length === 0) {
        return { carbs: 0, fat: 0, protein: 0 };
    }
    
    let totalCarbs = 0;
    let totalFat = 0;
    let totalProtein = 0;
    
    shoppingList.forEach(item => {
        totalCarbs += (item.carbs || 0) * item.quantity;
        totalFat += (item.fat || 0) * item.quantity;
        totalProtein += (item.protein || 0) * item.quantity;
    });
    
    const totalMacros = totalCarbs + totalFat + totalProtein;
    
    if (totalMacros === 0) {
        return { carbs: 0, fat: 0, protein: 0 };
    }
    
    return {
        carbs: Math.round((totalCarbs / totalMacros) * 100),
        fat: Math.round((totalFat / totalMacros) * 100),
        protein: Math.round((totalProtein / totalMacros) * 100)
    };
}

// Get nutrition insights
function getNutritionInsights() {
    const percentages = calculateMacroPercentages();
    const insights = [];
    
    if (percentages.carbs > 60) {
        insights.push('High carbohydrate intake - consider balancing with more protein and healthy fats.');
    } else if (percentages.carbs < 30) {
        insights.push('Low carbohydrate intake - you might be following a low-carb diet.');
    }
    
    if (percentages.protein > 30) {
        insights.push('High protein intake - great for muscle building and satiety.');
    } else if (percentages.protein < 15) {
        insights.push('Low protein intake - consider adding more protein sources.');
    }
    
    if (percentages.fat > 40) {
        insights.push('High fat intake - make sure these are healthy fats.');
    } else if (percentages.fat < 15) {
        insights.push('Low fat intake - healthy fats are important for nutrient absorption.');
    }
    
    if (insights.length === 0) {
        insights.push('Your macro distribution looks balanced!');
    }
    
    return insights;
}

// Analytics Module
export async function initializeAnalytics(): Promise<void> {
  console.log('📊 Initializing analytics...');
  setupAnalyticsEventListeners();
}

function setupAnalyticsEventListeners(): void {
  // Add event listeners for analytics functionality
  console.log('Setting up analytics event listeners...');
}

export function generateNutritionChart(data: any): void {
  console.log('Generating nutrition chart:', data);
  // Chart.js implementation will be added here
}

export function generateMealChart(data: any): void {
  console.log('Generating meal chart:', data);
  // Chart.js implementation will be added here
}

export function displayAnalytics(): void {
  console.log('Displaying analytics...');
  // Analytics display implementation will be added here
}
