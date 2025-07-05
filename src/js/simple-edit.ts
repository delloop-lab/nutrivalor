import { supabase } from './supabase-client';
import { showMessage } from '../main';
import { displayFoods, allFoods } from './food-tracker';
import { displayMeals, allMeals } from './meals';

// Current editing state
let currentEditingFood: any = null;
let currentEditingMeal: any = null;
let currentMealIngredients: any[] = [];
let currentFoodImageFile: File | null = null;
let currentMealImageFile: File | null = null;

// ===========================================
// FOOD EDITING FUNCTIONS
// ===========================================

export function openEditFoodModal() {
    console.log('🔥 openEditFoodModal called!');
    
    const modal = document.getElementById('editFoodModal');
    console.log('🔍 Modal element found:', !!modal);
    
    if (!modal) {
        console.error('❌ Modal element not found!');
        return;
    }
    
    // Load all foods into dropdown
    console.log('📋 Loading foods dropdown...');
    loadFoodsDropdown();
    
    // Reset form
    const form = document.getElementById('editFoodForm') as HTMLFormElement;
    console.log('📝 Form element found:', !!form);
    
    if (form) {
        form.style.display = 'none';
        form.reset();
    }
    
    console.log('👁️ Setting modal display to block...');
    modal.style.display = 'block';
    modal.style.visibility = 'visible';  // Force visibility
    modal.style.opacity = '1';           // Force opacity
    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    
    console.log('✅ Modal should now be visible with forced visibility and opacity');
}

export function closeEditFoodModal() {
    const modal = document.getElementById('editFoodModal');
    if (modal) modal.style.display = 'none';
    currentEditingFood = null;
}

