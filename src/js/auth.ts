import { supabase, getCurrentUser, localStorageWrapper } from './supabase-client';
import type { User } from '@supabase/supabase-js';

// Authentication Module for NutriValor
let currentUser: User | null = null;

// Initialize authentication
export async function initializeAuth(): Promise<void> {
  console.log('🔐 Initializing authentication...');
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
    console.log('✅ Login form event listener attached');
  } else {
    console.warn('❌ Login form not found');
  }
  
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
    console.log('✅ Signup form event listener attached');
  } else {
    console.warn('❌ Signup form not found');
  }
  
  if (forgotForm) {
    forgotForm.addEventListener('submit', handleForgotPassword);
    console.log('✅ Forgot password form event listener attached');
  } else {
    console.warn('❌ Forgot password form not found');
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
    console.log('✅ Logout button event listener attached');
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
      handleAuthSuccess(user);
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
function handleAuthSuccess(user: User): void {
  currentUser = user;
  hideLoading();
  showMainApp();
  updateUserInfo(user);
  loadUserData();
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
function updateUserInfo(user: User): void {
  const userEmailElement = document.getElementById('userEmail');
  const headerAvatar = document.getElementById('headerAvatar') as HTMLImageElement;
  const headerAvatarPlaceholder = document.getElementById('headerAvatarPlaceholder');
  
  if (userEmailElement) {
    // Try to get name from saved profile first, then fallback to email
    const savedProfile = localStorage.getItem('nutrivalor_profile');
    let displayName = user.email || 'User';
    let avatarSrc = null;
    
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

// Show message to user
function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('auth-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'auth-message';
    messageEl.className = 'message';
    const authSection = document.getElementById('auth-section');
    if (authSection) {
      authSection.insertBefore(messageEl, authSection.firstChild);
    }
  }
  
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  // Hide after 5 seconds
  setTimeout(() => {
    if (messageEl) messageEl.style.display = 'none';
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
      handleAuthSuccess(userWithoutPassword);
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
      handleAuthSuccess(data.user);
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
      handleAuthSuccess(user as User);
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
      handleAuthSuccess(data.user);
      showMessage('Account created successfully!', 'success');
    }
    
  } catch (error) {
    console.error('Signup error:', error);
    showMessage('An error occurred during signup', 'error');
    showAuthSection();
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
    
    // Clear localStorage
    localStorageWrapper.removeItem('currentUser');
    
    currentUser = null;
    showAuthSection();
    
  } catch (error) {
    console.error('Logout error:', error);
    showMessage('Error during logout', 'error');
  }
}

// Load user-specific data
async function loadUserData(): Promise<void> {
  try {
    console.log('Loading user data...');
    
    // Import and call the food tracker's load function
    const { loadAndDisplayFoods } = await import('./food-tracker');
    await loadAndDisplayFoods();
    
    console.log('✅ User data loaded successfully');
  } catch (error) {
    console.error('❌ Error loading user data:', error);
  }
}

// Generate unique ID
function generateId(): string {
  return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
} 