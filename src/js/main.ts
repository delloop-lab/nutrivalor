// Main Application Module for Nutrivalor
let currentSection = 'food-tracker';

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Nutrivalor Web App Starting...');
    
    // Initialize the app after a short delay to ensure all scripts are loaded
    setTimeout(() => {
        initializeApp();
    }, 500);
});

function initializeApp() {
    console.log('📱 Initializing Nutrivalor app...');
    
    // Show initial section
    showSection('food-tracker');
    
    // Set up event listeners for modals
    setupModalEventListeners();
    
    console.log('✅ Nutrivalor app initialized successfully');
}

// Section switching
function showSection(sectionId) {
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Activate corresponding nav tab
    const targetTab = document.querySelector(`[data-section="${sectionId}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    currentSection = sectionId;
    
    // Load section-specific data
    loadSectionData(sectionId);
}

// Load data for specific sections
function loadSectionData(sectionId) {
    switch (sectionId) {
        case 'food-tracker':
            displayFoods();
            break;
        case 'meals':
            displayMeals();
            break;
        case 'shopping-list':
            displayShoppingList();
            break;
        case 'analytics':
            updateAnalytics();
            break;
        case 'meal-plan':
            displayMealPlan();
            break;
    }
}

// Modal management
function setupModalEventListeners() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal(e.target);
        }
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

function showUploadModal() {
    document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
}

function showMealUploadModal() {
    document.getElementById('mealUploadModal').style.display = 'flex';
}

function closeMealUploadModal() {
    document.getElementById('mealUploadModal').style.display = 'none';
}

function closeModal(modal) {
    modal.style.display = 'none';
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// File upload handling
async function handleFoodFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        showMessage('Uploading food data...', 'info');
        
        // Parse the Excel file
        const foods = await parseExcelFile(file);
        
        if (foods && foods.length > 0) {
            // Save to database
            await saveFoodsToDatabase(foods);
            
            // Update display
            displayFoods();
            
            // Close modal
            closeUploadModal();
            
            showMessage(`Successfully uploaded ${foods.length} food items!`, 'success');
        } else {
            showMessage('No valid food data found in the file', 'error');
        }
        
    } catch (error) {
        console.error('Error uploading food file:', error);
        showMessage('Error uploading food file: ' + error.message, 'error');
    }
}

async function handleMealFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        showMessage('Uploading meal data...', 'info');
        
        // Parse the Excel file
        const meals = await parseMealExcelFile(file);
        
        if (meals && meals.length > 0) {
            // Save to database
            await saveMealsToDatabase(meals);
            
            // Update display
            displayMeals();
            
            // Close modal
            closeMealUploadModal();
            
            showMessage(`Successfully uploaded ${meals.length} meals!`, 'success');
        } else {
            showMessage('No valid meal data found in the file', 'error');
        }
        
    } catch (error) {
        console.error('Error uploading meal file:', error);
        showMessage('Error uploading meal file: ' + error.message, 'error');
    }
}

// Parse Excel files (using xlsx library)
async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Load XLSX library if not already loaded
                if (typeof XLSX === 'undefined') {
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
                    script.onload = () => parseExcelData(e.target.result, resolve, reject);
                    document.head.appendChild(script);
                } else {
                    parseExcelData(e.target.result, resolve, reject);
                }
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function parseExcelData(data, resolve, reject) {
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        const foods = [];
        
        // Parse food data from Excel
        for (let row = range.s.r; row <= range.e.r; row++) {
            const line = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                const cell = worksheet[cellAddress];
                const value = cell ? (cell.v || '') : '';
                line.push(value.toString().trim());
            }
            
            if (line.length >= 5 && row > 1) { // Skip header row
                const food = {
                    name: line[0],
                    brand: line[1] || '',
                    carbs: parseFloat(line[2]) || 0,
                    fat: parseFloat(line[3]) || 0,
                    protein: parseFloat(line[4]) || 0,
                    category: line[5] || 'General'
                };
                
                if (food.name && food.name.length > 0) {
                    foods.push(food);
                }
            }
        }
        
        resolve(foods);
    } catch (error) {
        reject(error);
    }
}

// Parse meal Excel files
async function parseMealExcelFile(file) {
    // Similar to parseExcelFile but for meals
    return parseExcelFile(file); // Reuse the same parser for now
}

// Message display system
function showMessage(message, type = 'info') {
    const toast = document.getElementById('messageToast');
    
    // Remove existing classes
    toast.classList.remove('show', 'error', 'success', 'info');
    
    // Set message content
    toast.textContent = message;
    
    // Add appropriate class
    if (type === 'error') {
        toast.classList.add('error');
    } else if (type === 'success') {
        toast.classList.add('success');
    } else {
        toast.classList.add('info');
    }
    
    // Show toast
    toast.style.display = 'block';
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        hideMessage();
    }, 5000);
}

function hideMessage() {
    const toast = document.getElementById('messageToast');
    toast.classList.remove('show');
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 300);
}

// Utility functions
function toTitleCase(str) {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatNutrition(value) {
    return typeof value === 'number' ? value.toFixed(1) : '0.0';
}

// Settings functions
function updateProfile() {
    const name = document.getElementById('profileName').value;
    if (!name) {
        showMessage('Please enter a name', 'error');
        return;
    }
    
    // Update profile in localStorage or database
    if (currentUser) {
        currentUser.user_metadata = { ...currentUser.user_metadata, name };
        localStorage.setItem('nutrime_current_user', JSON.stringify(currentUser));
        showMessage('Profile updated successfully!', 'success');
    }
}

function exportData() {
    try {
        const data = {
            foods: JSON.parse(localStorage.getItem('nutrime_foods') || '[]'),
            meals: JSON.parse(localStorage.getItem('nutrime_meals') || '[]'),
            shoppingList: JSON.parse(localStorage.getItem('nutrime_shopping_list') || '[]')
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nutrivalor-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showMessage('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showMessage('Error exporting data', 'error');
    }
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all your data? This cannot be undone.')) {
        localStorage.removeItem('nutrime_foods');
        localStorage.removeItem('nutrime_meals');
        localStorage.removeItem('nutrime_shopping_list');
        
        // Refresh displays
        displayFoods();
        displayMeals();
        displayShoppingList();
        
        showMessage('All data cleared successfully', 'success');
    }
}

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    showMessage('An unexpected error occurred', 'error');
});

// Prevent default behavior for drag and drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault()); 