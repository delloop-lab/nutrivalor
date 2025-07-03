import { supabase } from './supabase-client';
import { showMessage } from '../main';
import { displayMeals, allMeals } from './meals';
import { displayFoods, allFoods } from './food-tracker';

interface Ingredient {
    food_id: string;
    food_name: string;
    quantity: number;
    instructions: string;
    carbs?: number;
    fat?: number;
    protein?: number;
}

export type ModalOperation = 'add_to_meal' | 'edit_in_meal' | 'edit_food' | 'edit_meal';

interface IngredientState {
    currentOperation: ModalOperation;
    currentFoodId: string | null;
    currentMealId: string | null;
    ingredients: Ingredient[];
}

export const ingredientState: IngredientState = {
    currentOperation: 'add_to_meal',
    currentFoodId: null,
    currentMealId: null,
    ingredients: []
};

export function renderIngredientsList() {
    const container = document.getElementById('modalIngredientsList');
    if (!container) return;

    if (ingredientState.ingredients.length === 0) {
        container.innerHTML = '<p class="empty-state">No ingredients added yet</p>';
        return;
    }

    container.innerHTML = ingredientState.ingredients.map((ingredient, idx) => `
        <div class="ingredient-item">
            <div class="ingredient-info">
                <strong>${ingredient.food_name}</strong>
                <span>${ingredient.quantity}g</span>
                ${ingredient.instructions ? `<div class="ingredient-instructions">${ingredient.instructions}</div>` : ''}
            </div>
            <div class="ingredient-actions">
                <button type="button" class="btn btn-sm btn-secondary" onclick="editIngredient(${idx})">Edit</button>
                <button type="button" class="btn btn-sm btn-danger" onclick="removeIngredient(${idx})">Remove</button>
            </div>
        </div>
    `).join('');
}

async function populateFoodSelect(selectElement: HTMLSelectElement) {
    try {
        const { data: foods, error } = await supabase
            .from('foods')
            .select('*')
            .order('name');

        if (error) throw error;

        if (foods) {
            populateSearchResults(foods, selectElement, 'add_to_meal');
        }
    } catch (error) {
        console.error('Error fetching foods:', error);
        showMessage('Error loading foods', 'error');
    }
}

export async function openIngredientModal(operation: ModalOperation, idx: number | null = null, foodId: string | null = null) {
    console.log(`Opening modal for operation: ${operation}`);
    ingredientState.currentOperation = operation;

    const modal = document.getElementById('ingredientModal');
    const modalTitle = document.getElementById('modalTitle');
    const foodSection = document.getElementById('foodSelectionSection');
    const mealSection = document.getElementById('mealSelectionSection');
    const mealDetailsSection = document.getElementById('mealDetailsSection');

    if (!modal || !modalTitle || !foodSection || !mealSection) {
        console.error('Required modal elements not found');
        return;
    }

    // Reset form
    const form = document.getElementById('ingredientForm') as HTMLFormElement;
    if (form) form.reset();

    // Configure modal based on operation
    switch (operation) {
        case 'edit_food':
            modalTitle.textContent = 'Edit Food';
            foodSection.style.display = 'block';
            mealSection.style.display = 'none';
            
            if (foodId) {
                ingredientState.currentFoodId = foodId;
                try {
                    const { data: food, error } = await supabase
                        .from('foods')
                        .select('*')
                        .eq('id', foodId)
                        .single();

                    if (error) throw error;
                    if (food) {
                        populateFoodForm(food);
                    }
                } catch (error) {
                    console.error('Error fetching food:', error);
                    showMessage('Error loading food details', 'error');
                }
            }
            break;

        case 'edit_meal':
            modalTitle.textContent = 'Edit Meal';
            foodSection.style.display = 'none';
            mealSection.style.display = 'block';
            if (mealDetailsSection) {
                mealDetailsSection.style.display = 'block';
            }

            // Load meals for dropdown
            try {
                const { data: meals, error } = await supabase
                    .from('meals')
                    .select('*')
                    .order('name');

                if (error) throw error;
                if (meals) {
                    const mealSelect = document.getElementById('modalMealSelect')?.parentElement;
                    if (mealSelect) {
                        populateSearchResults(meals, mealSelect, 'edit_meal');
                    }
                }
            } catch (error) {
                console.error('Error loading meals:', error);
                showMessage('Error loading meals', 'error');
            }

            if (foodId) {
                ingredientState.currentMealId = foodId;
                try {
                    const { data: meal, error } = await supabase
                        .from('meals')
                        .select('*')
                        .eq('id', foodId)
                        .single();

                    if (error) throw error;
                    if (meal) {
                        // Convert JSONB ingredients to expected format
                        const mealWithIngredients = {
                            ...meal,
                            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : []
                        };
                        populateForm(mealWithIngredients, operation);
                    }
                } catch (error) {
                    console.error('Error fetching meal:', error);
                    showMessage('Error loading meal details', 'error');
                }
            }
            break;

        default:
            console.error('Unsupported operation:', operation);
            return;
    }

    modal.style.display = 'block';
}

