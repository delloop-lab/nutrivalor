import './styles/main.css';
import { initializeSupabase } from './js/supabase-client';
import { initializeAuth } from './js/auth';
import { initializeDatabase } from './js/database';
import { initializeFoodTracker } from './js/food-tracker';
import { initializeWeightTracker } from './js/weight-tracker';
import { initializeMacroCalculator } from './js/macro-calculator';
import { initializeMeals } from './js/meals';
import { initializeShoppingList } from './js/shopping-list';

// Initialize the application
async function initializeApp(): Promise<void> {
  console.log('🚀 Initializing NutriValor Application...');
  
  try {
    // Initialize Supabase connection
    initializeSupabase();
    
    // Initialize authentication first (it handles the UI state)
    await initializeAuth();
    
    // Initialize database
    await initializeDatabase();
    
    // Initialize food tracker
    await initializeFoodTracker();
    
    // Initialize weight tracker
    await initializeWeightTracker();
    
    // Initialize macro calculator
    await initializeMacroCalculator();
    
    // Initialize meals
    await initializeMeals();
    
    // Initialize shopping list
    await initializeShoppingList();
    
    // Setup modal event listeners
    setupModalEventListeners();
    
    // Setup profile event listeners
    setupProfileEventListeners();
    
    // Initialize avatar state
    initializeAvatarState();
    
    // Make functions globally available
    setupGlobalFunctions();
    
    console.log('✅ NutriValor Application initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing application:', error);
  }
}

// Profile management functions
function updateProfile(): void {
  console.log('👤 Updating profile...');
  
  const profileName = (document.getElementById('profileName') as HTMLInputElement)?.value;
  const dateOfBirth = (document.getElementById('dateOfBirth') as HTMLInputElement)?.value;
  const profileAge = (document.getElementById('profileAge') as HTMLInputElement)?.value;
  const profileCountry = (document.getElementById('profileCountry') as HTMLSelectElement)?.value;
  const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
  
  const profileData = {
    name: profileName,
    dateOfBirth: dateOfBirth,
    age: profileAge,
    country: profileCountry,
    avatar: avatarPreview?.src || null,
    updatedAt: new Date().toISOString()
  };
  
  // Save to localStorage
  localStorage.setItem('nutrivalor_profile', JSON.stringify(profileData));
  
  // Update header display name and avatar if available
  const userEmailElement = document.getElementById('userEmail');
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement;
  const headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
  
  if (userEmailElement && profileName && profileName.trim()) {
    userEmailElement.textContent = profileName;
  }
  
  // Update header avatar
  if (headerAvatar && headerAvatarPlaceholder) {
    if (profileData.avatar) {
      headerAvatar.src = profileData.avatar;
      headerAvatar.style.display = 'block';
      headerAvatarPlaceholder.style.display = 'none';
    } else {
      headerAvatar.style.display = 'none';
      headerAvatarPlaceholder.style.display = 'flex';
    }
  }
  
  // Show success message
  showMessage('Profile updated successfully!', 'success');
  
  console.log('✅ Profile saved:', profileData);
}

function loadProfile(): void {
  console.log('👤 Loading profile...');
  
  try {
    const savedProfile = localStorage.getItem('nutrivalor_profile');
    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      
      // Populate form fields
      const profileNameInput = document.getElementById('profileName') as HTMLInputElement;
      const dateOfBirthInput = document.getElementById('dateOfBirth') as HTMLInputElement;
      const profileAgeInput = document.getElementById('profileAge') as HTMLInputElement;
      const profileCountryInput = document.getElementById('profileCountry') as HTMLSelectElement;
      const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
      const avatarPlaceholder = document.getElementById('avatarPlaceholder') as HTMLElement;
      const removeAvatarBtn = document.getElementById('removeAvatarBtn') as HTMLButtonElement;
      
      if (profileNameInput) profileNameInput.value = profileData.name || '';
      if (dateOfBirthInput) dateOfBirthInput.value = profileData.dateOfBirth || '';
      if (profileAgeInput) profileAgeInput.value = profileData.age || '';
      if (profileCountryInput) profileCountryInput.value = profileData.country || '';
      
      // Handle avatar
      if (profileData.avatar && avatarPreview && avatarPlaceholder) {
        avatarPreview.src = profileData.avatar;
        avatarPreview.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        if (removeAvatarBtn) removeAvatarBtn.style.display = 'inline-flex';
      }
      
      showMessage('Profile loaded successfully!', 'success');
      console.log('✅ Profile loaded:', profileData);
    } else {
      showMessage('No saved profile found', 'info');
    }
  } catch (error) {
    console.error('❌ Error loading profile:', error);
    showMessage('Error loading profile', 'error');
  }
}

function removeAvatar(): void {
  const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
  const avatarPlaceholder = document.getElementById('avatarPlaceholder') as HTMLElement;
  const removeAvatarBtn = document.getElementById('removeAvatarBtn') as HTMLButtonElement;
  const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement;
  const headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
  
  if (avatarPreview && avatarPlaceholder) {
    avatarPreview.style.display = 'none';
    avatarPreview.src = '';
    avatarPlaceholder.style.display = 'flex';
    if (removeAvatarBtn) removeAvatarBtn.style.display = 'none';
    if (avatarInput) avatarInput.value = '';
  }
  
  // Also update header avatar
  if (headerAvatar && headerAvatarPlaceholder) {
    headerAvatar.style.display = 'none';
    headerAvatar.src = '';
    headerAvatarPlaceholder.style.display = 'flex';
  }
  
  console.log('🗑️ Avatar removed');
}

