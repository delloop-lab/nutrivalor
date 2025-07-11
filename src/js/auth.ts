import { supabase, getCurrentUser, localStorageWrapper } from './supabase-client';
import type { User } from '@supabase/supabase-js';

// Authentication Module for NutriValor
let currentUser: User | null = null;

// Initialize authentication
export async function initializeAuth(): Promise<void> {
  // Removed excessive logging for performance
  await checkAuthState();
  setupEventListeners();
}

// Set up event listeners
function setupEventListeners(): void {
  // Auth form handlers - target the actual form elements inside the containers
  const loginForm = document.querySelector('#loginForm form') as HTMLFormElement;
  const signupForm = document.querySelector('#signupForm form') as HTMLFormElement;
  const forgotForm = document.querySelector('#forgotForm form') as HTMLFormElement;
  const logoutBtn = document.getElementById('logoutBtn') as HTMLButtonElement;

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
    // Removed excessive logging for performance
  } else {
    console.warn('❌ Login form not found');
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
    // Removed excessive logging for performance
  } else {
    console.warn('❌ Signup form not found');
  }
  
  if (forgotForm) {
    forgotForm.addEventListener('submit', handleForgotPassword);
    // Removed excessive logging for performance
  } else {
    console.warn('❌ Forgot password form not found');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
    // Removed excessive logging for performance
  } else {
    console.warn('❌ Logout button not found');
  }

  // Auth tab buttons
  document.querySelectorAll('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const tabName = target.getAttribute('data-auth-tab');
      if (tabName) showAuthTab(tabName);
    });
  });

  // Forgot password link
  const forgotLink = document.querySelector('[data-forgot-password]');
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      showForgotPassword();
    });
  }
}

