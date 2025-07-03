import './styles/main.css';
import { initializeSupabase } from './js/supabase-client';
import { initializeAuth } from './js/auth';
import { initializeDatabase, saveProfileToDatabase, loadProfileFromDatabase } from './js/database';
import { initializeFoodTracker } from './js/food-tracker';
import { initializeWeightTracker } from './js/weight-tracker';
import { initializeMacroCalculator } from './js/macro-calculator';
import { initializeMeals, reloadMeals } from './js/meals';
import { initializeShoppingList } from './js/shopping-list';
import './js/simple-edit';

// At the top of the file, after imports, add splash screen logic
// Delay splash screen until after app initialization to ensure logo is available
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(showSplashScreen, 100);
});

function showSplashScreen() {
  const splash = document.createElement('div');
  splash.id = 'splashScreen';
  splash.style.position = 'fixed';
  splash.style.top = '0';
  splash.style.left = '0';
  splash.style.width = '100vw';
  splash.style.height = '100vh';
  splash.style.background = 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)';
  splash.style.display = 'flex';
  splash.style.flexDirection = 'column';
  splash.style.justifyContent = 'center';
  splash.style.alignItems = 'center';
  splash.style.zIndex = '9999';
  // Find the logo dynamically by looking for existing logo references in the HTML
  const existingLogo = document.querySelector('img[src*="nutrivalor_logo"]') as HTMLImageElement;
  const logoPath = existingLogo ? existingLogo.src : '/assets/nutrivalor_logo.png';
  
  splash.innerHTML = `
    <img src="${logoPath}" alt="NutriValor Logo" style="max-width: 320px; width: 40vw; height: auto; margin-bottom: 1rem;" />
    <div style="font-size: 1.6rem; font-weight: 400; color: #8a99b3; font-family: 'Poppins', sans-serif; font-style: italic;">"Value your Nutrition"</div>
  `;
  document.body.appendChild(splash);
  setTimeout(() => {
    splash.style.transition = 'opacity 0.5s';
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 500);
  }, 2000);
}

// Initialize the application
async function initializeApp(): Promise<void> {
  // Removed excessive logging for performance
  
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
    
    // Removed excessive logging for performance
    
  } catch (error) {
    console.error('❌ Error initializing application:', error);
  }
}

// Profile management functions
async function updateProfile(): Promise<void> {
  console.log('👤 Updating profile...');
  
  try {
    const profileName = (document.getElementById('profileName') as HTMLInputElement)?.value;
    const dateOfBirth = (document.getElementById('dateOfBirth') as HTMLInputElement)?.value;
    const profileAge = (document.getElementById('profileAge') as HTMLInputElement)?.value;
    const profileGender = (document.getElementById('profileGender') as HTMLSelectElement)?.value;
    const profileHeight = (document.getElementById('profileHeight') as HTMLInputElement)?.value;
    const heightUnit = (document.getElementById('heightUnit') as HTMLSelectElement)?.value;
    const profileIdealWeight = (document.getElementById('profileIdealWeight') as HTMLInputElement)?.value;
    const weightUnit = (document.getElementById('weightUnit') as HTMLSelectElement)?.value;
    const profileCountry = (document.getElementById('profileCountry') as HTMLSelectElement)?.value;
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
    
    const profileData = {
      name: profileName,
      dateOfBirth: dateOfBirth,
      age: profileAge,
      gender: profileGender,
      height: profileHeight,
      heightUnit: heightUnit,
      idealWeight: profileIdealWeight,
      weightUnit: weightUnit,
      country: profileCountry,
      avatar: avatarPreview?.src || null
    };
    
    // Save to Supabase
    const savedProfile = await saveProfileToDatabase(profileData);
    
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
    
    console.log('✅ Profile saved to Supabase:', savedProfile);
  } catch (error) {
    console.error('❌ Error saving profile:', error);
    showMessage('Error saving profile. Please try again.', 'error');
  }
}