// Helper function to show messages
function showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.getElementById('messageToast');
  if (toast) {
    toast.textContent = message;
    toast.className = `message-toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// Setup global functions for onclick handlers
function setupGlobalFunctions(): void {
  // Modal functions
  (window as any).showUploadModal = showUploadModal;
  (window as any).closeUploadModal = closeUploadModal;
  // Meal modal functions are handled by meals.ts module
  
  // Section navigation
  (window as any).showSection = showSection;
  
  // Other functions that might be called from HTML
  // filterByCategory is handled by food-tracker module
  (window as any).updateProfile = updateProfile;
  (window as any).loadProfile = loadProfile;
  (window as any).removeAvatar = removeAvatar;
  (window as any).exportData = exportData;
  (window as any).clearAllData = clearAllData;
  
  // Note: Meal functions (filterMealsByCategory, addToMealPlan, etc.) are handled by meals.ts module
  
  // Shopping list functions
  (window as any).clearShoppingList = clearShoppingList;
  
  console.log('✅ Global functions setup complete');
}

// Modal management functions
function showUploadModal(): void {
  const modal = document.getElementById('uploadModal');
  if (modal) {
    modal.style.display = 'flex';
    console.log('📤 Upload modal opened');
  }
}

function closeUploadModal(): void {
  const modal = document.getElementById('uploadModal');
  if (modal) {
    modal.style.display = 'none';
    console.log('📤 Upload modal closed');
  }
}

function showMealUploadModal(): void {
  const modal = document.getElementById('mealUploadModal');
  if (modal) {
    modal.style.display = 'flex';
    console.log('🥗 Meal upload modal opened');
  }
}

function closeMealUploadModal(): void {
  const modal = document.getElementById('mealUploadModal');
  if (modal) {
    modal.style.display = 'none';
    console.log('🥗 Meal upload modal closed');
  }
}

// Section management
function showSection(sectionId: string): void {
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

  // Handle specific section actions
  if (sectionId === 'shopping-list') {
    // Update shopping list display when switching to it
    if ((window as any).updateShoppingListDisplay) {
      (window as any).updateShoppingListDisplay();
    }
  }

  console.log(`📍 Switched to section: ${sectionId}`);
}

function exportData(): void {
  console.log('💾 Export data');
  // Implementation will be added
}

function clearAllData(): void {
  console.log('🗑️ Clear all data');
  // Implementation will be added
}

// Note: Meal-related functions are implemented in the meals module
// No need for placeholder functions here as they're handled by the meals.ts module

// Shopping list functions
function clearShoppingList(): void {
  console.log('🗑️ Clear shopping list');
  // Implementation will be added
}

// Setup modal event listeners
function setupModalEventListeners(): void {
  // Close modals when clicking outside
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('modal')) {
      closeModal(target as HTMLElement);
    }
  });
  
  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });
  
  console.log('✅ Modal event listeners setup complete');
}

function closeModal(modal: HTMLElement): void {
  modal.style.display = 'none';
}

function closeAllModals(): void {
  document.querySelectorAll('.modal').forEach(modal => {
    (modal as HTMLElement).style.display = 'none';
  });
}

// Initialize avatar state - show correct button based on avatar existence
function initializeAvatarState(): void {
  const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
  const chooseAvatarBtn = document.getElementById('chooseAvatarBtn') as HTMLButtonElement;
  const changeAvatarBtn = document.getElementById('changeAvatarBtn') as HTMLButtonElement;
  
  // Default state: show "Choose Avatar", hide "Change Avatar"
  if (chooseAvatarBtn) chooseAvatarBtn.style.display = 'inline-flex';
  if (changeAvatarBtn) changeAvatarBtn.style.display = 'none';
  
  // If there's already an avatar, show "Change Avatar" instead
  if (avatarPreview && avatarPreview.src && avatarPreview.style.display !== 'none') {
    if (chooseAvatarBtn) chooseAvatarBtn.style.display = 'none';
    if (changeAvatarBtn) changeAvatarBtn.style.display = 'inline-flex';
  }
  
  console.log('✅ Avatar state initialized');
}

// Setup profile event listeners
function setupProfileEventListeners(): void {
  // Avatar upload handling
  const avatarInput = document.getElementById('avatarInput') as HTMLInputElement;
  if (avatarInput) {
    avatarInput.addEventListener('change', handleAvatarUpload);
  }
  
  // Date of birth change handling for age calculation
  const dateOfBirthInput = document.getElementById('dateOfBirth') as HTMLInputElement;
  if (dateOfBirthInput) {
    dateOfBirthInput.addEventListener('change', calculateAge);
  }
  
  // Load profile on page load
  setTimeout(() => {
    loadProfile();
  }, 1000);
  
  console.log('✅ Profile event listeners setup complete');
}

function handleAvatarUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
      const avatarPlaceholder = document.getElementById('avatarPlaceholder') as HTMLElement;
      const removeAvatarBtn = document.getElementById('removeAvatarBtn') as HTMLButtonElement;
      
      if (avatarPreview && avatarPlaceholder && e.target?.result) {
        avatarPreview.src = e.target.result as string;
        avatarPreview.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        if (removeAvatarBtn) removeAvatarBtn.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  } else {
    showMessage('Please select a valid image file', 'error');
  }
}

function calculateAge(): void {
  const dateOfBirthInput = document.getElementById('dateOfBirth') as HTMLInputElement;
  const profileAgeInput = document.getElementById('profileAge') as HTMLInputElement;
  
  if (dateOfBirthInput && profileAgeInput && dateOfBirthInput.value) {
    const birthDate = new Date(dateOfBirthInput.value);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    profileAgeInput.value = age.toString();
  }
}

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM loaded, starting NutriValor...');
  initializeApp();
}); 