function populateSearchResults(items: any[], container: HTMLElement, operation: ModalOperation) {
    const dropdown = container.querySelector('.select-dropdown') as HTMLElement;
    if (!dropdown) return;

    dropdown.innerHTML = items.map(item => `
        <div class="dropdown-item" data-id="${item.id}" data-name="${item.name}">
            <div class="food-name">${item.name}</div>
            ${item.brand ? `<div class="food-brand">${item.brand}</div>` : ''}
            ${item.meal_type ? `<div class="meal-type">${item.meal_type}</div>` : ''}
        </div>
    `).join('');

    // Add click handlers
    dropdown.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.getAttribute('data-id');
            const name = item.getAttribute('data-name');
            
            if (id && name) {
                const input = container.querySelector('input');
                if (input) {
                    input.value = name;
                }
                
                // Hide dropdown
                dropdown.style.display = 'none';

                if (operation === 'edit_meal') {
                    try {
                        const { data: meal, error } = await supabase
                            .from('meals')
                            .select('*, ingredients:meal_ingredients(*)')
                            .eq('id', id)
                            .single();

                        if (error) throw error;
                        if (meal) {
                            populateForm(meal, operation);
                        }
                    } catch (error) {
                        console.error('Error fetching meal:', error);
                        showMessage('Error loading meal details', 'error');
                    }
                } else {
                    const selectedItem = items.find(i => i.id === id);
                    if (selectedItem) {
                        populateForm(selectedItem, operation);
                    }
                }
            }
        });
    });
}