async function loadProfile(): Promise<void> {
  // Removed excessive logging for performance
  
  try {
    const profileData = await loadProfileFromDatabase();
    if (profileData) {
      // Populate form fields
      const profileNameInput = document.getElementById('profileName') as HTMLInputElement;
      const dateOfBirthInput = document.getElementById('dateOfBirth') as HTMLInputElement;
      const profileAgeInput = document.getElementById('profileAge') as HTMLInputElement;
      const profileGenderInput = document.getElementById('profileGender') as HTMLSelectElement;
      const profileHeightInput = document.getElementById('profileHeight') as HTMLInputElement;
      const heightUnitInput = document.getElementById('heightUnit') as HTMLSelectElement;
      const profileIdealWeightInput = document.getElementById('profileIdealWeight') as HTMLInputElement;
      const weightUnitInput = document.getElementById('weightUnit') as HTMLSelectElement;
      const profileCountryInput = document.getElementById('profileCountry') as HTMLSelectElement;
      const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
      const avatarPlaceholder = document.getElementById('avatarPlaceholder') as HTMLElement;
      const removeAvatarBtn = document.getElementById('removeAvatarBtn') as HTMLButtonElement;
      
      if (profileNameInput) profileNameInput.value = profileData.name || '';
      if (dateOfBirthInput) dateOfBirthInput.value = profileData.date_of_birth || '';
      if (profileAgeInput) profileAgeInput.value = profileData.age || '';
      if (profileGenderInput) profileGenderInput.value = profileData.gender || '';
      if (profileHeightInput) profileHeightInput.value = profileData.height || '';
      if (heightUnitInput) heightUnitInput.value = profileData.height_unit || 'cm';
      if (profileIdealWeightInput) profileIdealWeightInput.value = profileData.ideal_weight || '';
      if (weightUnitInput) weightUnitInput.value = profileData.weight_unit || 'kg';
      if (profileCountryInput) profileCountryInput.value = profileData.country || '';
      
      // Handle avatar
      if (profileData.avatar_url && avatarPreview && avatarPlaceholder) {
        avatarPreview.src = profileData.avatar_url;
        avatarPreview.style.display = 'block';
        avatarPlaceholder.style.display = 'none';
        if (removeAvatarBtn) removeAvatarBtn.style.display = 'inline-flex';
      }
      
      showMessage('Profile loaded successfully!', 'success');
      // Removed excessive logging for performance
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
export function showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
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
  // Meal reload function for admin
  (window as any).reloadMeals = reloadMeals;
  
  // Shopping list functions
  (window as any).clearShoppingList = clearShoppingList;
  
  // Rich text formatting functions
  (window as any).formatText = formatText;
  (window as any).formatEditText = formatEditText;
  
  // Meal picture functions
  (window as any).removeMealPicture = removeMealPicture;
  (window as any).removeEditMealPicture = removeEditMealPicture;
  (window as any).setupMealPictureEventListeners = setupMealPictureEventListeners;
  
  // Admin functions that need to be available globally
  // Note: Commented out - these functions don't exist in current admin.ts
  // (window as any).updateAllMealsNutrition = async () => {
  //   try {
  //     const { updateAllMealsNutrition } = await import('./js/admin');
  //     await updateAllMealsNutrition();
  //   } catch (error) {
  //     console.error('❌ Error loading admin function:', error);
  //     showMessage('Error loading admin function', 'error');
  //   }
  // };
  
  // (window as any).updateMealAttributions = async () => {
  //   try {
  //     const { updateMealAttributions } = await import('./js/admin');
  //     await updateMealAttributions();
  //   } catch (error) {
  //     console.error('❌ Error loading admin function:', error);
  //     showMessage('Error loading admin function', 'error');
  //   }
  // };
  
      // Removed excessive logging for performance
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
  } else if (sectionId === 'admin') {
    // Initialize admin panel when switching to it
    loadAdminSection();
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

// Admin section loading
async function loadAdminSection(): Promise<void> {
  try {
    console.log('👑 Loading admin section...');
    
    // Dynamically import and initialize admin module
    const { initializeAdmin } = await import('./js/admin');
    
    await initializeAdmin();
    
    console.log('✅ Admin section loaded');
  } catch (error) {
    console.warn('⚠️ Admin initialization had errors, continuing with simple edit system:', error);
  }
  
  // Ensure simple edit system is working
  await initializeSimpleEditSystem();
}

// Initialize simple edit system to make sure it works regardless of admin.ts issues
async function initializeSimpleEditSystem(): Promise<void> {
  try {
    console.log('🔧 Ensuring simple edit system is available...');
    
    // The simple-edit.ts is already imported in main.ts, so the functions should be available
    // Let's just verify they exist and set up any needed event listeners
    
    if (typeof window.openEditFoodModal === 'function' && typeof window.openEditMealModal === 'function') {
      console.log('✅ Simple edit functions are available');
      
      // Set up Edit Food and Edit Meal buttons if they exist
      const editFoodBtn = document.querySelector('[onclick*="openEditFoodModal"]');
      const editMealBtn = document.querySelector('[onclick*="openEditMealModal"]');
      
      if (editFoodBtn) {
        console.log('✅ Edit Food button found');
      } else {
        console.log('⚠️ Edit Food button not found in DOM');
      }
      
      if (editMealBtn) {
        console.log('✅ Edit Meal button found');
      } else {
        console.log('⚠️ Edit Meal button not found in DOM');
      }
      
    } else {
      console.error('❌ Simple edit functions not available');
    }
    
  } catch (error) {
    console.error('❌ Error initializing simple edit system:', error);
  }
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
  
      // Removed excessive logging for performance
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
  
      // Removed excessive logging for performance
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
  
      // Removed excessive logging for performance
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

// Rich text formatting functions for cooking instructions
function formatText(command: string): void {
  const editor = document.getElementById('cookingInstructions');
  const hiddenInput = document.getElementById('cookingInstructionsHidden') as HTMLInputElement;
  
  if (editor) {
    editor.focus();
    document.execCommand(command, false);
    
    // Update hidden input
    if (hiddenInput) {
      hiddenInput.value = editor.innerHTML;
    }
  }
}

function formatEditText(command: string): void {
  const editor = document.getElementById('editCookingInstructions');
  const hiddenInput = document.getElementById('editCookingInstructionsHidden') as HTMLInputElement;
  
  if (editor) {
    editor.focus();
    document.execCommand(command, false);
    
    // Update hidden input
    if (hiddenInput) {
      hiddenInput.value = editor.innerHTML;
    }
  }
}

// Setup rich text editor event listeners
function setupRichTextEditors(): void {
  // Main cooking instructions editor
  const cookingInstructions = document.getElementById('cookingInstructions');
  const cookingInstructionsHidden = document.getElementById('cookingInstructionsHidden') as HTMLInputElement;
  
  if (cookingInstructions && cookingInstructionsHidden) {
    cookingInstructions.addEventListener('input', () => {
      cookingInstructionsHidden.value = cookingInstructions.innerHTML;
    });
    
    cookingInstructions.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || (window as any).clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }
  
  // Edit cooking instructions editor
  const editCookingInstructions = document.getElementById('editCookingInstructions');
  const editCookingInstructionsHidden = document.getElementById('editCookingInstructionsHidden') as HTMLInputElement;
  
  if (editCookingInstructions && editCookingInstructionsHidden) {
    editCookingInstructions.addEventListener('input', () => {
      editCookingInstructionsHidden.value = editCookingInstructions.innerHTML;
    });
    
    editCookingInstructions.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || (window as any).clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  }
}

// Meal picture upload functions
function setupMealPictureEventListeners(): void {
  // Main meal picture upload (only this one exists now)
  const mealPictureFile = document.getElementById('mealPictureFile') as HTMLInputElement;
  if (mealPictureFile) {
    mealPictureFile.addEventListener('change', handleMealPictureUpload);
  }
  
  // Note: Edit meal picture functionality moved to simple-edit.ts system
}

function handleMealPictureUpload(event: Event): void {
  console.log('🖼️ Main meal picture upload triggered');
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  console.log('📁 Selected file:', file?.name, file?.type);
  
  if (file && file.type.startsWith('image/')) {
    console.log('✅ Valid image file detected');
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log('📖 File read complete');
      const preview = document.getElementById('mealPicturePreview') as HTMLImageElement;
      const placeholder = document.getElementById('mealPicturePlaceholder') as HTMLElement;
      const removeBtn = document.getElementById('removeMealPictureBtn') as HTMLButtonElement;
      const hiddenInput = document.getElementById('mealPicture') as HTMLInputElement;
      
      console.log('🔍 Elements found:', {
        preview: !!preview,
        placeholder: !!placeholder,
        removeBtn: !!removeBtn,
        hiddenInput: !!hiddenInput
      });
      
      if (preview && placeholder && e.target?.result) {
        preview.src = e.target.result as string;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'block';
        if (hiddenInput) hiddenInput.value = e.target.result as string;
        console.log('✅ Image preview updated successfully');
      } else {
        console.error('❌ Missing required elements for image preview');
      }
    };
    reader.readAsDataURL(file);
  } else {
    console.error('❌ Invalid file type:', file?.type);
    showMessage('Please select a valid image file', 'error');
  }
}

function handleEditMealPictureUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('editMealPicturePreview') as HTMLImageElement;
      const placeholder = document.getElementById('editMealPicturePlaceholder') as HTMLElement;
      const removeBtn = document.getElementById('removeEditMealPictureBtn') as HTMLButtonElement;
      const hiddenInput = document.getElementById('editMealPicture') as HTMLInputElement;
      
      if (preview && placeholder && e.target?.result) {
        preview.src = e.target.result as string;
        preview.style.display = 'block';
        placeholder.style.display = 'none';
        if (removeBtn) removeBtn.style.display = 'block';
        if (hiddenInput) hiddenInput.value = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  } else {
    showMessage('Please select a valid image file', 'error');
  }
}

function removeMealPicture(): void {
  const preview = document.getElementById('mealPicturePreview') as HTMLImageElement;
  const placeholder = document.getElementById('mealPicturePlaceholder') as HTMLElement;
  const removeBtn = document.getElementById('removeMealPictureBtn') as HTMLButtonElement;
  const hiddenInput = document.getElementById('mealPicture') as HTMLInputElement;
  const fileInput = document.getElementById('mealPictureFile') as HTMLInputElement;
  
  if (preview) preview.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  if (hiddenInput) hiddenInput.value = '';
  if (fileInput) fileInput.value = '';
}

function removeEditMealPicture(): void {
  const preview = document.getElementById('editMealPicturePreview') as HTMLImageElement;
  const placeholder = document.getElementById('editMealPicturePlaceholder') as HTMLElement;
  const removeBtn = document.getElementById('removeEditMealPictureBtn') as HTMLButtonElement;
  const hiddenInput = document.getElementById('editMealPicture') as HTMLInputElement;
  const fileInput = document.getElementById('editMealPictureFile') as HTMLInputElement;
  
  if (preview) preview.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  if (hiddenInput) hiddenInput.value = '';
  if (fileInput) fileInput.value = '';
}

// Initialize immediately since this is a module
initializeApp();

// Setup rich text editors and meal picture uploads after a delay to ensure admin content is loaded
setTimeout(() => {
  setupRichTextEditors();
  setupMealPictureEventListeners();
}, 2000);

// Also try to set up meal picture listeners when admin section is clicked
const adminNavBtn = document.querySelector('[onclick="showSection(\'admin\')"]');
if (adminNavBtn) {
  adminNavBtn.addEventListener('click', () => {
    setTimeout(() => {
      setupMealPictureEventListeners();
    }, 500);
  });
}

window.showSection = showSection; 