import { supabase, getCurrentUser } from './supabase-client';
import { isCurrentUserSuperAdmin, getCurrentUserRole, isCurrentUserAdmin } from './auth';
// Note: Removed old ingredient modal imports - now using simple-edit.ts
import { loadAndDisplayFoods, allFoods } from './food-tracker';

// Import simple edit functions
import { openEditFoodModal, openEditMealModal } from './simple-edit';
import { loadMealsFromDatabase } from './meals';

// Admin Module for NutriValor
let currentUsers: any[] = [];
let currentFoods: any[] = [];
let mealManagementInitialized = false;
let currentEditingMeal: any = null;
let ingredients: any[] = [];

// Initialize admin functionality
export async function initializeAdmin(): Promise<void> {
  try {
    // Update role display
    await updateRoleDisplay();
    
    // Load user list
    await loadUserList();
    
    // Load food management
    await loadFoodManagement();
    
  } catch (error) {
    console.error('❌ Error initializing admin panel:', error);
    showMessage('Error initializing admin panel', 'error');
  }
}

// Update role display
async function updateRoleDisplay(): Promise<void> {
  const roleElement = document.getElementById('currentUserRole');
  if (!roleElement) return;
  
  try {
    const role = await getCurrentUserRole();
    roleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
    roleElement.className = `role-badge ${role}`;
  } catch (error) {
    console.error('Error updating role display:', error);
    roleElement.textContent = 'User';
    roleElement.className = 'role-badge user';
  }
}

// Load and display user list
export async function loadUserList(): Promise<void> {
  const container = document.getElementById('userListContainer');
  if (!container) return;
  
  try {
    container.innerHTML = '<div class="loading-users">Loading users...</div>';
    
    const { data: users, error } = await supabase
      .from('user_management')
      .select('*')
      .order('user_created_at', { ascending: false });
    
    if (error) {
      container.innerHTML = '<div class="error-message">Error loading users</div>';
      return;
    }
    
    currentUsers = users || [];
    displayUserList(currentUsers);
    
  } catch (error) {
    container.innerHTML = '<div class="error-message">Error loading users</div>';
  }
}

