import { supabase, getCurrentUser } from './supabase-client';
import { isCurrentUserAdmin, isCurrentUserSuperAdmin } from './auth';
import { loadAndDisplayFoods, allFoods } from './food-tracker';
import { openEditFoodModal, openEditMealModal, currentMealIngredients } from './simple-edit';
import { reloadMeals } from './meals';

// --- Admin Module State ---
let currentFoods: any[] = [];
let mealManagementInitialized = false;

// --- Entry Point for Admin Section ---
export async function initializeAdmin(): Promise<void> {
  try {
    await loadFoodsForIngredients();
    if (!mealManagementInitialized) {
      setupMealManagementEventListeners();
      mealManagementInitialized = true;
    }
    
    // Setup food tracker event listeners for Add Food form
    const { setupFoodTrackerEventListeners } = await import('./food-tracker');
    setupFoodTrackerEventListeners();
    
    // Initialize user management
    await initializeUserManagement();
  } catch (error) {
    showMessage('Error initializing admin panel', 'error');
  }
}

// --- User Management Functions ---
async function initializeUserManagement(): Promise<void> {
  try {
    
    // Check if user is super admin
    const isSuperAdmin = await isCurrentUserSuperAdmin();
    if (!isSuperAdmin) {
      const userManagementCard = document.querySelector('.admin-card') as HTMLElement;
      if (userManagementCard) {
        userManagementCard.style.display = 'none';
      }
      return;
    }
    
    // Load initial user list
    await refreshUserList();
    
    // Update current user role display
    await updateCurrentUserRoleDisplay();
    
  } catch (error) {
    console.error('❌ Error initializing user management:', error);
  }
}

// Function to refresh user list (called from HTML)
export async function refreshUserList(): Promise<void> {
  try {
    
    const isSuperAdmin = await isCurrentUserSuperAdmin();
    if (!isSuperAdmin) {
      return;
    }
    
    // First check if user_roles table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_roles')
      .select('user_id')
      .limit(1);
    
    if (tableError && tableError.code === 'PGRST200') {
      // Table doesn't exist, show setup message
      const userListContainer = document.getElementById('userListContainer');
      if (userListContainer) {
        userListContainer.innerHTML = `
          <div class="setup-message">
            <h3>🛠️ Database Setup Required</h3>
            <p>The user management system needs to be set up in your database.</p>
            <div class="setup-steps">
              <h4>Steps to complete setup:</h4>
              <ol>
                <li>Go to your Supabase Dashboard</li>
                <li>Navigate to the SQL Editor</li>
                <li>Run the <code>create-user-roles-table.sql</code> script</li>
                <li>Run the <code>setup-super-admin.sql</code> script</li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <button onclick="refreshUserList()" class="btn btn-primary">Retry After Setup</button>
          </div>
        `;
      }
      return;
    }
    
    // Get all users with their roles using the secure server function
    const { data: usersWithRoles, error } = await supabase
      .rpc('get_admin_user_list');
    
    if (error) throw error;
    
    // Display users
    await displayUserList(usersWithRoles || []);
    
  } catch (error) {
    showMessage('Error loading users', 'error');
  }
}