async function loadFoodsDropdown() {
    try {
        const { data: foods, error } = await supabase
            .from('foods')
            .select('*')
            .order('name');

        if (error) throw error;

        const select = document.getElementById('editFoodSelect') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '<option value="">Choose a food...</option>';
        
        if (foods) {
            foods.forEach(food => {
                const option = document.createElement('option');
                option.value = food.id;
                option.textContent = `${food.name}${food.brand ? ` (${food.brand})` : ''}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading foods:', error);
        showMessage('Error loading foods', 'error');
    }
}

export async function loadFoodForEdit(foodId: string) {
    const form = document.getElementById('editFoodForm') as HTMLFormElement;
    if (!form) return;

    if (!foodId) {
        form.style.display = 'none';
        return;
    }

    try {
        const { data: food, error } = await supabase
            .from('foods')
            .select('*')
            .eq('id', foodId)
            .single();

        if (error) throw error;
        if (!food) {
            showMessage('Food not found', 'error');
            return;
        }

        currentEditingFood = food;
        currentFoodImageFile = null;

        // Populate form
        (document.getElementById('editFoodId') as HTMLInputElement).value = food.id;
        (document.getElementById('editFoodName') as HTMLInputElement).value = food.name || '';
        (document.getElementById('editFoodBrand') as HTMLInputElement).value = food.brand || '';
        (document.getElementById('editFoodCategory') as HTMLSelectElement).value = food.category || '';
        (document.getElementById('editFoodServingUnit') as HTMLSelectElement).value = food.default_serving_unit || 'g';
        (document.getElementById('editFoodCarbs') as HTMLInputElement).value = food.carbs?.toString() || '0';
        (document.getElementById('editFoodFat') as HTMLInputElement).value = food.fat?.toString() || '0';
        (document.getElementById('editFoodProtein') as HTMLInputElement).value = food.protein?.toString() || '0';
        (document.getElementById('editFoodInstructions') as HTMLTextAreaElement).value = food.instructions || '';

        // Handle existing image - check multiple possible image fields
        const imagePreview = document.getElementById('editFoodImagePreview') as HTMLImageElement;
        const imagePlaceholder = document.getElementById('editFoodImagePlaceholder') as HTMLDivElement;
        
        // Clear file input
        const fileInput = document.getElementById('editFoodImage') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Check for existing image in various fields
        const existingImageUrl = food.image_url || food.image || food.picture || null;
        
        if (existingImageUrl && existingImageUrl.trim() !== '') {
            imagePreview.src = existingImageUrl;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            imagePlaceholder.style.display = 'flex';
        }

        form.style.display = 'block';
    } catch (error) {
        console.error('Error loading food:', error);
        showMessage('Error loading food', 'error');
    }
}

export async function saveEditedFood(event: Event) {
    event.preventDefault();
    
    if (!currentEditingFood) {
        showMessage('No food selected', 'error');
        return;
    }

    try {
        let imageUrl = currentEditingFood.image_url;

        // Upload new image if one was selected
        if (currentFoodImageFile) {
            const fileExt = currentFoodImageFile.name.split('.').pop();
            const fileName = `food_${currentEditingFood.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('food-images')
                .upload(fileName, currentFoodImageFile);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                showMessage('Error uploading image', 'error');
                return;
            }

            const { data } = supabase.storage
                .from('food-images')
                .getPublicUrl(fileName);
            
            imageUrl = data.publicUrl;
        }

        const foodData = {
            name: (document.getElementById('editFoodName') as HTMLInputElement).value.trim(),
            brand: (document.getElementById('editFoodBrand') as HTMLInputElement).value.trim() || null,
            category: (document.getElementById('editFoodCategory') as HTMLSelectElement).value,
            default_serving_unit: (document.getElementById('editFoodServingUnit') as HTMLSelectElement).value,
            carbs: parseFloat((document.getElementById('editFoodCarbs') as HTMLInputElement).value) || 0,
            fat: parseFloat((document.getElementById('editFoodFat') as HTMLInputElement).value) || 0,
            protein: parseFloat((document.getElementById('editFoodProtein') as HTMLInputElement).value) || 0,
            instructions: (document.getElementById('editFoodInstructions') as HTMLTextAreaElement).value.trim() || null,
            image_url: imageUrl,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('foods')
            .update(foodData)
            .eq('id', currentEditingFood.id);

        if (error) throw error;

        showMessage('Food updated successfully!', 'success');
        closeEditFoodModal();
        
        // Refresh food list
        await displayFoods(allFoods);
        
    } catch (error) {
        console.error('Error saving food:', error);
        showMessage('Error saving food', 'error');
    }
}

export async function deleteEditedFood() {
    if (!currentEditingFood) {
        showMessage('No food selected', 'error');
        return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${currentEditingFood.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('foods')
            .delete()
            .eq('id', currentEditingFood.id);

        if (error) throw error;

        showMessage('Food deleted successfully!', 'success');
        closeEditFoodModal();
        
        // Refresh food list
        await displayFoods(allFoods);
        
    } catch (error) {
        console.error('Error deleting food:', error);
        showMessage('Error deleting food', 'error');
    }
}

// ===========================================
// MEAL EDITING FUNCTIONS
// ===========================================

export function openEditMealModal() {
    console.log('🔥 openEditMealModal called!');
    
    const modal = document.getElementById('editMealModal');
    console.log('🔍 Meal modal element found:', !!modal);
    
    if (!modal) {
        console.error('❌ Meal modal element not found!');
        return;
    }
    
    // Load all meals into dropdown
    console.log('📋 Loading meals dropdown...');
    loadMealsDropdown();
    
    // Reset form
    const form = document.getElementById('editMealForm') as HTMLFormElement;
    console.log('📝 Meal form element found:', !!form);
    
    if (form) {
        form.style.display = 'none';
        form.reset();
    }
    
    console.log('👁️ Setting meal modal display to block...');
    modal.style.display = 'block';
    modal.style.visibility = 'visible';  // Force visibility
    modal.style.opacity = '1';           // Force opacity
    modal.style.zIndex = '9999';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    
    console.log('✅ Meal modal should now be visible with forced visibility and opacity');
}

export function closeEditMealModal() {
    const modal = document.getElementById('editMealModal');
    if (modal) modal.style.display = 'none';
    currentEditingMeal = null;
    currentMealIngredients = [];
}

async function loadMealsDropdown() {
    try {
        const { data: meals, error } = await supabase
            .from('meals')
            .select('*')
            .order('name');

        if (error) throw error;

        const select = document.getElementById('editMealSelect') as HTMLSelectElement;
        if (!select) return;

        select.innerHTML = '<option value="">Choose a meal...</option>';
        
        if (meals) {
            meals.forEach(meal => {
                const option = document.createElement('option');
                option.value = meal.id;
                option.textContent = `${meal.name} (${meal.meal_type || 'Unknown'})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading meals:', error);
        showMessage('Error loading meals', 'error');
    }
}

export async function loadMealForEdit(mealId: string) {
    const form = document.getElementById('editMealForm') as HTMLFormElement;
    if (!form) return;

    if (!mealId) {
        form.style.display = 'none';
        return;
    }

    try {
        const { data: meal, error } = await supabase
            .from('meals')
            .select('*')
            .eq('id', mealId)
            .single();

        if (error) throw error;
        if (!meal) {
            showMessage('Meal not found', 'error');
            return;
        }

        currentEditingMeal = meal;
        currentMealImageFile = null;

        // Populate form
        (document.getElementById('editMealId') as HTMLInputElement).value = meal.id;
        (document.getElementById('editMealName') as HTMLInputElement).value = meal.name || '';
        (document.getElementById('editMealType') as HTMLSelectElement).value = meal.meal_type || '';
        (document.getElementById('editMealInstructions') as HTMLTextAreaElement).value = meal.cooking_instructions || '';

        // Handle existing image - check multiple possible image fields
        const imagePreview = document.getElementById('editMealImagePreview') as HTMLImageElement;
        const imagePlaceholder = document.getElementById('editMealImagePlaceholder') as HTMLDivElement;
        
        // Clear file input
        const fileInput = document.getElementById('editMealImage') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        // Check for existing image in various fields
        const existingImageUrl = meal.image_url || meal.image || meal.picture || null;
        
        if (existingImageUrl && existingImageUrl.trim() !== '') {
            imagePreview.src = existingImageUrl;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
        } else {
            imagePreview.style.display = 'none';
            imagePlaceholder.style.display = 'flex';
        }

        // Parse ingredients
        try {
            currentMealIngredients = Array.isArray(meal.ingredients) ? meal.ingredients : 
                                   (typeof meal.ingredients === 'string' ? JSON.parse(meal.ingredients) : []);
        } catch (e) {
            currentMealIngredients = [];
        }

        // Render ingredients
        renderMealIngredients();

        form.style.display = 'block';
    } catch (error) {
        console.error('Error loading meal:', error);
        showMessage('Error loading meal', 'error');
    }
}

function renderMealIngredients() {
    const container = document.getElementById('editMealIngredients');
    if (!container) return;

    container.innerHTML = '';

    currentMealIngredients.forEach((ingredient, index) => {
        const div = document.createElement('div');
        div.className = 'ingredient-edit-row';
        div.innerHTML = `
            <div class="ingredient-edit-fields">
                <!-- Food Selection - Full Width -->
                <div class="field-group">
                    <label><strong>Food Selection:</strong></label>
                    <select onchange="updateIngredientFood(${index}, this.value)" style="min-width: 500px; width: 100%; font-size: 16px; padding: 12px;">
                        <option value="">🔍 Select food item...</option>
                        ${allFoods.map(food => `
                            <option value="${food.id}" ${food.id === ingredient.food_id ? 'selected' : ''}>
                                ${food.name}${food.brand ? ` (${food.brand})` : ''} - ${food.category}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <!-- Nutrition Fields - Horizontal Layout -->
                <div class="ingredient-nutrients-row">
                    <div class="field-group">
                        <label>Quantity (g):</label>
                        <input type="number" value="${ingredient.quantity || 1}" min="0.1" step="0.1" 
                               onchange="updateIngredientQuantity(${index}, this.value)" style="font-size: 16px; padding: 8px;">
                    </div>
                    <div class="field-group">
                        <label>Carbs (g):</label>
                        <input type="number" value="${ingredient.carbs || 0}" min="0" step="0.1"
                               onchange="updateIngredientNutrient(${index}, 'carbs', this.value)" style="font-size: 16px; padding: 8px;">
                    </div>
                    <div class="field-group">
                        <label>Fat (g):</label>
                        <input type="number" value="${ingredient.fat || 0}" min="0" step="0.1"
                               onchange="updateIngredientNutrient(${index}, 'fat', this.value)" style="font-size: 16px; padding: 8px;">
                    </div>
                    <div class="field-group">
                        <label>Protein (g):</label>
                        <input type="number" value="${ingredient.protein || 0}" min="0" step="0.1"
                               onchange="updateIngredientNutrient(${index}, 'protein', this.value)" style="font-size: 16px; padding: 8px;">
                    </div>
                </div>
                
                <!-- Instructions - Full Width and Tall -->
                <div class="field-group ingredient-instructions-field">
                    <label><strong>Cooking Instructions for this ingredient:</strong></label>
                    <textarea onchange="updateIngredientInstructions(${index}, this.value)" 
                              rows="8" 
                              placeholder="Enter specific cooking instructions for this ingredient (e.g., 'Cook bacon until crispy', 'Dice onions finely', 'Season with salt and pepper')..."
                              style="width: 100%; min-height: 220px; font-size: 16px; padding: 15px; line-height: 1.6; font-family: inherit; resize: vertical; border: 2px solid #ddd; border-radius: 8px;">${ingredient.instructions || ''}</textarea>
                </div>
                
                <!-- Remove Button -->
                <div class="field-group" style="text-align: right; margin-top: 10px;">
                    <button type="button" class="danger-btn" onclick="removeIngredientFromMeal(${index})" style="font-size: 16px; padding: 10px 20px;">
                        🗑️ Remove Ingredient
                    </button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
}

export function addIngredientToMeal() {
    const newIngredient = {
        food_id: '',
        food_name: '',
        quantity: 1,
        carbs: 0,
        fat: 0,
        protein: 0,
        instructions: ''
    };
    currentMealIngredients.push(newIngredient);
    renderMealIngredients();
}

export function removeIngredientFromMeal(index: number) {
    currentMealIngredients.splice(index, 1);
    renderMealIngredients();
}

function updateIngredientFood(index: number, foodId: string) {
    if (!currentMealIngredients[index]) return;
    
    const food = allFoods.find(f => f.id === foodId);
    if (food) {
        const quantity = currentMealIngredients[index].quantity || 1;
        currentMealIngredients[index] = {
            ...currentMealIngredients[index],
            food_id: food.id,
            food_name: food.name,
            carbs: food.carbs * quantity,
            fat: food.fat * quantity,
            protein: food.protein * quantity
        };
        renderMealIngredients();
    }
}

function updateIngredientQuantity(index: number, value: string) {
    if (!currentMealIngredients[index]) return;
    
    const quantity = parseFloat(value) || 0;
    const food = allFoods.find(f => f.id === currentMealIngredients[index].food_id);
    
    if (food) {
        currentMealIngredients[index] = {
            ...currentMealIngredients[index],
            quantity,
            carbs: food.carbs * quantity,
            fat: food.fat * quantity,
            protein: food.protein * quantity
        };
        renderMealIngredients();
    } else {
        currentMealIngredients[index].quantity = quantity;
    }
}

function updateIngredientNutrient(index: number, nutrient: string, value: string) {
    if (!currentMealIngredients[index]) return;
    currentMealIngredients[index][nutrient] = parseFloat(value) || 0;
}

function updateIngredientInstructions(index: number, instructions: string) {
    if (!currentMealIngredients[index]) return;
    currentMealIngredients[index].instructions = instructions;
}

export async function saveEditedMeal(event: Event) {
    event.preventDefault();
    
    if (!currentEditingMeal) {
        showMessage('No meal selected', 'error');
        return;
    }

    try {
        let imageUrl = currentEditingMeal.image_url;

        // Upload new image if one was selected
        if (currentMealImageFile) {
            const fileExt = currentMealImageFile.name.split('.').pop();
            const fileName = `meal_${currentEditingMeal.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('meal-images')
                .upload(fileName, currentMealImageFile);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                showMessage('Error uploading image', 'error');
                return;
            }

            const { data } = supabase.storage
                .from('meal-images')
                .getPublicUrl(fileName);
            
            imageUrl = data.publicUrl;
        }

        // Calculate totals
        const totalCarbs = currentMealIngredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
        const totalFat = currentMealIngredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
        const totalProtein = currentMealIngredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);

        const mealData = {
            name: (document.getElementById('editMealName') as HTMLInputElement).value.trim(),
            meal_type: (document.getElementById('editMealType') as HTMLSelectElement).value,
            cooking_instructions: (document.getElementById('editMealInstructions') as HTMLTextAreaElement).value.trim() || null,
            ingredients: currentMealIngredients,
            total_carbs: totalCarbs,
            total_fat: totalFat,
            total_protein: totalProtein,
            image_url: imageUrl,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('meals')
            .update(mealData)
            .eq('id', currentEditingMeal.id);

        if (error) throw error;

        showMessage('Meal updated successfully!', 'success');
        closeEditMealModal();
        
        // Refresh meal list
        await displayMeals(allMeals);
        
    } catch (error) {
        console.error('Error saving meal:', error);
        showMessage('Error saving meal', 'error');
    }
}

export async function deleteEditedMeal() {
    if (!currentEditingMeal) {
        showMessage('No meal selected', 'error');
        return;
    }

    const confirmed = confirm(`Are you sure you want to delete "${currentEditingMeal.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
        const { error } = await supabase
            .from('meals')
            .delete()
            .eq('id', currentEditingMeal.id);

        if (error) throw error;

        showMessage('Meal deleted successfully!', 'success');
        closeEditMealModal();
        
        // Refresh meal list
        await displayMeals(allMeals);
        
    } catch (error) {
        console.error('Error deleting meal:', error);
        showMessage('Error deleting meal', 'error');
    }
}

// Image handling functions
export function previewFoodImage(input: HTMLInputElement) {
    if (input.files && input.files[0]) {
        currentFoodImageFile = input.files[0];
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('editFoodImagePreview') as HTMLImageElement;
            const imagePlaceholder = document.getElementById('editFoodImagePlaceholder') as HTMLDivElement;
            
            if (e.target?.result) {
                imagePreview.src = e.target.result as string;
                imagePreview.style.display = 'block';
                imagePlaceholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(currentFoodImageFile);
    }
}

export function removeFoodImage() {
    currentFoodImageFile = null;
    const imagePreview = document.getElementById('editFoodImagePreview') as HTMLImageElement;
    const imagePlaceholder = document.getElementById('editFoodImagePlaceholder') as HTMLDivElement;
    const fileInput = document.getElementById('editFoodImage') as HTMLInputElement;
    
    imagePreview.style.display = 'none';
    imagePlaceholder.style.display = 'flex';
    fileInput.value = '';
    
    // If editing existing food, mark image for removal
    if (currentEditingFood) {
        currentEditingFood.image_url = null;
        currentEditingFood.image = null;
        currentEditingFood.picture = null;
    }
    
    console.log('Food image marked for removal');
}

export function previewMealImage(input: HTMLInputElement) {
    if (input.files && input.files[0]) {
        currentMealImageFile = input.files[0];
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imagePreview = document.getElementById('editMealImagePreview') as HTMLImageElement;
            const imagePlaceholder = document.getElementById('editMealImagePlaceholder') as HTMLDivElement;
            
            if (e.target?.result) {
                imagePreview.src = e.target.result as string;
                imagePreview.style.display = 'block';
                imagePlaceholder.style.display = 'none';
            }
        };
        reader.readAsDataURL(currentMealImageFile);
    }
}

export function removeMealImage() {
    currentMealImageFile = null;
    const imagePreview = document.getElementById('editMealImagePreview') as HTMLImageElement;
    const imagePlaceholder = document.getElementById('editMealImagePlaceholder') as HTMLDivElement;
    const fileInput = document.getElementById('editMealImage') as HTMLInputElement;
    
    imagePreview.style.display = 'none';
    imagePlaceholder.style.display = 'flex';
    fileInput.value = '';
    
    // If editing existing meal, mark image for removal
    if (currentEditingMeal) {
        currentEditingMeal.image_url = null;
        currentEditingMeal.image = null;
        currentEditingMeal.picture = null;
    }
    
    console.log('Meal image marked for removal');
}

// Make functions globally available
declare global {
    interface Window {
        openEditFoodModal: () => void;
        closeEditFoodModal: () => void;
        loadFoodForEdit: (foodId: string) => void;
        saveEditedFood: (event: Event) => void;
        deleteEditedFood: () => void;
        previewFoodImage: (input: HTMLInputElement) => void;
        removeFoodImage: () => void;
        openEditMealModal: () => void;
        closeEditMealModal: () => void;
        loadMealForEdit: (mealId: string) => void;
        saveEditedMeal: (event: Event) => void;
        deleteEditedMeal: () => void;
        previewMealImage: (input: HTMLInputElement) => void;
        removeMealImage: () => void;
        addIngredientToMeal: () => void;
        removeIngredientFromMeal: (index: number) => void;
        updateIngredientFood: (index: number, foodId: string) => void;
        updateIngredientQuantity: (index: number, value: string) => void;
        updateIngredientNutrient: (index: number, nutrient: string, value: string) => void;
        updateIngredientInstructions: (index: number, instructions: string) => void;
    }
}

window.openEditFoodModal = openEditFoodModal;
window.closeEditFoodModal = closeEditFoodModal;
window.loadFoodForEdit = loadFoodForEdit;
window.saveEditedFood = saveEditedFood;
window.deleteEditedFood = deleteEditedFood;
window.previewFoodImage = previewFoodImage;
window.removeFoodImage = removeFoodImage;
window.openEditMealModal = openEditMealModal;
window.closeEditMealModal = closeEditMealModal;
window.loadMealForEdit = loadMealForEdit;
window.saveEditedMeal = saveEditedMeal;
window.deleteEditedMeal = deleteEditedMeal;
window.previewMealImage = previewMealImage;
window.removeMealImage = removeMealImage;
window.addIngredientToMeal = addIngredientToMeal;
window.removeIngredientFromMeal = removeIngredientFromMeal;
window.updateIngredientFood = updateIngredientFood;
window.updateIngredientQuantity = updateIngredientQuantity;
window.updateIngredientNutrient = updateIngredientNutrient;
window.updateIngredientInstructions = updateIngredientInstructions; 