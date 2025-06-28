import './styles/main.css';
import { initializeSupabase } from './js/supabase-client';
import { initializeAuth } from './js/auth';
import { initializeDatabase } from './js/database';

// Initialize the application
async function initializeApp(): Promise<void> {
  console.log('🚀 Initializing Nutrivalor Application...');
  
  try {
    // Initialize Supabase connection
    initializeSupabase();
    
    // Initialize all modules
    await Promise.all([
      initializeAuth(),
      initializeDatabase()
    ]);
    
    console.log('✅ Nutrivalor Application initialized successfully');
    
    // Show initial page based on authentication state
    const { isAuthenticated } = await import('./js/auth');
    const authenticated = await isAuthenticated();
    
    if (authenticated) {
      document.getElementById('auth-section')?.classList.add('hidden');
      document.getElementById('app-section')?.classList.remove('hidden');
    } else {
      document.getElementById('auth-section')?.classList.remove('hidden');
      document.getElementById('app-section')?.classList.add('hidden');
    }
    
  } catch (error) {
    console.error('❌ Error initializing application:', error);
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
} 