function populateForm(item: any, operation: ModalOperation) {
    if (operation === 'edit_meal') {
        // Get form elements
        const mealNameInput = document.getElementById('modalMealName') as HTMLInputElement;
        const mealTypeSelect = document.getElementById('modalMealType') as HTMLSelectElement;
        const instructionsInput = document.getElementById('modalInstructions') as HTMLTextAreaElement;
        const ingredientsContainer = document.getElementById('modalIngredientsList') as HTMLDivElement;

        // Set meal details
        if (mealNameInput) mealNameInput.value = item.name || '';
        if (mealTypeSelect) mealTypeSelect.value = item.meal_type || '';
        if (instructionsInput) instructionsInput.value = item.cooking_instructions || '';
        
        // Store current meal ID and ingredients
        ingredientState.currentMealId = item.id;
        ingredientState.ingredients = Array.isArray(item.ingredients) ? item.ingredients : [];
        
        // Clear and populate ingredients
        if (ingredientsContainer) {
            ingredientsContainer.innerHTML = '';
            
            // Create HTML for each ingredient
            const html = ingredientState.ingredients.map((ingredient: any, index: number) => `
                <div class="ingredient-row" data-index="${index}">
                    <div class="ingredient-header">
                        <h4>Ingredient #${index + 1}</h4>
                        <button type="button" class="remove-btn" onclick="removeIngredient(${index})">Remove</button>
                    </div>
                    
                    <div class="ingredient-field">
                        <label>Food:</label>
                        <select class="food-select" onchange="updateIngredientFood(${index}, this.value)">
                            ${allFoods.map(food => `
                                <option value="${food.id}" ${food.id === ingredient.food_id ? 'selected' : ''}>
                                    ${food.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="ingredient-field">
                        <label>Quantity (g):</label>
                        <input type="number" 
                               value="${ingredient.quantity || 1}" 
                               min="0.1" 
                               step="0.1"
                               onchange="updateIngredientQuantity(${index}, this.value)">
                    </div>

                    <div class="ingredient-nutrients">
                        <div class="nutrient-field">
                            <label>Carbs (g):</label>
                            <input type="number" 
                                   value="${ingredient.carbs || 0}" 
                                   min="0" 
                                   step="0.1"
                                   onchange="updateIngredientNutrient(${index}, 'carbs', this.value)">
                        </div>
                        <div class="nutrient-field">
                            <label>Fat (g):</label>
                            <input type="number" 
                                   value="${ingredient.fat || 0}" 
                                   min="0" 
                                   step="0.1"
                                   onchange="updateIngredientNutrient(${index}, 'fat', this.value)">
                        </div>
                        <div class="nutrient-field">
                            <label>Protein (g):</label>
                            <input type="number" 
                                   value="${ingredient.protein || 0}" 
                                   min="0" 
                                   step="0.1"
                                   onchange="updateIngredientNutrient(${index}, 'protein', this.value)">
                        </div>
                    </div>

                    <div class="ingredient-field">
                        <label>Cooking Instructions:</label>
                        <textarea onchange="updateIngredientInstructions(${index}, this.value)">${ingredient.instructions || ''}</textarea>
                    </div>
                </div>
            `).join('');

            ingredientsContainer.innerHTML = html + `
                <button type="button" class="add-ingredient-btn" onclick="addNewIngredient()">
                    Add Ingredient
                </button>
            `;
        }
    } else {
        // Handle food form population
        populateFoodForm(item);
    }
}

function populateFoodForm(food: any) {
    const brandInput = document.getElementById('modalFoodBrand') as HTMLInputElement;
    const categorySelect = document.getElementById('modalFoodCategory') as HTMLSelectElement;
    const carbsInput = document.getElementById('modalFoodCarbs') as HTMLInputElement;
    const fatInput = document.getElementById('modalFoodFat') as HTMLInputElement;
    const proteinInput = document.getElementById('modalFoodProtein') as HTMLInputElement;
    const instructionsInput = document.getElementById('modalFoodInstructions') as HTMLTextAreaElement;

    if (food) {
        brandInput.value = food.brand || '';
        categorySelect.value = food.category || '';
        carbsInput.value = food.carbs?.toString() || '0';
        fatInput.value = food.fat?.toString() || '0';
        proteinInput.value = food.protein?.toString() || '0';
        instructionsInput.value = food.instructions || '';
    }
}

export function closeIngredientModal() {
    console.log('[Modal] Closing ingredient modal');
    const modal = document.getElementById('ingredientModal');
    if (modal) {
        modal.style.display = 'none';
    }

    // Reset state
    ingredientState.currentOperation = 'add_to_meal';
    ingredientState.currentFoodId = null;
    ingredientState.currentMealId = null;

    // Reset form
    const form = document.getElementById('ingredientForm') as HTMLFormElement;
    if (form) {
        form.reset();
    }

    // Hide all dropdowns
    const dropdowns = document.querySelectorAll('.select-dropdown');
    dropdowns.forEach(dropdown => {
        (dropdown as HTMLElement).classList.remove('show');
    });

    // Reset select inputs
    const foodSelect = document.getElementById('modalFoodSelect') as HTMLInputElement;
    const mealSelect = document.getElementById('modalMealSelect') as HTMLInputElement;
    if (foodSelect) foodSelect.value = '';
    if (mealSelect) mealSelect.value = '';

    // Hide meal details section
    const mealDetailsSection = document.getElementById('mealDetailsSection');
    if (mealDetailsSection) {
        mealDetailsSection.style.display = 'none';
    }
}

function setupImagePreview() {
    const imageInput = document.getElementById('modalMealImage') as HTMLInputElement;
    const imagePreview = document.getElementById('modalMealImagePreview') as HTMLImageElement;

    imageInput.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target?.result as string;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        } else {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
    });
}

export function setupIngredientModalEventListeners() {
    // Setup image preview
    setupImagePreview();

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('ingredientModal');
        if (event.target === modal) {
            closeIngredientModal();
        }
    });

    // Close modal when clicking close button
    document.querySelectorAll('[data-action="close"]').forEach(button => {
        button.addEventListener('click', closeIngredientModal);
    });

    // Setup form submission handler
    const form = document.getElementById('ingredientForm') as HTMLFormElement;
    if (form) {
        form.addEventListener('submit', handleIngredientSubmit);
    }

    // Setup dropdown functionality
    const foodSelect = document.getElementById('modalFoodSelect') as HTMLInputElement;
    const mealSelect = document.getElementById('modalMealSelect') as HTMLInputElement;
    const foodDropdown = foodSelect?.parentElement?.querySelector('.select-dropdown') as HTMLElement;
    const mealDropdown = mealSelect?.parentElement?.querySelector('.select-dropdown') as HTMLElement;

    // Show dropdown when clicking on food select input
    if (foodSelect && foodDropdown) {
        foodSelect.addEventListener('click', (event) => {
            event.stopPropagation();
            foodDropdown.style.display = foodDropdown.style.display === 'none' ? 'block' : 'none';
            if (mealDropdown) mealDropdown.style.display = 'none';

            // Load foods if dropdown is being shown
            if (foodDropdown.style.display === 'block') {
                populateFoodSelect(foodSelect as any);
            }
        });
    }

    // Show dropdown when clicking on meal select input
    if (mealSelect && mealDropdown) {
        mealSelect.addEventListener('click', async (event) => {
            event.stopPropagation();
            mealDropdown.style.display = mealDropdown.style.display === 'none' ? 'block' : 'none';
            if (foodDropdown) foodDropdown.style.display = 'none';

            // Load meals if dropdown is being shown
            if (mealDropdown.style.display === 'block') {
                try {
                    const { data: meals, error } = await supabase
                        .from('meals')
                        .select('*')
                        .order('name');

                    if (error) throw error;
                    if (meals) {
                        populateSearchResults(meals, mealSelect.parentElement as HTMLElement, 'edit_meal');
                    }
                } catch (error) {
                    console.error('Error loading meals:', error);
                    showMessage('Error loading meals', 'error');
                }
            }
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (event) => {
        const target = event.target as Node;
        if (foodDropdown && !foodSelect?.contains(target) && !foodDropdown.contains(target)) {
            foodDropdown.style.display = 'none';
        }
        if (mealDropdown && !mealSelect?.contains(target) && !mealDropdown.contains(target)) {
            mealDropdown.style.display = 'none';
        }
    });
}

async function handleIngredientSubmit(event: Event) {
    event.preventDefault();
    
    try {
        if (ingredientState.currentOperation === 'edit_meal') {
            const mealNameInput = document.getElementById('modalMealName') as HTMLInputElement;
            const mealTypeSelect = document.getElementById('modalMealType') as HTMLSelectElement;
            const instructionsInput = document.getElementById('modalInstructions') as HTMLTextAreaElement;

            if (!mealNameInput?.value) {
                throw new Error('Meal name is required');
            }

            // Calculate nutrition totals
            const totalCarbs = ingredientState.ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
            const totalFat = ingredientState.ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
            const totalProtein = ingredientState.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);

            const mealData = {
                name: mealNameInput.value,
                meal_type: mealTypeSelect?.value || '',
                cooking_instructions: instructionsInput?.value || '',
                ingredients: ingredientState.ingredients,
                total_carbs: totalCarbs,
                total_fat: totalFat,
                total_protein: totalProtein,
                updated_at: new Date().toISOString()
            };

            let response;
            if (ingredientState.currentMealId) {
                // Update existing meal
                response = await supabase
                    .from('meals')
                    .update(mealData)
                    .eq('id', ingredientState.currentMealId);
            } else {
                // Create new meal
                response = await supabase
                    .from('meals')
                    .insert([mealData]);
            }

            if (response.error) {
                throw response.error;
            }

            // Close modal and refresh meals list
            closeIngredientModal();
            await displayMeals(allMeals);
            
            showMessage('Meal saved successfully!', 'success');
        } else {
            // Handle food editing/creation
            const nameInput = document.getElementById('modalFoodName') as HTMLInputElement;
            const brandInput = document.getElementById('modalFoodBrand') as HTMLInputElement;
            const categoryInput = document.getElementById('modalFoodCategory') as HTMLSelectElement;
            const carbsInput = document.getElementById('modalFoodCarbs') as HTMLInputElement;
            const fatInput = document.getElementById('modalFoodFat') as HTMLInputElement;
            const proteinInput = document.getElementById('modalFoodProtein') as HTMLInputElement;
            const instructionsInput = document.getElementById('modalFoodInstructions') as HTMLTextAreaElement;

            if (!nameInput?.value) {
                throw new Error('Food name is required');
            }

            const foodData = {
                name: nameInput.value,
                brand: brandInput?.value || '',
                category: categoryInput?.value || '',
                carbs: parseFloat(carbsInput?.value || '0'),
                fat: parseFloat(fatInput?.value || '0'),
                protein: parseFloat(proteinInput?.value || '0'),
                instructions: instructionsInput?.value || '',
                updated_at: new Date().toISOString()
            };

            let response;
            if (ingredientState.currentFoodId) {
                response = await supabase
                    .from('foods')
                    .update(foodData)
                    .eq('id', ingredientState.currentFoodId);
            } else {
                response = await supabase
                    .from('foods')
                    .insert([foodData]);
            }

            if (response.error) {
                throw response.error;
            }

            closeIngredientModal();
            await displayFoods(allFoods);
            showMessage('Food saved successfully!', 'success');
        }
    } catch (error) {
        console.error('Error saving:', error);
        showMessage(error.message || 'Error saving', 'error');
    }
}

export async function removeIngredient(ingredientId: number) {
    try {
        const { error } = await supabase
            .from('meal_ingredients')
            .delete()
            .eq('id', ingredientId);

        if (error) throw error;

        // Refresh the ingredients list
        const mealId = ingredientState.currentMealId;
        if (mealId) {
            const { data: meal } = await supabase
                .from('meals')
                .select('*, ingredients:meal_ingredients(*)')
                .eq('id', mealId)
                .single();

            if (meal) {
                // Re-populate the form with updated data
                populateForm(meal, 'edit_meal');
            }
        }

        showMessage('Ingredient removed successfully', 'success');
    } catch (error) {
        console.error('Error removing ingredient:', error);
        showMessage('Failed to remove ingredient', 'error');
    }
}

export async function editIngredient(ingredientId: number) {
    try {
        const { data: ingredient, error } = await supabase
            .from('meal_ingredients')
            .select('*')
            .eq('id', ingredientId)
            .single();

        if (error) throw error;

        // Open a prompt for new quantity
        const newQuantity = prompt('Enter new quantity (in grams):', ingredient.quantity.toString());
        if (newQuantity === null) return; // User cancelled

        const quantity = parseFloat(newQuantity);
        if (isNaN(quantity) || quantity < 0) {
            showMessage('Please enter a valid quantity', 'error');
            return;
        }

        // Update the ingredient
        const { error: updateError } = await supabase
            .from('meal_ingredients')
            .update({ quantity })
            .eq('id', ingredientId);

        if (updateError) throw updateError;

        // Refresh the ingredients list
        const mealId = ingredientState.currentMealId;
        if (mealId) {
            const { data: meal } = await supabase
                .from('meals')
                .select('*, ingredients:meal_ingredients(*)')
                .eq('id', mealId)
                .single();

            if (meal) {
                // Re-populate the form with updated data
                populateForm(meal, 'edit_meal');
            }
        }

        showMessage('Ingredient updated successfully', 'success');
    } catch (error) {
        console.error('Error updating ingredient:', error);
        showMessage('Failed to update ingredient', 'error');
    }
}

// Add to window object
declare global {
    interface Window {
        openIngredientModal: (operation: ModalOperation, idx?: number | null, foodId?: string | null) => void;
        closeIngredientModal: () => void;
        removeIngredient: (ingredientId: number) => void;
        editIngredient: (ingredientId: number) => void;
        currentCategorySelect: HTMLSelectElement | null;
        updateIngredientFood: (index: number, foodId: string) => void;
        updateIngredientQuantity: (index: number, value: string) => void;
        updateIngredientNutrient: (index: number, nutrient: string, value: string) => void;
        updateIngredientInstructions: (index: number, instructions: string) => void;
        addNewIngredient: () => void;
    }
}

window.openIngredientModal = openIngredientModal;
window.closeIngredientModal = closeIngredientModal;
window.removeIngredient = removeIngredient;
window.editIngredient = editIngredient;

// Add selectedFoodId to track the current food being edited
let selectedFoodId: string | null = null;

// Update ingredient food selection
window.updateIngredientFood = (index: number, foodId: string) => {
    const food = allFoods.find(f => f.id === foodId);
    if (food && ingredientState.ingredients[index]) {
        ingredientState.ingredients[index] = {
            ...ingredientState.ingredients[index],
            food_id: food.id,
            food_name: food.name,
            // Update nutrients based on quantity
            carbs: food.carbs * (ingredientState.ingredients[index].quantity || 1),
            fat: food.fat * (ingredientState.ingredients[index].quantity || 1),
            protein: food.protein * (ingredientState.ingredients[index].quantity || 1)
        };
        updateIngredientDisplay(index);
    }
};

// Update ingredient quantity
window.updateIngredientQuantity = (index: number, value: string) => {
    const quantity = parseFloat(value) || 0;
    if (ingredientState.ingredients[index]) {
        const food = allFoods.find(f => f.id === ingredientState.ingredients[index].food_id);
        if (food) {
            ingredientState.ingredients[index] = {
                ...ingredientState.ingredients[index],
                quantity,
                carbs: food.carbs * quantity,
                fat: food.fat * quantity,
                protein: food.protein * quantity
            };
            updateIngredientDisplay(index);
        }
    }
};

// Update ingredient nutrient value
window.updateIngredientNutrient = (index: number, nutrient: string, value: string) => {
    const amount = parseFloat(value) || 0;
    if (ingredientState.ingredients[index]) {
        ingredientState.ingredients[index] = {
            ...ingredientState.ingredients[index],
            [nutrient]: amount
        };
    }
};

// Update ingredient instructions
window.updateIngredientInstructions = (index: number, instructions: string) => {
    if (ingredientState.ingredients[index]) {
        ingredientState.ingredients[index] = {
            ...ingredientState.ingredients[index],
            instructions
        };
    }
};

// Add new ingredient
window.addNewIngredient = () => {
    const newIngredient: Ingredient = {
        food_id: '',
        food_name: '',
        quantity: 1,
        instructions: '',
        carbs: 0,
        fat: 0,
        protein: 0
    };
    ingredientState.ingredients.push(newIngredient);
    // Refresh the form with current meal data
    const item = {
        id: ingredientState.currentMealId,
        ingredients: ingredientState.ingredients
    };
    populateForm(item, 'edit_meal');
};

// Helper function to update a single ingredient's display
function updateIngredientDisplay(index: number) {
    const row = document.querySelector(`.ingredient-row[data-index="${index}"]`);
    if (row) {
        const carbsInput = row.querySelector('.nutrient-field input[onchange*="carbs"]') as HTMLInputElement;
        const fatInput = row.querySelector('.nutrient-field input[onchange*="fat"]') as HTMLInputElement;
        const proteinInput = row.querySelector('.nutrient-field input[onchange*="protein"]') as HTMLInputElement;
        
        if (carbsInput) carbsInput.value = (ingredientState.ingredients[index].carbs || 0).toString();
        if (fatInput) fatInput.value = (ingredientState.ingredients[index].fat || 0).toString();
        if (proteinInput) proteinInput.value = (ingredientState.ingredients[index].protein || 0).toString();
    }
}

async function saveMeal() {
    try {
        const mealNameInput = document.getElementById('modalMealName') as HTMLInputElement;
        const mealTypeSelect = document.getElementById('modalMealType') as HTMLSelectElement;
        const instructionsInput = document.getElementById('modalInstructions') as HTMLTextAreaElement;

        if (!mealNameInput?.value) {
            throw new Error('Meal name is required');
        }

        // Calculate nutrition totals
        const totalCarbs = ingredientState.ingredients.reduce((sum, ing) => sum + (ing.carbs || 0), 0);
        const totalFat = ingredientState.ingredients.reduce((sum, ing) => sum + (ing.fat || 0), 0);
        const totalProtein = ingredientState.ingredients.reduce((sum, ing) => sum + (ing.protein || 0), 0);

        const mealData = {
            name: mealNameInput.value,
            meal_type: mealTypeSelect?.value || '',
            cooking_instructions: instructionsInput?.value || '',
            ingredients: ingredientState.ingredients,
            total_carbs: totalCarbs,
            total_fat: totalFat,
            total_protein: totalProtein,
            updated_at: new Date().toISOString()
        };

        let response;
        if (ingredientState.currentMealId) {
            // Update existing meal
            response = await supabase
                .from('meals')
                .update(mealData)
                .eq('id', ingredientState.currentMealId);
        } else {
            // Create new meal
            response = await supabase
                .from('meals')
                .insert([mealData]);
        }

        if (response.error) {
            throw response.error;
        }

        // Close modal and refresh meals list
        closeIngredientModal();
        await displayMeals(allMeals);
        
        // Show success message
        showMessage('Meal saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving meal:', error);
        showMessage(error.message || 'Error saving meal', 'error');
    }
} 