async function displayUserList(users: any[]): Promise<void> {
  const container = document.getElementById('userListContainer');
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = '<div class="no-users">No users found</div>';
    return;
  }
  
  const userListHtml = users.map(user => {
    const role = user.role || 'user';
    const isConfirmed = user.email && user.email.length > 0; // If email exists, treat as confirmed
    const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';
    const lastLogin = user.last_sign_in_at 
      ? new Date(user.last_sign_in_at).toLocaleDateString()
      : 'Never';
    
    return `
      <div class="user-item">
        <div class="user-info">
          <div class="user-email">${user.email || 'Unknown'}</div>
          <div class="user-meta">
            <span class="user-status ${isConfirmed ? 'confirmed' : 'pending'}">
              ${isConfirmed ? 'Confirmed' : 'Pending'}
            </span>
            <span class="user-join-date">Joined: ${joinDate}</span>
            <span class="user-last-login">Last login: ${lastLogin}</span>
          </div>
        </div>
        <div class="user-role-section">
          <span class="current-role ${role}">${role.replace('_', '-')}</span>
          ${role === 'user' ? 
            `<button class="role-btn grant" onclick="grantAdminRole('${user.user_id}')">Grant Admin</button>` :
            `<button class="role-btn revoke" onclick="revokeAdminRole('${user.user_id}')">Revoke Admin</button>`
          }
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = userListHtml;
}

// Function to grant admin role (called from HTML)
export async function grantAdminRole(userId: string): Promise<void> {
  try {
    
    const isSuperAdmin = await isCurrentUserSuperAdmin();
    if (!isSuperAdmin) {
      showMessage('Only super admins can grant admin roles', 'error');
      return;
    }
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      showMessage('You must be logged in to perform this action', 'error');
      return;
    }
    
    // Update user role
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'admin',
        granted_by: currentUser.id,
        granted_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    showMessage('Admin role granted successfully', 'success');
    await refreshUserList();
    
  } catch (error) {
    showMessage('Error granting admin role', 'error');
  }
}

// Function to revoke admin role (called from HTML)
export async function revokeAdminRole(userId: string): Promise<void> {
  try {
    
    const isSuperAdmin = await isCurrentUserSuperAdmin();
    if (!isSuperAdmin) {
      showMessage('Only super admins can revoke admin roles', 'error');
      return;
    }
    
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      showMessage('You must be logged in to perform this action', 'error');
      return;
    }
    
    // Update user role back to user
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'user',
        granted_by: currentUser.id,
        granted_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    showMessage('Admin role revoked successfully', 'success');
    await refreshUserList();
    
  } catch (error) {
    showMessage('Error revoking admin role', 'error');
  }
}

// Function to update current user role display
async function updateCurrentUserRoleDisplay(): Promise<void> {
  try {
    
    // Try to get role directly from auth module
    let role = 'user'; // default fallback
    
    try {
      const { getCurrentUserRole } = await import('./auth');
      role = await getCurrentUserRole();
    } catch (importError) {
      
      // Fallback: try to get role directly
      try {
        const user = await getCurrentUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();
          
          if (!error && data) {
            role = data.role;
          } else {
          }
        }
      } catch (directError) {
      }
    }
    
    const roleDisplay = document.getElementById('currentUserRole');
    if (roleDisplay) {
      const displayText = role.replace('_', ' ').toUpperCase();
      roleDisplay.textContent = displayText;
      roleDisplay.className = `role-badge ${role}`;
    } else {
    }
  } catch (error) {
    
    // Set a fallback display
    const roleDisplay = document.getElementById('currentUserRole');
    if (roleDisplay) {
      roleDisplay.textContent = 'ERROR';
      roleDisplay.className = 'role-badge error';
    }
  }
}

// --- Data Loading ---
async function loadFoodsForIngredients(): Promise<void> {
  if (allFoods.length > 0) return; // Use global allFoods from food-tracker
  try {
    const { data, error } = await supabase.from('foods').select('*').order('name');
    if (error) throw error;
    allFoods.push(...(data || []));
  } catch (error) {
  }
}

// --- Event Listener Setup ---
function setupMealManagementEventListeners(): void {
  const mealForm = document.getElementById('addMealForm') as HTMLFormElement;
  if (mealForm) {
    mealForm.addEventListener('submit', handleAddMeal);
    mealForm.addEventListener('reset', handleClearMealForm);
  }
}

// --- Core Logic: Create Meal ---
async function handleAddMeal(event: Event): Promise<void> {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);

  try {
    const mealName = formData.get('mealName') as string;
    const mealType = formData.get('mealType') as string;
    const cookingInstructions = formData.get('cookingInstructions') as string;

    const user = await getCurrentUser();
    if (!user) throw new Error("You must be logged in to create a meal.");

    if (currentMealIngredients.length === 0) {
      showMessage('Please add at least one ingredient.', 'error');
      return;
    }

    const totalCarbs = currentMealIngredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = currentMealIngredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    const totalProtein = currentMealIngredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);

    const mealData = {
      number: `M${Date.now()}`,
      name: mealName.trim(),
      meal_type: mealType,
      cooking_instructions: cookingInstructions?.trim() || null,
      ingredients: JSON.stringify(currentMealIngredients),
      total_carbs: totalCarbs,
      total_fat: totalFat,
      total_protein: totalProtein,
      user_id: user.id,
      created_by: user.email,
    };

    const { data: newMeal, error: mealError } = await supabase
      .from('meals')
      .insert(mealData)
      .select('id')
      .single();

    if (mealError) throw mealError;
    if (!newMeal || !newMeal.id) throw new Error("Meal created, but failed to get new meal ID back from database.");

    showMessage('Meal created successfully!', 'success');
    form.reset();
    await reloadMeals();
    const mealsLink = document.querySelector('nav a[href="#meals"]') as HTMLElement;
    if (mealsLink) mealsLink.click();
    if (typeof window.closeEditMealModal === 'function') {
      window.closeEditMealModal();
    }

  } catch (error) {
    showMessage(`Error: ${(error as Error).message}`, 'error');
  }
}

// --- Form and UI Helpers ---
function handleClearMealForm(): void {
  currentMealIngredients.length = 0;
  const ingredientsList = document.getElementById('ingredientsList');
  if (ingredientsList) ingredientsList.innerHTML = '';
}

function showMessage(message: string, type: 'success' | 'error' = 'success'): void {
  const messageEl = document.getElementById('admin-message') || document.createElement('div');
  messageEl.id = 'admin-message';
  messageEl.className = `message ${type}`;
  messageEl.textContent = message;

  const container = document.getElementById('admin') || document.body;
  if (!messageEl.parentElement) {
      container.insertBefore(messageEl, container.firstChild);
  }
  
  messageEl.style.display = 'block';
  setTimeout(() => { messageEl.style.display = 'none'; }, 4000);
}

// --- Functions to be attached to window ---
// Make functions available globally
declare global {
  interface Window {
    refreshUserList: () => Promise<void>;
    grantAdminRole: (userId: string) => Promise<void>;
    revokeAdminRole: (userId: string) => Promise<void>;
    updateRoleDisplay: () => Promise<void>;
  }
}

// Attach functions to window object
window.refreshUserList = refreshUserList;
window.grantAdminRole = grantAdminRole;
window.revokeAdminRole = revokeAdminRole;

// Add debug function to manually update role display
window.updateRoleDisplay = updateCurrentUserRoleDisplay; 