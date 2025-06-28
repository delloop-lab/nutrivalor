import './styles/main.css';
import { initializeSupabase } from './js/supabase-client';
import { initializeAuth } from './js/auth';
import { initializeDatabase } from './js/database';
import { initializeFoodTracker } from './js/food-tracker';

// Initialize the application
async function initializeApp(): Promise<void> {
  console.log('🚀 Initializing Nutrivalor Application...');
  
  try {
    // Initialize Supabase connection
    initializeSupabase();
    
    // Initialize authentication first (it handles the UI state)
    await initializeAuth();
    
    // Initialize database
    await initializeDatabase();
    
    // Initialize food tracker
    await initializeFoodTracker();
    
    // Setup modal event listeners
    setupModalEventListeners();
    
    // Make functions globally available
    setupGlobalFunctions();
    
    console.log('✅ Nutrivalor Application initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing application:', error);
  }
}

// Setup global functions for onclick handlers
function setupGlobalFunctions(): void {
  // Modal functions
  (window as any).showUploadModal = showUploadModal;
  (window as any).closeUploadModal = closeUploadModal;
  (window as any).showMealUploadModal = showMealUploadModal;
  (window as any).closeMealUploadModal = closeMealUploadModal;
  
  // Section navigation
  (window as any).showSection = showSection;
  
  // Other functions that might be called from HTML
  (window as any).filterByCategory = filterByCategory;
  (window as any).updateProfile = updateProfile;
  (window as any).exportData = exportData;
  (window as any).clearAllData = clearAllData;
  
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

  console.log(`📍 Switched to section: ${sectionId}`);
}

// Placeholder functions (to be implemented)
function filterByCategory(category: string): void {
  console.log(`🔍 Filter by category: ${category}`);
  // Implementation will be added
}

function updateProfile(): void {
  console.log('👤 Update profile');
  // Implementation will be added
}

function exportData(): void {
  console.log('💾 Export data');
  // Implementation will be added
}

function clearAllData(): void {
  console.log('🗑️ Clear all data');
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

// Wait for DOM to load before initializing
document.addEventListener('DOMContentLoaded', () => {
  console.log('📱 DOM loaded, starting Nutrivalor...');
  initializeApp();
}); 