// Check current authentication state
export async function checkAuthState(): Promise<void> {
  try {
    showLoading();
    
    const user = await getCurrentUser();
    
    if (user) {
      await handleAuthSuccess(user);
    } else {
      showAuthSection();
    }
  } catch (error) {
    console.error('Error checking auth state:', error);
    showAuthSection();
  }
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

// Get current user
export function getCurrentAuthUser(): User | null {
  return currentUser;
}

// Handle successful authentication
async function handleAuthSuccess(user: User): Promise<void> {
  currentUser = user;
  hideLoading();
  showMainApp();
  await updateUserInfo(user);
  loadUserData();
  
  // Auto-load profile data to populate the Settings form
  try {
    const mainModule = await import('../main');
    if ('loadProfile' in mainModule && typeof mainModule.loadProfile === 'function') {
      await mainModule.loadProfile();
      console.log('✅ Profile auto-loaded after login');
    }
  } catch (error) {
    console.log('ℹ️ Profile auto-load skipped (not available or error):', error);
  }
  
  // Update admin navigation based on user role
  updateAdminNavigation();
}

// Show/hide different sections
function showLoading(): void {
  const loadingScreen = document.getElementById('loadingScreen');
  const authSection = document.getElementById('auth-section');
  const mainApp = document.getElementById('app-section');
  
  if (loadingScreen) loadingScreen.style.display = 'flex';
  if (authSection) authSection.style.display = 'none';
  if (mainApp) mainApp.style.display = 'none';
}

function hideLoading(): void {
  const loadingScreen = document.getElementById('loadingScreen');
  if (loadingScreen) loadingScreen.style.display = 'none';
}

function showAuthSection(): void {
  hideLoading();
  const authSection = document.getElementById('auth-section');
  const mainApp = document.getElementById('app-section');
  
  if (authSection) authSection.style.display = 'flex';
  if (mainApp) mainApp.style.display = 'none';
}

function showMainApp(): void {
  hideLoading();
  const authSection = document.getElementById('auth-section');
  const mainApp = document.getElementById('app-section');
  
  if (authSection) authSection.style.display = 'none';
  if (mainApp) mainApp.style.display = 'block';
}

// Update user info in header
async function updateUserInfo(user: User): Promise<void> {
  const userEmailElement = document.getElementById('userEmail');
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement;
  const headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
  
  if (userEmailElement) {
    let displayName = user.email || 'User';
    let avatarSrc = null;
    
    // Try to load profile from Supabase database
    try {
      const { loadProfileFromDatabase } = await import('./database');
      const profileData = await loadProfileFromDatabase();
      
      if (profileData) {
        if (profileData.name && profileData.name.trim()) {
          displayName = profileData.name;
        }
        if (profileData.avatar_url) {
          avatarSrc = profileData.avatar_url;
        }
      }
    } catch (error) {
      console.log('Could not load profile from database for header display:', error);
      
      // Fallback to localStorage
      const savedProfile = localStorage.getItem('nutrivalor_profile');
      if (savedProfile) {
        try {
          const profileData = JSON.parse(savedProfile);
          if (profileData.name && profileData.name.trim()) {
            displayName = profileData.name;
          }
          if (profileData.avatar) {
            avatarSrc = profileData.avatar;
          }
        } catch (error) {
          console.log('Could not parse saved profile for display name');
        }
      }
    }
    
    userEmailElement.textContent = displayName;
    
    // Update header avatar
    if (headerAvatar && headerAvatarPlaceholder) {
      if (avatarSrc) {
        headerAvatar.src = avatarSrc;
        headerAvatar.style.display = 'block';
        headerAvatarPlaceholder.style.display = 'none';
      } else {
        headerAvatar.style.display = 'none';
        headerAvatarPlaceholder.style.display = 'flex';
      }
    }
  }
}

// Auth tab switching
export function showAuthTab(tab: string): void {
  // Remove active class from all tabs
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  
  // Hide all forms
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');
  
  if (loginForm) loginForm.style.display = 'none';
  if (signupForm) signupForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'none';
  
  // Show selected tab and form
  if (tab === 'login') {
    const loginTab = document.querySelector('.auth-tab');
    if (loginTab) loginTab.classList.add('active');
    if (loginForm) loginForm.style.display = 'block';
  } else if (tab === 'signup') {
    const signupTab = document.querySelectorAll('.auth-tab')[1];
    if (signupTab) signupTab.classList.add('active');
    if (signupForm) signupForm.style.display = 'block';
  }
}

// Show forgot password form
export function showForgotPassword(): void {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const forgotForm = document.getElementById('forgotForm');
  
  if (loginForm) loginForm.style.display = 'none';
  if (signupForm) signupForm.style.display = 'none';
  if (forgotForm) forgotForm.style.display = 'block';
}

// Show message toast
function showMessage(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
  const toast = document.createElement('div');
  toast.className = `message-toast ${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Force reflow to ensure animation works
  void toast.offsetWidth;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300); // Match transition duration
  }, 5000);
}

// Handle login
async function handleLogin(event: Event): Promise<void> {
  event.preventDefault();
  
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!email || !password) {
    showMessage('Please fill in all fields', 'error');
    return;
  }
  
  try {
    showLoading();
    
    if (!supabase) {
      // Fallback to localStorage
      const users = JSON.parse(localStorageWrapper.getItem('users') || '[]');
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) {
        showMessage('Invalid email or password', 'error');
        showAuthSection();
        return;
      }
      
      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;
      localStorageWrapper.setItem('currentUser', JSON.stringify(userWithoutPassword));
      await handleAuthSuccess(userWithoutPassword);
      return;
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      showMessage(error.message, 'error');
      showAuthSection();
      return;
    }
    
    if (data.user) {
      await handleAuthSuccess(data.user);
      showMessage('Login successful!', 'success');
    }
    
  } catch (error) {
    console.error('Login error:', error);
    showMessage('An error occurred during login', 'error');
    showAuthSection();
  }
}

// Handle signup
async function handleSignup(event: Event): Promise<void> {
  event.preventDefault();
  
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!name || !email || !password) {
    showMessage('Please fill in all fields', 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters', 'error');
    return;
  }
  
  try {
    showLoading();
    
    if (!supabase) {
      // Fallback to localStorage
      const users = JSON.parse(localStorageWrapper.getItem('users') || '[]');
      const existingUser = users.find((u: any) => u.email === email);
      
      if (existingUser) {
        showMessage('User already exists', 'error');
        showAuthSection();
        return;
      }
      
      const user = {
        id: generateId(),
        email,
        user_metadata: { name },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      
      users.push({ ...user, password });
      localStorageWrapper.setItem('users', JSON.stringify(users));
      localStorageWrapper.setItem('currentUser', JSON.stringify(user));
      await handleAuthSuccess(user as User);
      showMessage('Account created successfully!', 'success');
      return;
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (error) {
      showMessage(error.message, 'error');
      showAuthSection();
      return;
    }
    
    if (data.user) {
      // Show verification modal instead of proceeding to app
      hideLoading();
      showVerificationModal(email);
    }
    
  } catch (error) {
    console.error('Signup error:', error);
    showMessage('An error occurred during signup', 'error');
    showAuthSection();
  }
}

// Show verification modal after signup
function showVerificationModal(email: string): void {
  // Set the email in the modal
  const emailSpan = document.getElementById('verificationEmail');
  if (emailSpan) {
    emailSpan.textContent = email;
  }
  
  // Show the modal
  const modal = document.getElementById('verificationModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('show');
  }
  
  // Set up button event listeners
  const gotItBtn = document.getElementById('verificationGotIt');
  const goBackBtn = document.getElementById('verificationGoBack');
  
  if (gotItBtn) {
    gotItBtn.onclick = () => {
      // Hide modal and show login tab
      hideVerificationModal();
      showAuthTab('login');
      showMessage('Please check your email to verify your account before logging in.', 'info');
    };
  }
  
  if (goBackBtn) {
    goBackBtn.onclick = () => {
      // Hide modal and stay on signup tab
      hideVerificationModal();
      showAuthTab('signup');
    };
  }
}

// Hide verification modal
function hideVerificationModal(): void {
  const modal = document.getElementById('verificationModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
}

// Handle forgot password
async function handleForgotPassword(event: Event): Promise<void> {
  event.preventDefault();
  
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  const email = formData.get('email') as string;
  
  if (!email) {
    showMessage('Please enter your email', 'error');
    return;
  }
  
  try {
    if (!supabase) {
      showMessage('Password reset functionality requires Supabase connection', 'error');
      return;
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      showMessage(error.message, 'error');
      return;
    }
    
    showMessage('Password reset email sent!', 'success');
    showAuthTab('login');
    
  } catch (error) {
    console.error('Password reset error:', error);
    showMessage('An error occurred sending reset email', 'error');
  }
}

// Handle logout
export async function handleLogout(): Promise<void> {
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
    
    // Clear localStorage - all user data
    localStorageWrapper.removeItem('currentUser');
    localStorageWrapper.removeItem('nutrivalor_profile'); // Clear cached profile data
    localStorageWrapper.removeItem('nutrivalor_meals'); // Clear cached meal data
    localStorageWrapper.removeItem('nutrivalor_weeklyPlan'); // Clear meal plan data
    
    // Clear profile form fields for next user
    clearProfileForm();
    
    // Clear any macro calculator saved data for this user
    if (currentUser?.id) {
      localStorageWrapper.removeItem(`macroProfile_${currentUser.id}`);
    }
    
    // Clear in-memory data structures to ensure privacy
    try {
      // Clear food tracker data (foods + shopping list)
      const foodTrackerModule = await import('./food-tracker');
      if ('clearAllData' in foodTrackerModule) {
        await (foodTrackerModule as any).clearAllData();
      }
      
      // Clear food grid display
      const foodGrid = document.getElementById('foodGrid');
      if (foodGrid) {
        foodGrid.innerHTML = '<p class="empty-state">Please log in to view your food data.</p>';
      }
      
      // Clear shopping list display  
      const shoppingListContainer = document.getElementById('shoppingListContainer');
      if (shoppingListContainer) {
        shoppingListContainer.innerHTML = '<p class="empty-state">Please log in to view your shopping list.</p>';
      }
      
      // Clear meal data and meal plan display
      const mealsModule = await import('./meals');
      if ('clearAllMealData' in mealsModule) {
        await (mealsModule as any).clearAllMealData();
      }
      
      // Clear meal grid display
      const mealGrid = document.getElementById('mealGrid');
      if (mealGrid) {
        mealGrid.innerHTML = '<p class="empty-state">Please log in to view your meals.</p>';
      }
      
      // Clear weekly meal plan display
      const weeklyPlanContainer = document.querySelector('.weekly-meal-plan-container');
      if (weeklyPlanContainer) {
        weeklyPlanContainer.innerHTML = '<p class="empty-state">Please log in to view your meal plan.</p>';
      }
      
      console.log('🧹 All user data cleared from memory and display');
      
    } catch (error) {
      console.warn('⚠️ Some data clearing operations failed (this is okay):', error);
    }
    
    currentUser = null;
    showAuthSection();
    
    console.log('🔐 User logged out - all data cleared for next user');
    
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('Error during logout', 'error');
  }
}

// Clear all profile form fields
function clearProfileForm(): void {
  try {
    // Profile form fields
    const profileFields = [
      'profileName',
      'dateOfBirth', 
      'profileAge',
      'profileGender',
      'profileHeight',
      'heightUnit',
      'profileIdealWeight',
      'weightUnit',
      'profileCountry'
    ];
    
    profileFields.forEach(fieldId => {
      const field = document.getElementById(fieldId) as HTMLInputElement | HTMLSelectElement;
      if (field) {
        if (field instanceof HTMLSelectElement) {
          field.selectedIndex = 0; // Reset to first option
        } else {
          field.value = ''; // Clear input fields
        }
      }
    });
    
    // Clear avatar display
    const avatarPreview = document.getElementById('avatarPreview') as HTMLImageElement;
    const avatarPlaceholder = document.getElementById('avatarPlaceholder') as HTMLElement;
    const removeAvatarBtn = document.getElementById('removeAvatarBtn') as HTMLButtonElement;
    
    if (avatarPreview) {
      avatarPreview.src = '';
      avatarPreview.style.display = 'none';
    }
    
    if (avatarPlaceholder) {
      avatarPlaceholder.style.display = 'flex';
    }
    
    if (removeAvatarBtn) {
      removeAvatarBtn.style.display = 'none';
    }
    
    // Reset header display
    const userEmailElement = document.getElementById('userEmail');
    const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement;
    const headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
    
    if (userEmailElement) {
      userEmailElement.textContent = 'User';
    }
    
    if (headerAvatar) {
      headerAvatar.style.display = 'none';
    }
    
    if (headerAvatarPlaceholder) {
      headerAvatarPlaceholder.style.display = 'flex';
    }
    
    console.log('🧹 Profile form cleared for next user');
    
  } catch (error) {
    console.error('Error clearing profile form:', error);
  }
}

// Load user-specific data
async function loadUserData(): Promise<void> {
  try {
    // Removed excessive logging for performance
    
    // Import and initialize food tracker (includes foods + shopping list)
    const { initializeFoodTracker } = await import('./food-tracker');
    await initializeFoodTracker();
          // Removed excessive logging for performance
    
    // Import and initialize meals (includes meal data + meal plan)
    const { initializeMeals } = await import('./meals');
    await initializeMeals();
          // Removed excessive logging for performance
    
          // Removed excessive logging for performance
  } catch (error) {
    console.error('❌ Error loading user data:', error);
  }
}

// Generate unique ID
function generateId(): string {
  return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// =====================================================
// ADMIN ROLE CHECKING FUNCTIONS
// =====================================================

// Check if current user is admin or super admin
export async function isCurrentUserAdmin(): Promise<boolean> {
      // Removed excessive logging for performance
  
  try {
    const user = await getCurrentUser();
    // Removed excessive logging for performance
    
    if (!user) {
      console.log('🔐 No user found, returning false');
      return false;
    }
    
    // Removed excessive logging for performance
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking admin status:', error);
      return false;
    }
    
    if (error && error.code === 'PGRST116') {
      console.log('🔐 No role record found for user, defaulting to user role');
    }
    
    const role = data?.role || 'user';
    // Removed excessive logging for performance
    
    const isAdmin = role === 'admin' || role === 'super_admin';
    // Removed excessive logging for performance
    
    return isAdmin;
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return false;
  }
}

// Check if current user is super admin
export async function isCurrentUserSuperAdmin(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking super admin status:', error);
      return false;
    }
    
    const role = data?.role || 'user';
    return role === 'super_admin';
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

// Get current user's role
export async function getCurrentUserRole(): Promise<string> {
  try {
    const user = await getCurrentUser();
    if (!user) return 'guest';
    
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting user role:', error);
      return 'user';
    }
    
    return data?.role || 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
}

// Show/hide admin navigation based on user role
export async function updateAdminNavigation(): Promise<void> {
      // Removed excessive logging for performance
  
  const adminTab = document.getElementById('adminTab');
  if (!adminTab) {
    console.error('❌ Admin tab element not found in DOM');
    return;
  }
  
      // Removed excessive logging for performance
  
  try {
    const isAdmin = await isCurrentUserAdmin();
    // Removed excessive logging for performance
    
    adminTab.style.display = isAdmin ? 'block' : 'none';
    
    // Removed excessive logging for performance
    // Removed excessive logging for performance
  } catch (error) {
    console.error('❌ Error in updateAdminNavigation:', error);
    // Hide admin tab on error
    adminTab.style.display = 'none';
  }
}

// Debug function - can be called from browser console
export async function debugAdminStatus(): Promise<void> {
  console.log('🐛 === ADMIN DEBUG START ===');
  
  const user = await getCurrentUser();
  console.log('🐛 Current user:', user);
  
  if (!user) {
    console.log('🐛 No user logged in');
    return;
  }
  
  try {
    const role = await getCurrentUserRole();
    console.log('🐛 User role:', role);
    
    const isAdmin = await isCurrentUserAdmin();
    console.log('🐛 Is admin:', isAdmin);
    
    const isSuperAdmin = await isCurrentUserSuperAdmin();
    console.log('🐛 Is super admin:', isSuperAdmin);
    
    const adminTab = document.getElementById('adminTab');
    console.log('🐛 Admin tab element:', adminTab);
    console.log('🐛 Admin tab display:', adminTab?.style.display);
    
    // Force update admin navigation
    await updateAdminNavigation();
    
  } catch (error) {
    console.error('🐛 Debug error:', error);
  }
  
  console.log('🐛 === ADMIN DEBUG END ===');
}

// Make debug function available globally
(window as any).debugAdminStatus = debugAdminStatus; 