// Display user list
function displayUserList(users: any[]): void {
  const container = document.getElementById('userListContainer');
  if (!container) return;
  
  if (users.length === 0) {
    container.innerHTML = '<div class="empty-state">No users found</div>';
    return;
  }
  
  const userListHTML = users.map(user => {
    const joinDate = new Date(user.user_created_at).toLocaleDateString();
    const lastLogin = user.last_sign_in_at 
      ? new Date(user.last_sign_in_at).toLocaleDateString() 
      : 'Never';
    
    const isConfirmed = user.email_confirmed_at ? 'Confirmed' : 'Pending';
    const roleClass = user.role === 'super_admin' ? 'super-admin' : user.role;
    
    return `
      <div class="user-item" data-user-id="${user.id}">
        <div class="user-info">
          <div class="user-email">${user.email}</div>
          <div class="user-meta">
            <span class="user-status ${isConfirmed.toLowerCase()}">${isConfirmed}</span>
            <span class="user-join-date">Joined: ${joinDate}</span>
            <span class="user-last-login">Last login: ${lastLogin}</span>
          </div>
        </div>
        
        <div class="user-role-section">
          <span class="current-role ${roleClass}">${user.role.replace('_', ' ').toUpperCase()}</span>
          <div class="role-actions">
            ${generateRoleButtons(user)}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = userListHTML;
}

// Generate role action buttons based on current user's permissions
function generateRoleButtons(user: any): string {
  // Only super admins can change roles
  return `
    <button 
      onclick="toggleUserRole('${user.id}', '${user.email}', '${user.role}')" 
      class="role-btn ${user.role === 'admin' || user.role === 'super_admin' ? 'revoke' : 'grant'}"
      id="roleBtn_${user.id}"
    >
      ${user.role === 'admin' || user.role === 'super_admin' ? 'Revoke Admin' : 'Make Admin'}
    </button>
  `;
}

// Toggle user role between user and admin
export async function toggleUserRole(userId: string, email: string, currentRole: string): Promise<void> {
  try {
    // Check if current user is super admin
    const isSuperAdmin = await isCurrentUserSuperAdmin();
    if (!isSuperAdmin) {
      showMessage('Only Super Admins can manage user roles', 'error');
      return;
    }
    
    // Don't allow changing super admin roles
    if (currentRole === 'super_admin') {
      showMessage('Super Admin roles cannot be changed', 'error');
      return;
    }
    
    const newRole = (currentRole === 'admin') ? 'user' : 'admin';
    const action = newRole === 'admin' ? 'grant' : 'revoke';
    
    const confirmed = confirm(
      `Are you sure you want to ${action} admin privileges ${newRole === 'admin' ? 'to' : 'from'} ${email}?`
    );
    
    if (!confirmed) return;
    
    // Update role in database
    const { error } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: newRole,
        granted_by: (await getCurrentUser())?.id
      });
    
    if (error) {
      console.error('Error updating user role:', error);
      showMessage('Error updating user role', 'error');
      return;
    }
    
    showMessage(
      `Successfully ${action === 'grant' ? 'granted' : 'revoked'} admin privileges ${action === 'grant' ? 'to' : 'from'} ${email}`, 
      'success'
    );
    
    // Refresh user list
    await loadUserList();
    
  } catch (error) {
    console.error('Error toggling user role:', error);
    showMessage('Error updating user role', 'error');
  }
}

// Refresh user list
export async function refreshUserList(): Promise<void> {
  await loadUserList();
  showMessage('User list refreshed', 'success');
}

// Show message helper
export function showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success'): void {
  // Create or update message element
  let messageEl = document.getElementById('admin-message');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'admin-message';
    messageEl.className = 'message';
    const container = document.getElementById('admin') || document.body;
    container.insertBefore(messageEl, container.firstChild);
  }
  
  messageEl.textContent = message;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
  
  // Hide after 4 seconds
  setTimeout(() => {
    if (messageEl) messageEl.style.display = 'none';
  }, 4000);
}

// FOOD MANAGEMENT FUNCTIONS
// =====================================================

// Load foods for edit dropdown
async function loadFoodsForEditDropdown(): Promise<void> {
  try {
    console.log('🍎 Loading foods for edit dropdown...');
    const { data: foods, error } = await supabase
      .from('foods')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading foods:', error);
      showMessage('Error loading foods for editing', 'error');
      return;
    }

    // Store foods for later use
    currentFoods = foods || [];

    // Get dropdown element
    const dropdown = document.getElementById('foodSelectDropdown') as HTMLSelectElement;
    if (!dropdown) {
      console.warn('Food select dropdown not found');
      return;
    }

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Choose a food to edit...</option>';

    // Add foods to dropdown
    foods?.forEach(food => {
      const option = document.createElement('option');
      option.value = food.id;
      option.textContent = food.brand ? 
        `${food.name} (${food.brand})` : 
        food.name;
      dropdown.appendChild(option);
    });

    console.log(`📊 Loaded ${foods?.length || 0} foods for editing`);
  } catch (error) {
    console.error('Error loading foods for dropdown:', error);
    showMessage('Error loading foods', 'error');
  }
}

// Load and display food management section
export async function loadFoodManagement(): Promise<void> {
  try {
    // Load foods first
    await loadAndDisplayFoods();
    
    // Then setup event listeners
    setupFoodManagementEventListeners();
    
  } catch (error) {
    // Continue with admin initialization even if food management fails
  }
}

// Setup event listeners for food management
function setupFoodManagementEventListeners(): void {
  const addFoodForm = document.getElementById('addFoodForm') as HTMLFormElement;
  if (addFoodForm) {
    addFoodForm.addEventListener('submit', handleAddFood);
  }
  
  // Add duplicate detection for food name and brand
  const foodNameInput = document.getElementById('foodName') as HTMLInputElement;
  const foodBrandInput = document.getElementById('foodBrand') as HTMLInputElement;
  
  if (foodNameInput) {
    foodNameInput.addEventListener('input', checkForDuplicates);
  }
  
  if (foodBrandInput) {
    foodBrandInput.addEventListener('input', checkForDuplicates);
  }
}

// Check for duplicate food items
async function checkForDuplicates(): Promise<void> {
  const foodNameInput = document.getElementById('foodName') as HTMLInputElement;
  const foodBrandInput = document.getElementById('foodBrand') as HTMLInputElement;
  const duplicateWarning = document.getElementById('duplicateWarning');
  
  if (!foodNameInput || !duplicateWarning) return;
  
  const foodName = foodNameInput.value.trim();
  const foodBrand = foodBrandInput?.value.trim() || '';
  
  // Only check if we have a food name
  if (!foodName) {
    duplicateWarning.style.display = 'none';
    return;
  }
  
  try {
    // Search for existing food with same name and brand
    let query = supabase
      .from('foods')
      .select('id, name, brand')
      .ilike('name', foodName);
    
    // If brand is provided, include it in the search
    if (foodBrand) {
      query = query.ilike('brand', foodBrand);
    }
    
    const { data: existingFoods, error } = await query;
    
    if (error) {
      console.error('Error checking for duplicates:', error);
      return;
    }
    
    // Check for exact matches (case-insensitive)
    const duplicateFound = existingFoods?.some(food => 
      food.name.toLowerCase() === foodName.toLowerCase() &&
      (food.brand || '').toLowerCase() === foodBrand.toLowerCase()
    );
    
    if (duplicateFound) {
      duplicateWarning.style.display = 'block';
    } else {
      duplicateWarning.style.display = 'none';
    }
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    duplicateWarning.style.display = 'none';
  }
}

// Handle adding new food item
async function handleAddFood(event: Event): Promise<void> {
  event.preventDefault();
  
  try {
    // Check if current user is admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      showMessage('Only admins can add food items', 'error');
      return;
    }
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Get current user for attribution
    const user = await getCurrentUser();
    let createdBy = 'Admin User';
    
    if (user) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('name')
          .eq('user_id', user.id)
          .single();
        
        createdBy = profile?.name || user.email || 'Admin User';
      } catch (error) {
        createdBy = user.email || 'Admin User';
      }
    }

    // Extract form data
    const foodData = {
      name: formData.get('foodName') as string,
      brand: formData.get('foodBrand') as string || null,
      carbs: parseFloat(formData.get('foodCarbs') as string) || 0,
      fat: parseFloat(formData.get('foodFat') as string) || 0,
      protein: parseFloat(formData.get('foodProtein') as string) || 0,
      category: formData.get('foodCategory') as string || 'OTHER',
      created_by: createdBy,
      user_id: null  // Global food - accessible to all users
    };
    
    // Validate required fields
    if (!foodData.name.trim()) {
      showMessage('Food name is required', 'error');
      return;
    }
    
    console.log('🍎 Adding food with data:', foodData);
    
    // Insert food into database
    const { error } = await supabase
      .from('foods')
      .insert(foodData);
    
    if (error) {
      console.error('Error adding food:', error);
      showMessage('Error adding food item', 'error');
      return;
    }
    
    showMessage(`Successfully added "${foodData.name}" to the food database`, 'success');
    
    // Reload food tracker if available
    if (typeof (window as any).reloadFoodTracker === 'function') {
      console.log('🔄 Reloading food tracker...');
      await (window as any).reloadFoodTracker();
    }
    
    // Reload food dropdowns
    await loadFoodsForEditDropdown();
    
    // Reset form
    form.reset();
    
  } catch (error) {
    console.error('Error adding food:', error);
    showMessage('Error adding food item', 'error');
  }
}

// MEAL MANAGEMENT FUNCTIONS
// =====================================================

// Load and display meal management section
export async function loadMealManagement(): Promise<void> {
  if (mealManagementInitialized) {
    console.log('🍽️ Meal management already initialized');
    return;
  }
  
  console.log('🍽️ Loading meal management...');
  
  // Load foods for ingredient dropdowns
  await loadFoodsForIngredients();
  
  // Load meals for edit dropdown
  await loadMealsForEditDropdown();
  
  // Load foods for edit dropdown
  await loadFoodsForEditDropdown();
  
  // Setup meal form event listeners
  setupMealManagementEventListeners();
  
  mealManagementInitialized = true;
  console.log('✅ Meal management loaded');
  
  // Set up meal picture event listeners
  setTimeout(() => {
    if (typeof (window as any).setupMealPictureEventListeners === 'function') {
      (window as any).setupMealPictureEventListeners();
    }
  }, 100);
}

async function loadFoodsForIngredients(): Promise<void> {
  try {
    // Only load if not already loaded
    if (currentFoods.length > 0) {
      console.log(`📦 Foods already loaded (${currentFoods.length} items)`);
      return;
    }
    
    const { data: foods, error } = await supabase
      .from('foods')
      .select('id, name, category')
      .order('name');
    
    if (error) {
      console.error('Error loading foods for ingredients:', error);
      return;
    }
    
    // Remove duplicates based on name and category combination
    const uniqueFoods = foods?.filter((food, index, self) => 
      index === self.findIndex(f => 
        f.name.toLowerCase() === food.name.toLowerCase() && 
        f.category === food.category
      )
    ) || [];
    
    currentFoods = uniqueFoods;
    console.log(`📦 Loaded ${currentFoods.length} unique foods for ingredient selection`);
    
    // Log if duplicates were found
    const duplicateCount = (foods?.length || 0) - uniqueFoods.length;
    if (duplicateCount > 0) {
      console.warn(`⚠️ Found and removed ${duplicateCount} duplicate food entries`);
      
      // Log the duplicates for debugging
      const duplicates = foods?.filter((food, index, self) => 
        self.findIndex(f => 
          f.name.toLowerCase() === food.name.toLowerCase() && 
          f.category === food.category
        ) !== index
      ) || [];
      
      console.warn('Duplicate foods found:', duplicates.map(d => `${d.name} (${d.category})`));
    }
    
  } catch (error) {
    console.error('Error loading foods for ingredients:', error);
  }
}

function setupMealManagementEventListeners(): void {
  const mealForm = document.getElementById('addMealForm') as HTMLFormElement;
  
  if (mealForm) {
    mealForm.addEventListener('submit', handleAddMeal);
    mealForm.addEventListener('reset', handleClearMealForm);
  }
}

// Handle add meal form submission
export async function handleAddMeal(event: Event): Promise<void> {
  event.preventDefault();
  
  const form = event.target as HTMLFormElement;
  const formData = new FormData(form);
  
  try {
    // Get form data
    const mealName = formData.get('mealName') as string;
    const mealType = formData.get('mealType') as string;
    const mealPicture = formData.get('mealPicture') as string;
    const cookingInstructions = formData.get('cookingInstructions') as string;
    
    // Get current user
    const user = await getCurrentUser();
    if (!user) {
      showMessage('You must be logged in to add meals', 'error');
      return;
    }
    
    if (ingredients.length === 0) {
      showMessage('Please add at least one ingredient', 'error');
      return;
    }
    
    // Fetch nutritional data for each ingredient
    const enrichedIngredients = await Promise.all(ingredients.map(async (ing) => {
      try {
        const { data: foodData, error } = await supabase
          .from('foods')
          .select('carbs, fat, protein')
          .eq('id', ing.food_id)
          .single();

        if (error) {
          console.warn(`Could not fetch nutrition data for food_id: ${ing.food_id}`);
          return {
            food_id: ing.food_id,
            food_name: ing.food_name,
            name: ing.food_name,
            quantity: ing.quantity,
            instructions: ing.instructions,
            carbs: 0,
            fat: 0,
            protein: 0
          };
        }
        
        return {
          food_id: ing.food_id,
          food_name: ing.food_name,
          name: ing.food_name,
          quantity: ing.quantity,
          instructions: ing.instructions,
          carbs: foodData.carbs || 0,
          fat: foodData.fat || 0,
          protein: foodData.protein || 0
        };
      } catch (error) {
        console.error(`Error fetching nutrition for ingredient ${ing.food_name}:`, error);
        return {
          food_id: ing.food_id,
          food_name: ing.food_name,
          name: ing.food_name,
          quantity: ing.quantity,
          instructions: ing.instructions,
          carbs: 0,
          fat: 0,
          protein: 0
        };
      }
    }));

    // Calculate total nutrition
    const totalCarbs = enrichedIngredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
    const totalFat = enrichedIngredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
    const totalProtein = enrichedIngredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);

    // Create meal object - matching the actual database schema
    const mealData = {
      number: `M${Date.now()}`, // Generate a unique meal number
      name: mealName.trim(),
      meal_type: mealType,
      picture: mealPicture?.trim() || null,
      cooking_instructions: cookingInstructions?.trim() || null,
      ingredients: JSON.stringify(enrichedIngredients),
      total_carbs: totalCarbs,
      total_fat: totalFat,
      total_protein: totalProtein,
      user_id: user.id, // Attribute to the logged-in user
      created_by: user.email // Store the creator's email for display
    };
    
    console.log('🍽️ Creating meal:', mealData);
    
    // Insert meal into database
    const { data, error } = await supabase
      .from('meals')
      .insert([mealData])
      .select();
    
    if (error) {
      console.error('Error creating meal:', error);
      showMessage('Error creating meal: ' + error.message, 'error');
      return;
    }
    
    console.log('✅ Meal created successfully:', data);
    showMessage(`Successfully created meal: ${mealName}`, 'success');
    
    // Reload meals in the main meals section
    if (typeof (window as any).reloadMeals === 'function') {
      console.log('🔄 Reloading meals display...');
      await (window as any).reloadMeals();
    }
    
    // Clear the form
    form.reset();
    handleClearMealForm();
    
  } catch (error) {
    console.error('Error creating meal:', error);
    showMessage('Error creating meal', 'error');
  }
}

// Handle clear meal form
function handleClearMealForm(): void {
  ingredients = [];
  // renderIngredientsList(); // Commented out - using simple-edit.ts system
  
  // Clear rich text editor
  const editor = document.getElementById('cookingInstructions') as HTMLDivElement;
  if (editor) {
    editor.innerHTML = '';
  }
  
  // Clear hidden input
  const hiddenInput = document.getElementById('cookingInstructionsHidden') as HTMLInputElement;
  if (hiddenInput) {
    hiddenInput.value = '';
  }
  
  // Clear picture preview
  const preview = document.getElementById('mealPicturePreview') as HTMLImageElement;
  const placeholder = document.getElementById('mealPicturePlaceholder') as HTMLElement;
  const removeBtn = document.getElementById('removeMealPictureBtn') as HTMLButtonElement;
  
  if (preview && placeholder) {
    preview.style.display = 'none';
    placeholder.style.display = 'block';
  }
  if (removeBtn) {
    removeBtn.style.display = 'none';
  }
}

// DATABASE CLEANUP FUNCTIONS
// =====================================================

// Remove duplicate foods from database
// Meal Editing Functions

export async function loadMealsForEditDropdown(): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) return;

    // Load all meals (admin can edit all meals)
    const { data: meals, error } = await supabase
      .from('meals')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading meals:', error);
      return;
    }

    const dropdown = document.getElementById('mealSelectDropdown') as HTMLSelectElement;
    if (!dropdown) return;

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Choose a meal to edit...</option>';

    if (!meals || meals.length === 0) {
      dropdown.innerHTML += '<option value="" disabled>No meals available</option>';
      return;
    }

    // Add meals to dropdown
    meals.forEach(meal => {
      const option = document.createElement('option');
      option.value = meal.id;
      option.textContent = `${meal.name} (${meal.created_by || (meal.user_id ? 'User Recipe' : 'No Carb Coach')})`;
      dropdown.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading meals for dropdown:', error);
  }
}

export async function selectMealForEdit(mealId: string): Promise<void> {
  try {
    // If no meal selected, hide the form
    const formContainer = document.getElementById('editMealFormContainer');
    if (!mealId) {
      if (formContainer) {
        formContainer.style.display = 'none';
      }
      currentEditingMeal = null;
      return;
    }

    // Fetch meal details
    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .single();

    if (error || !meal) {
      console.error('Error fetching meal:', error);
      showMessage('Error loading meal for editing', 'error');
      return;
    }

    currentEditingMeal = meal;
    await populateEditForm(meal);

    // Show edit form
    if (formContainer) {
      formContainer.style.display = 'block';
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    console.log('Meal edit form populated with:', meal);
  } catch (error) {
    console.error('Error selecting meal for edit:', error);
    showMessage('Error loading meal for editing', 'error');
  }
}

// Populate edit form with meal data
async function populateEditForm(meal: any): Promise<void> {
  const nameInput = document.getElementById('editMealName') as HTMLInputElement;
  const typeSelect = document.getElementById('editMealType') as HTMLSelectElement;
  const pictureInput = document.getElementById('editMealPicture') as HTMLInputElement;
  const instructionsInput = document.getElementById('editCookingInstructions') as HTMLDivElement;
  
  if (nameInput) nameInput.value = meal.name || '';
  if (typeSelect) typeSelect.value = meal.meal_type || '';
  if (pictureInput) pictureInput.value = meal.picture || '';
  if (instructionsInput) instructionsInput.innerHTML = meal.cooking_instructions || '';
  
  // Parse and set ingredients
  try {
    const parsedIngredients = typeof meal.ingredients === 'string' 
      ? JSON.parse(meal.ingredients) 
      : meal.ingredients || [];
    
    ingredientState.ingredients = parsedIngredients.map((ing: any) => ({
      food_id: ing.food_id,
      food_name: ing.food_name || ing.name,
      quantity: ing.quantity,
      instructions: ing.instructions || ''
    }));
    
    // Render ingredients list
    renderIngredientsList();
  } catch (error) {
    console.error('Error parsing ingredients:', error);
    ingredientState.ingredients = [];
    renderIngredientsList();
  }
}

// Cancel meal edit
export function cancelMealEdit(): void {
  const formContainer = document.getElementById('editMealFormContainer');
  if (formContainer) {
    formContainer.style.display = 'none';
  }
  currentEditingMeal = null;
}

// Delete meal from edit
export async function deleteMealFromEdit(): Promise<void> {
  if (!currentEditingMeal) {
    showMessage('No meal selected for deletion', 'error');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete the meal "${currentEditingMeal.name}"?`);
  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', currentEditingMeal.id);

    if (error) throw error;

    showMessage('Meal deleted successfully', 'success');
    cancelMealEdit();
    await loadMealsForEditDropdown();
  } catch (error) {
    console.error('Error deleting meal:', error);
    showMessage('Error deleting meal', 'error');
  }
}

// Select food for edit
export async function selectFoodForEdit(foodId: string): Promise<void> {
  try {
    // If no food selected, do nothing
    if (!foodId) {
      return;
    }

    // Find the food in currentFoods
    const food = currentFoods.find(f => f.id === foodId);
    if (!food) {
      showMessage('Food not found', 'error');
      return;
    }

    // Set the selected food ID in the ingredient modal state
    ingredientState.currentFoodId = foodId;

    // Open the ingredient modal in edit mode
    openIngredientModal('edit_food', null);

    console.log('Food edit modal opened with:', food);
  } catch (error) {
    console.error('Error selecting food for edit:', error);
    showMessage('Error loading food for editing', 'error');
  }
}

// Cancel food edit
export function cancelFoodEdit(): void {
  closeIngredientModal();
  const dropdown = document.getElementById('foodSelectDropdown') as HTMLSelectElement;
  if (dropdown) {
    dropdown.value = '';
  }
}

// Delete food from edit
export async function deleteFoodFromEdit(): Promise<void> {
  const dropdown = document.getElementById('foodSelectDropdown') as HTMLSelectElement;
  const foodId = dropdown.value;

  if (!foodId) {
    showMessage('No food selected for deletion', 'error');
    return;
  }

  const food = currentFoods.find(f => f.id === foodId);
  if (!food) {
    showMessage('Food not found', 'error');
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete "${food.name}"?`);
  if (!confirmed) return;

  try {
    const { error } = await supabase
      .from('foods')
      .delete()
      .eq('id', foodId);

    if (error) throw error;

    showMessage('Food deleted successfully', 'success');
    closeIngredientModal();
    await loadFoodsForEditDropdown();
  } catch (error) {
    console.error('Error deleting food:', error);
    showMessage('Error deleting food', 'error');
  }
}

// Add to window object
declare global {
  interface Window {
    openIngredientModal: (operation: ModalOperation, idx?: number | null, foodId?: string | null) => void;
    closeIngredientModal: () => void;
    removeIngredient: (idx: number) => void;
    selectMealForEdit: (mealId: string) => Promise<void>;
    addIngredientRow: () => void;
    removeIngredientRow: (button: HTMLElement) => void;
    cancelMealEdit: () => void;
    deleteMealFromEdit: () => Promise<void>;
    selectFoodForEdit: (foodId: string) => Promise<void>;
    cancelFoodEdit: () => void;
    deleteFoodFromEdit: () => Promise<void>;
    toggleUserRole: (userId: string, email: string, currentRole: string) => Promise<void>;
    refreshUserList: () => Promise<void>;
  }
}

// Note: Removed old ingredient modal functions - using simple-edit.ts system
// window.openIngredientModal = openIngredientModal;
// window.closeIngredientModal = closeIngredientModal;
// window.removeIngredient = removeIngredient;
window.selectMealForEdit = selectMealForEdit;
// window.removeIngredientRow = removeIngredientRow;
window.cancelMealEdit = cancelMealEdit;
window.deleteMealFromEdit = deleteMealFromEdit;
window.selectFoodForEdit = selectFoodForEdit;
window.cancelFoodEdit = cancelFoodEdit;
window.deleteFoodFromEdit = deleteFoodFromEdit;
window.toggleUserRole = toggleUserRole;
window.refreshUserList = refreshUserList;

// ... existing code ...

export function setupAdminSection() {
    const adminSection = document.getElementById('admin');
    if (!adminSection) return;

    adminSection.innerHTML = `
        <div class="section-header">
            <h2>Admin Panel</h2>
        </div>

        <div class="admin-grid">
            <!-- Create Food Column -->
            <div class="admin-column">
                <h3>Create Food</h3>
                <form id="createFoodForm" class="admin-form">
                    <div class="form-group">
                        <label for="foodName">Food Name *</label>
                        <input type="text" id="foodName" required placeholder="e.g., Chicken Breast">
                    </div>
                    <div class="form-group">
                        <label for="foodBrand">Brand</label>
                        <input type="text" id="foodBrand" placeholder="e.g., Woolworths">
                    </div>
                    <div class="form-group">
                        <label for="foodCategory">Category *</label>
                        <select id="foodCategory" required>
                            <option value="">Select a category...</option>
                            <option value="VEGETABLES">Vegetables</option>
                            <option value="SALAD">Salad</option>
                            <option value="DAIRY">Dairy</option>
                            <option value="PROTEIN">Protein</option>
                            <option value="CONDIMENTS">Condiments</option>
                            <option value="DRINKS">Drinks</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="foodCarbs">Carbs (g) *</label>
                        <input type="number" id="foodCarbs" required min="0" step="0.1">
                    </div>
                    <div class="form-group">
                        <label for="foodFat">Fat (g) *</label>
                        <input type="number" id="foodFat" required min="0" step="0.1">
                    </div>
                    <div class="form-group">
                        <label for="foodProtein">Protein (g) *</label>
                        <input type="number" id="foodProtein" required min="0" step="0.1">
                    </div>
                    <button type="submit" class="primary-btn">Create Food</button>
                </form>
            </div>

            <!-- Create Meal Column -->
            <div class="admin-column">
                <h3>Create Meal</h3>
                <form id="createMealForm" class="admin-form">
                    <div class="form-group">
                        <label for="mealName">Meal Name *</label>
                        <input type="text" id="mealName" required placeholder="e.g., Bacon and Eggs Breakfast">
                    </div>
                    <div class="form-group">
                        <label for="mealType">Meal Type *</label>
                        <select id="mealType" required>
                            <option value="">Select Type</option>
                            <option value="BREAKFAST">Breakfast</option>
                            <option value="LUNCH">Lunch</option>
                            <option value="DINNER">Dinner</option>
                            <option value="SNACK">Snack</option>
                            <option value="DESSERT">Dessert</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="mealInstructions">Cooking Instructions</label>
                        <textarea id="mealInstructions" rows="3" placeholder="Optional cooking or preparation instructions"></textarea>
                    </div>
                    <button type="submit" class="primary-btn">Create Meal</button>
                </form>
            </div>

            <!-- Edit Column -->
            <div class="admin-column">
                <h3>Edit Items</h3>
                <div class="edit-buttons">
                    <button onclick="openEditFoodModal()" class="secondary-btn">Edit Food</button>
                    <button onclick="openEditMealModal()" class="secondary-btn">Edit Meal</button>
                </div>
            </div>
        </div>
    `;

    // Setup event listeners
    setupAdminEventListeners();
}

function setupAdminEventListeners() {
    // Setup form submission handlers
    const createFoodForm = document.getElementById('createFoodForm') as HTMLFormElement;
    const createMealForm = document.getElementById('createMealForm') as HTMLFormElement;

    if (createFoodForm) {
        createFoodForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const foodData = {
                name: (document.getElementById('foodName') as HTMLInputElement).value,
                brand: (document.getElementById('foodBrand') as HTMLInputElement).value,
                category: (document.getElementById('foodCategory') as HTMLSelectElement).value,
                carbs: parseFloat((document.getElementById('foodCarbs') as HTMLInputElement).value),
                fat: parseFloat((document.getElementById('foodFat') as HTMLInputElement).value),
                protein: parseFloat((document.getElementById('foodProtein') as HTMLInputElement).value)
            };
            await createFood(foodData);
            createFoodForm.reset();
        });
    }

    if (createMealForm) {
        createMealForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mealData = {
                name: (document.getElementById('mealName') as HTMLInputElement).value,
                meal_type: (document.getElementById('mealType') as HTMLSelectElement).value,
                cooking_instructions: (document.getElementById('mealInstructions') as HTMLTextAreaElement).value,
                ingredients: []
            };
            await createMeal(mealData);
            createMealForm.reset();
        });
    }
}

async function createFood(foodData: any) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showMessage('Please log in to create food items', 'error');
            return;
        }

        const { data, error } = await supabase
            .from('foods')
            .insert([{
                ...foodData,
                user_id: user.id,
                created_by: user.email
            }]);

        if (error) {
            showMessage('Error creating food: ' + error.message, 'error');
            return;
        }

        showMessage('Food created successfully!', 'success');
        await loadAndDisplayFoods(); // Refresh the food list
    } catch (error) {
        console.error('Error in createFood:', error);
        showMessage('Error creating food', 'error');
    }
}

async function createMeal(mealData: any) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            showMessage('Please log in to create meals', 'error');
            return;
        }

        const { data, error } = await supabase
            .from('meals')
            .insert([{
                ...mealData,
                user_id: user.id,
                created_by: user.email,
                ingredients: JSON.stringify(mealData.ingredients)
            }]);

        if (error) {
            showMessage('Error creating meal: ' + error.message, 'error');
            return;
        }

        showMessage('Meal created successfully!', 'success');
        await loadMealsFromDatabase(); // Refresh the meals list
    } catch (error) {
        console.error('Error in createMeal:', error);
        showMessage('Error creating meal', 'error');
    }
}

// window.addIngredientRow = addIngredientRow;

 