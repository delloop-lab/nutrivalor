import { supabase } from './supabase-client';
import { showMessage } from '../main';
import { displayFoods, allFoods, loadAndDisplayFoods } from './food-tracker';
import { displayMeals, allMeals } from './meals';

// Make functions available globally
declare global {
    interface Window {
        removeIngredientFromMeal: (index: number) => void;
        updateIngredientFood: (index: number, foodId: string) => Promise<void>;
        updateIngredientQuantity: (index: number, value: string) => Promise<void>;
        updateIngredientUnit: (index: number, newUnit: string) => Promise<void>;
        updateIngredientNutrient: (index: number, nutrient: string, value: string) => void;
        updateIngredientInstructions: (index: number, instructions: string) => void;
        updateServingUnitField: (unitId: string, field: 'name' | 'grams' | 'default', value: string | number | boolean) => void;
        toggleGramsInput: (unitId: string, unitType: string) => void;
        loadMealForEdit: (mealId: string) => Promise<void>;
        addNewIngredient: () => Promise<void>;
        removeIngredientRow: (button: HTMLButtonElement) => void;
        addServingUnit: () => void;
        removeServingUnit: (unitId: string) => void;
    }
}

// Current editing state
let currentEditingFood: any = null;
let currentEditingMeal: any = null;
export let currentMealIngredients: any[] = [];
let currentFoodImageFile: File | null = null;
let currentMealImageFile: File | null = null;

// Serving Units Management
let currentServingUnits: any[] = [];

// ===========================================
// FOOD EDITING FUNCTIONS
// ===========================================

export async function openEditFoodModal(): Promise<void> {
    
    const modal = document.getElementById('editFoodModal');
    
    if (!modal) {
        return;
    }
    
    // Load all foods into dropdown
    await loadFoodsDropdown();
    
    // Reset form
    const form = document.getElementById('editFoodForm') as HTMLFormElement;
    
    if (form) {
        form.style.display = 'none';
        form.reset();
        // Add submit event listener
        form.onsubmit = saveEditedFood;
    }
    
    // Show modal - using the same approach as openEditMealModal
    
    modal.style.cssText = `
        display: block;
        opacity: 1;
        visibility: visible;
        background-color: rgba(0, 0, 0, 0.7);
    `;
    modal.classList.add('visible');
    
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
        // Load food and its serving units
        const [foodResult, unitsResult] = await Promise.all([
            supabase.from('foods').select('*').eq('id', foodId).single(),
            supabase.from('serving_units').select('*').eq('food_id', foodId)
        ]);

        if (foodResult.error) throw foodResult.error;
        if (unitsResult.error) throw unitsResult.error;

        const food = foodResult.data;
        if (!food) {
            showMessage('Food not found', 'error');
            return;
        }

        currentEditingFood = food;
        currentFoodImageFile = null;
        currentServingUnits = unitsResult.data || [];

        // Populate form fields
        (document.getElementById('editFoodId') as HTMLInputElement).value = food.id;
        (document.getElementById('editFoodName') as HTMLInputElement).value = food.name || '';
        (document.getElementById('editFoodBrand') as HTMLInputElement).value = food.brand || '';
        (document.getElementById('editFoodCategory') as HTMLSelectElement).value = food.category || '';
        (document.getElementById('editFoodCarbs') as HTMLInputElement).value = food.carbs?.toString() || '0';
        (document.getElementById('editFoodFat') as HTMLInputElement).value = food.fat?.toString() || '0';
        (document.getElementById('editFoodProtein') as HTMLInputElement).value = food.protein?.toString() || '0';
        (document.getElementById('editFoodInstructions') as HTMLTextAreaElement).value = food.instructions || '';

        // Populate serving units
        const servingUnitsList = document.getElementById('servingUnitsList');
        if (servingUnitsList) {
            servingUnitsList.innerHTML = currentServingUnits
                .map(unit => createServingUnitHtml(
                    unit.id,
                    unit.unit_name,
                    unit.grams_per_unit,
                    unit.is_default
                ))
                .join('');
        }

        // Handle image preview
        const imagePreview = document.getElementById('editFoodImagePreview') as HTMLImageElement;
        const imagePlaceholder = document.getElementById('editFoodImagePlaceholder') as HTMLDivElement;
        
        const fileInput = document.getElementById('editFoodImage') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
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
        showMessage('Error loading food', 'error');
    }
}

function createServingUnitHtml(id: string, name: string = '', gramsPerUnit: number = 0, isDefault: boolean = false) {
    return `
        <div class="serving-unit-item" data-unit-id="${id}">
            <select class="unit-name" 
                    name="unit_name"
                    onchange="updateServingUnitField('${id}', 'name', this.value); toggleGramsInput('${id}', this.value)">
                <option value="">Select unit type</option>
                <option value="GRAMS" ${name === 'GRAMS' ? 'selected' : ''}>GRAMS</option>
                <option value="EACH" ${name === 'EACH' ? 'selected' : ''}>EACH</option>
                <option value="SLICE" ${name === 'SLICE' ? 'selected' : ''}>SLICE</option>
            </select>
            <input type="number" 
                   class="grams-per-unit" 
                   name="grams_per_unit"
                   value="${gramsPerUnit}" 
                   min="0" 
                   step="0.1" 
                   placeholder="Grams per unit"
                   ${name === 'EACH' ? 'disabled' : ''}
                   onchange="updateServingUnitField('${id}', 'grams', this.value)">
            <div class="unit-actions">
                <label>
                    <input type="checkbox" 
                           class="default-unit-checkbox"
                           name="is_default" 
                           ${isDefault ? 'checked' : ''}
                           onchange="updateServingUnitField('${id}', 'default', this.checked)">
                    Default
                </label>
                <button type="button" class="remove-unit-btn" onclick="removeServingUnit('${id}')">&times;</button>
            </div>
        </div>
    `;
}

export function updateServingUnitField(unitId: string, field: 'name' | 'grams' | 'default', value: string | number | boolean) {
    const unit = currentServingUnits.find(u => u.id === unitId);
    if (!unit) {
        // New unit
        const gramsPerUnit = field === 'name' ? getGramsPerUnit(value as string) : (field === 'grams' ? value : 0);
        currentServingUnits.push({
            id: unitId,
            unit_name: field === 'name' ? value : '',
            grams_per_unit: gramsPerUnit,
            is_default: field === 'default' ? value : false
        });
    } else {
        // Update existing unit
        if (field === 'name') {
            unit.unit_name = value;
            // Set grams_per_unit based on unit type
            unit.grams_per_unit = getGramsPerUnit(value as string);
        }
        else if (field === 'grams') unit.grams_per_unit = value;
        else if (field === 'default') {
            // Uncheck other defaults if this one is being checked
            if (value === true) {
                currentServingUnits.forEach(u => {
                    if (u.id !== unitId) u.is_default = false;
                });
            }
            unit.is_default = value;
        }
    }
}

// Helper function to get grams per unit based on unit type
function getGramsPerUnit(unitName: string): number | null {
    switch (unitName) {
        case 'GRAMS':
            return 1.0;
        case 'EACH':
            return null; // EACH units don't have grams_per_unit
        case 'SLICE':
            return null; // No default - user must specify
        default:
            return null;
    }
}

// Function to toggle grams input based on unit type
export function toggleGramsInput(unitId: string, unitType: string) {
    const unitElement = document.querySelector(`.serving-unit-item[data-unit-id="${unitId}"]`);
    if (!unitElement) return;
    
    const gramsInput = unitElement.querySelector('.grams-per-unit') as HTMLInputElement;
    if (!gramsInput) return;
    
    if (unitType === 'EACH') {
        gramsInput.disabled = true;
        gramsInput.value = '';
    } else {
        gramsInput.disabled = false;
        // Clear the input - user must specify the value
        gramsInput.value = '';
    }
}

export function removeServingUnit(unitId: string) {
    const unitElement = document.querySelector(`.serving-unit-item[data-unit-id="${unitId}"]`);
    if (unitElement) {
        unitElement.remove();
        currentServingUnits = currentServingUnits.filter(u => u.id !== unitId);
    }
}

export async function saveEditedFood(event: Event) {
    event.preventDefault();
    
    if (!currentEditingFood) {
        showMessage('No food selected', 'error');
        return;
    }

    try {
        // Get form data
        const form = event.target as HTMLFormElement;
        const formData = new FormData(form);
        
        // Update food data
        const updatedFood = {
            name: formData.get('name') as string,
            brand: formData.get('brand') as string,
            carbs: parseFloat(formData.get('carbs') as string) || 0,
            fat: parseFloat(formData.get('fat') as string) || 0,
            protein: parseFloat(formData.get('protein') as string) || 0,
            instructions: formData.get('instructions') as string,
            category: formData.get('category') as string
        };

        // Update food in database
        const { error: updateError } = await supabase
            .from('foods')
            .update(updatedFood)
            .eq('id', currentEditingFood.id);

        if (updateError) throw updateError;

        // Get all current serving unit IDs to keep
        const servingUnitsToKeep = Array.from(document.querySelectorAll('.serving-unit-item'))
            .map(el => el.getAttribute('data-unit-id'))
            .filter(id => id !== null && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id!)) as string[];

        // Delete removed serving units
        if (servingUnitsToKeep.length > 0) {
            const { error: deleteError } = await supabase
                .from('serving_units')
                .delete()
                .eq('food_id', currentEditingFood.id)
                .not('id', 'in', `(${servingUnitsToKeep.join(',')})`);

            if (deleteError) throw deleteError;
        }

        // Update existing units
        const existingUnits = document.querySelectorAll('.serving-unit-item[data-unit-id]');
        for (const unitElement of existingUnits) {
            const unit = {
                id: unitElement.getAttribute('data-unit-id'),
                unit_name: (unitElement.querySelector('select[name="unit_name"]') as HTMLSelectElement)?.value || 
                           (unitElement.querySelector('input[name="unit_name"]') as HTMLInputElement)?.value,
                grams_per_unit: (unitElement.querySelector('select[name="unit_name"]') as HTMLSelectElement)?.value === 'EACH' ? null : parseFloat((unitElement.querySelector('input[name="grams_per_unit"]') as HTMLInputElement)?.value || '0'),
                is_default: (unitElement.querySelector('input[name="is_default"]') as HTMLInputElement)?.checked
            };

            const { error: updateError } = await supabase
                .from('serving_units')
                .update({
                    unit_name: unit.unit_name,
                    grams_per_unit: unit.grams_per_unit,
                    is_default: unit.is_default
                })
                .eq('id', unit.id);

            if (updateError) throw updateError;
        }

        // Insert new units
        const newUnits = Array.from(document.querySelectorAll('.serving-unit-item:not([data-unit-id])'))
            .map(unitElement => ({
                food_id: currentEditingFood.id,
                unit_name: (unitElement.querySelector('select[name="unit_name"]') as HTMLSelectElement)?.value || 
                           (unitElement.querySelector('input[name="unit_name"]') as HTMLInputElement)?.value,
                grams_per_unit: (unitElement.querySelector('select[name="unit_name"]') as HTMLSelectElement)?.value === 'EACH' ? null : parseFloat((unitElement.querySelector('input[name="grams_per_unit"]') as HTMLInputElement)?.value || '0'),
                is_default: (unitElement.querySelector('input[name="is_default"]') as HTMLInputElement)?.checked
            }));

        if (newUnits.length > 0) {
            const { error: insertError } = await supabase
                .from('serving_units')
                .insert(newUnits);

            if (insertError) throw insertError;
        }

        showMessage('Food updated successfully', 'success');
        closeEditFoodModal();

        // Refresh food display
        const { data: foods, error: foodsError } = await supabase
            .from('foods')
            .select('*')
            .order('name');
            
        if (foodsError) throw foodsError;
        if (foods) {
            displayFoods(foods);
        }

    } catch (error) {
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
        await loadAndDisplayFoods();
        
    } catch (error) {
        showMessage('Error deleting food', 'error');
    }
}

// ===========================================
// MEAL EDITING FUNCTIONS
// ===========================================

export async function openEditMealModal() {
    
    const modal = document.getElementById('editMealModal');
    
    if (!modal) {
        return;
    }

    try {
        // First load all foods to ensure we have the data
        const { data: foods, error: foodsError } = await supabase
            .from('foods')
            .select('*')
            .order('name');

        if (foodsError) throw foodsError;

        // Update allFoods for the ingredient functions to use
        allFoods.length = 0;
        allFoods.push(...(foods || []));
    } catch (error) {
        showMessage('Error loading foods', 'error');
    }
    
    // Load all meals into dropdown
    await loadMealsDropdown();
    
    // Reset form
    const form = document.getElementById('editMealForm') as HTMLFormElement;
    
    if (form) {
        form.style.display = 'none';
        form.reset();
    }
    
    // Show modal - simplified display logic
    
    modal.style.cssText = `
        display: block;
        opacity: 1;
        visibility: visible;
        background-color: rgba(0, 0, 0, 0.7);
    `;
    
}

export function closeEditMealModal() {
    const modal = document.getElementById('editMealModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('visible');
    }
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
        showMessage('Error loading meals', 'error');
    }
}

// Helper function to parse quantity from ingredient name
function parseIngredientQuantity(ingredientName: string): { quantity: number, cleanName: string } {
    // Handle null/undefined/empty values
    if (!ingredientName) {
        return {
            quantity: 1,
            cleanName: ''
        };
    }

    // Convert to lowercase for consistent matching
    const name = ingredientName.toLowerCase();
    
    // Try to match patterns like:
    // "5 eggs"
    // "200g ham"
    // "1/2 cup"
    const quantityMatch = name.match(/^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(?:g|gram|ml|cup|tbsp|tsp|)?\s+(.+)$/);
    
    if (quantityMatch) {
        const [_, quantity, rest] = quantityMatch;
        // Handle fractions like 1/2
        const numericQuantity = quantity.includes('/') 
            ? eval(quantity) // safely evaluate fraction
            : parseFloat(quantity);
            
        return {
            quantity: numericQuantity,
            cleanName: rest.trim()
        };
    }
    
    return {
        quantity: 1,
        cleanName: name.trim()
    };
}

export async function loadMealForEdit(mealId: string) {
    
    if (!mealId) {
        const form = document.getElementById('editMealForm') as HTMLFormElement;
        if (form) {
            form.style.display = 'none';
        }
        return;
    }
    
    try {
        // Get meal data
        const { data: meal, error: mealError } = await supabase
            .from('meals')
            .select('*')
            .eq('id', mealId)
            .single();
            
        if (mealError) throw mealError;
        if (!meal) throw new Error('Meal not found');

        // Set current editing meal
        currentEditingMeal = meal;

        // Parse ingredients
        let ingredients;
        if (typeof meal.ingredients === 'string') {
            ingredients = JSON.parse(meal.ingredients || '[]');
        } else {
            ingredients = meal.ingredients || [];
        }
        
        // Get all foods
        const { data: foods, error: foodsError } = await supabase
            .from('foods')
            .select('*');
            
        if (foodsError) throw foodsError;

        // Get all serving units
        const { data: allServingUnits, error: unitsError } = await supabase
            .from('serving_units')
            .select('*');
            
        if (unitsError) throw unitsError;

        // Process each ingredient
        currentMealIngredients = await Promise.all(ingredients.map(async (ing: any) => {
            const food = foods.find(f => f.id === ing.food_id);
            if (!food) return ing;

            // Get serving units for this food
            const foodServingUnits = allServingUnits.filter(u => u.food_id === food.id);

            // Find or create serving unit
            let servingUnit;
            if (foodServingUnits.length > 0) {
                // First try to find the unit that matches the ingredient's unit
                servingUnit = foodServingUnits.find((u: any) => 
                    u.unit_name.toLowerCase() === (ing.serving_unit || '').toLowerCase()
                );
                
                // If not found, try to find EACH unit
                if (!servingUnit) {
                    servingUnit = foodServingUnits.find(u => u.unit_name.toUpperCase() === 'EACH');
                }
                
                // If still not found, use default unit
                if (!servingUnit) {
                    servingUnit = foodServingUnits.find(u => u.is_default) || foodServingUnits[0];
                }
            }

            // If no serving unit found, create a default one
            if (!servingUnit) {
                servingUnit = {
                    unit_name: 'g',
                    grams_per_unit: 1,
                    is_default: true
                };
            }

            // Calculate macros based on serving unit and quantity
            const quantity = ing.quantity || 1;
            const unitName = servingUnit.unit_name.toLowerCase();
            let carbs, fat, protein;

            if (unitName === 'each') {
                // For EACH units, food values are already per unit, just multiply by quantity
                carbs = Math.round((food.carbs * quantity) * 10) / 10;
                fat = Math.round((food.fat * quantity) * 10) / 10;
                protein = Math.round((food.protein * quantity) * 10) / 10;

            } else {
                // For all other units (including SLICE), use grams calculation
                const totalGrams = servingUnit.grams_per_unit * quantity;
                const factor = totalGrams / 100;
                carbs = Math.round((food.carbs * factor) * 10) / 10;
                fat = Math.round((food.fat * factor) * 10) / 10;
                protein = Math.round((food.protein * factor) * 10) / 10;

            }

            return {
                ...ing,
                food_id: food.id,
                food_name: food.name,
                serving_unit: servingUnit.unit_name,
                serving_units: foodServingUnits || [], // Store all available units
                carbs,
                fat,
                protein,
                quantity
            };
        }));

        // Show the form
        const form = document.getElementById('editMealForm') as HTMLFormElement;
        if (form) {
            form.style.display = 'block';
        } else {
            return;
        }

        // Update form fields
        const nameInput = document.getElementById('editMealName') as HTMLInputElement;
        const typeSelect = document.getElementById('editMealType') as HTMLSelectElement;
        const instructionsInput = document.getElementById('editMealInstructions') as HTMLTextAreaElement;
        
        if (nameInput) nameInput.value = meal.name || '';
        if (typeSelect) typeSelect.value = meal.meal_type || '';
        if (instructionsInput) instructionsInput.value = meal.cooking_instructions || '';

        // Render ingredients
        await renderMealIngredients();
        
    } catch (error) {
        showMessage('Error loading meal', 'error');
    }
}

async function renderMealIngredients() {
    const container = document.getElementById('editMealIngredients');
    if (!container) return;

    container.innerHTML = '';

    try {
        currentMealIngredients.forEach((ingredient, index) => {
            const div = document.createElement('div');
            div.className = 'ingredient-edit-row';

            // Food selection dropdown
            let foodSelectHtml = `<select class="food-select" onchange="updateIngredientFood(${index}, this.value)"><option value="">Select a food...</option>`;
            const foodsByCategory = allFoods.reduce((acc, food) => {
                const category = food.category || 'Other';
                if (!acc[category]) acc[category] = [];
                acc[category].push(food);
                return acc;
            }, {} as Record<string, any[]>);

            for (const category in foodsByCategory) {
                foodSelectHtml += `<optgroup label="${category}">`;
                foodSelectHtml += foodsByCategory[category].map(food => 
                    `<option value="${food.id}" ${ingredient.food_id === food.id ? 'selected' : ''}>${food.name}</option>`
                ).join('');
                foodSelectHtml += `</optgroup>`;
            }
            foodSelectHtml += `</select>`;

            // Quantity and Unit inputs
            let unitsHtml = `<select class="unit-select" onchange="updateIngredientUnit(${index}, this.value)" ${ingredient.serving_units?.length ? '' : 'disabled'}>`;
            if (ingredient.serving_units?.length) {
                unitsHtml += ingredient.serving_units.map((unit: any) => 
                    `<option value="${unit.unit_name}" ${ingredient.serving_unit === unit.unit_name ? 'selected' : ''}>${unit.unit_name}</option>`
                ).join('');
            } else {
                unitsHtml += '<option>g</option>';
            }
            unitsHtml += '</select>';

            const quantityInputHtml = `<input type="number" class="quantity-input" value="${ingredient.quantity || 1}" onchange="updateIngredientQuantity(${index}, this.value)" min="0">`;

            // Nutrient display
            let carbs = ingredient.carbs || 0;
            let fat = ingredient.fat || 0;
            let protein = ingredient.protein || 0;

            div.innerHTML = `
                <div class="ingredient-main-controls">
                    ${foodSelectHtml}
                    <div class="ingredient-quant-controls">
                        ${quantityInputHtml}
                        ${unitsHtml}
                    </div>
                    <button class="remove-ingredient-btn" onclick="removeIngredientFromMeal(${index})">&times;</button>
                </div>
                <div class="ingredient-details">
                    <div class="nutrient-tags">
                        <span class="nutrient-tag carbs">${carbs.toFixed(1)}g C</span>
                        <span class="nutrient-tag fat">${fat.toFixed(1)}g F</span>
                        <span class="nutrient-tag protein">${protein.toFixed(1)}g P</span>
                    </div>
                </div>
            `;

            container.appendChild(div);
        });
    } catch (error) {
        showMessage('Error rendering ingredients', 'error');
    }
}

export async function addIngredientToMeal() {
    try {
        // Make sure we have foods loaded
        if (allFoods.length === 0) {
            const { data: foods, error: foodsError } = await supabase
                .from('foods')
                .select('*')
                .order('name');

            if (foodsError) throw foodsError;
            allFoods.push(...(foods || []));
        }

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
        await renderMealIngredients();
    } catch (error) {
        showMessage('Error adding ingredient', 'error');
    }
}

export function removeIngredientFromMeal(index: number) {
    currentMealIngredients.splice(index, 1);
    renderMealIngredients();
}

export async function updateIngredientFood(index: number, foodId: string) {
    if (!currentMealIngredients[index]) return;
    
    try {
        const food = allFoods.find(f => f.id === foodId);
        if (!food) {
            return;
        }

        // Get serving units for this food
        const { data: servingUnits } = await supabase
            .from('serving_units')
            .select('*')
            .eq('food_id', foodId);

        // Find or create serving unit
        let servingUnit;
        if (servingUnits && servingUnits.length > 0) {
            // First try to find EACH unit
            servingUnit = servingUnits.find(u => u.unit_name.toUpperCase() === 'EACH');
            
            // If not found, use default unit
            if (!servingUnit) {
                servingUnit = servingUnits.find(u => u.is_default) || servingUnits[0];
            }
        } else {
            // Create default unit (grams)
            servingUnit = {
                unit_name: 'g',
                grams_per_unit: 1,
                is_default: true
            };
        }

        const quantity = currentMealIngredients[index].quantity || 1;
        const unitName = servingUnit.unit_name.toLowerCase();
        let carbs, fat, protein;

        if (unitName === 'each') {
            // For EACH units, food values are already per unit, just multiply by quantity
            carbs = Math.round((food.carbs * quantity) * 10) / 10;
            fat = Math.round((food.fat * quantity) * 10) / 10;
            protein = Math.round((food.protein * quantity) * 10) / 10;

        } else {
            // For all other units (including SLICE), use grams calculation
            const totalGrams = servingUnit.grams_per_unit * quantity;
            const factor = totalGrams / 100;
            carbs = Math.round((food.carbs * factor) * 10) / 10;
            fat = Math.round((food.fat * factor) * 10) / 10;
            protein = Math.round((food.protein * factor) * 10) / 10;

        }

        currentMealIngredients[index] = {
            ...currentMealIngredients[index],
            food_id: food.id,
            food_name: food.name,
            serving_unit: servingUnit.unit_name,
            serving_units: servingUnits || [], // Store all available units
            carbs,
            fat,
            protein,
            quantity
        };

        reRenderIngredients();
    } catch (error) {
        showMessage('Error updating food', 'error');
    }
}

export async function updateIngredientQuantity(index: number, value: string) {
    if (!currentMealIngredients[index]) return;
    try {
        const ingredient = currentMealIngredients[index];
        ingredient.quantity = parseFloat(value) || 0;
        
        const food = allFoods.find(f => f.id === ingredient.food_id);
        
        if (!food || !ingredient.serving_units || ingredient.serving_units.length === 0) {
            reRenderIngredients();
            return;
        }

        const servingUnit = ingredient.serving_units.find((u: any) => u.unit_name === ingredient.serving_unit);

        if (!servingUnit) {
            return;
        }
        
        const unitName = (servingUnit.unit_name || '').toLowerCase();
        let carbs, fat, protein;

        if (unitName === 'each') {
            // For EACH units, food values are already per unit, just multiply by quantity
            carbs = Math.round((food.carbs * ingredient.quantity) * 10) / 10;
            fat = Math.round((food.fat * ingredient.quantity) * 10) / 10;
            protein = Math.round((food.protein * ingredient.quantity) * 10) / 10;

        } else {
            // For all other units (including SLICE), use grams calculation
            const totalGrams = servingUnit.grams_per_unit * ingredient.quantity;
            const factor = totalGrams / 100;
            carbs = Math.round((food.carbs * factor) * 10) / 10;
            fat = Math.round((food.fat * factor) * 10) / 10;
            protein = Math.round((food.protein * factor) * 10) / 10;

        }
        ingredient.carbs = carbs;
        ingredient.fat = fat;
        ingredient.protein = protein;
        
        reRenderIngredients();
    } catch (error) {
        showMessage('Error updating ingredient', 'error');
    }
}

export async function updateIngredientUnit(index: number, newUnit: string) {
    if (!currentMealIngredients[index]) return;
    
    try {
        const ingredient = currentMealIngredients[index];
        const food = allFoods.find(f => f.id === ingredient.food_id);
        
        if (!food || !ingredient.serving_units || ingredient.serving_units.length === 0) {
            reRenderIngredients();
            return;
        }

        const servingUnit = ingredient.serving_units.find((u: any) => u.unit_name === newUnit);

        if (!servingUnit) {
            return;
        }
        
        // Update serving unit
        ingredient.serving_unit = newUnit;
        
        // Calculate macros based on serving unit and quantity
        const unitName = newUnit.toLowerCase();
        let carbs, fat, protein;

        if (unitName === 'each') {
            // For EACH units, food values are already per unit, just multiply by quantity
            carbs = Math.round((food.carbs * ingredient.quantity) * 10) / 10;
            fat = Math.round((food.fat * ingredient.quantity) * 10) / 10;
            protein = Math.round((food.protein * ingredient.quantity) * 10) / 10;

        } else {
            // For all other units (including SLICE), use grams calculation
            const totalGrams = servingUnit.grams_per_unit * ingredient.quantity;
            const factor = totalGrams / 100;
            carbs = Math.round((food.carbs * factor) * 10) / 10;
            fat = Math.round((food.fat * factor) * 10) / 10;
            protein = Math.round((food.protein * factor) * 10) / 10;

        }

        ingredient.carbs = carbs;
        ingredient.fat = fat;
        ingredient.protein = protein;
        
        reRenderIngredients();
    } catch (error) {
        showMessage('Error updating unit', 'error');
    }
}

export function updateIngredientNutrient(index: number, nutrient: string, value: string) {
    if (!currentMealIngredients[index]) return;
    currentMealIngredients[index][nutrient] = parseFloat(value) || 0;
}

export function updateIngredientInstructions(index: number, instructions: string) {
    if (!currentMealIngredients[index]) return;
    currentMealIngredients[index].instructions = instructions;
}

export async function saveEditedMeal(event: Event) {
    event.preventDefault();
    
    if (!currentEditingMeal) {
        showMessage('No meal selected', 'error');
        return;
    }

    // Validate ingredients
    if (!currentMealIngredients || currentMealIngredients.length === 0) {
        showMessage('Cannot save meal without ingredients', 'error');
        return;
    }

    try {
        let imageUrl = currentEditingMeal.image_url;
        let picture = currentEditingMeal.picture;

        // Upload new image if one was selected
        if (currentMealImageFile) {
            
            const fileExt = currentMealImageFile.name.split('.').pop();
            const fileName = `meal_${currentEditingMeal.id}_${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
                .from('meal-images')
                .upload(fileName, currentMealImageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('meal-images')
                .getPublicUrl(fileName);

            imageUrl = publicUrl;
            picture = fileName;
        }

        // Get form values
        const name = (document.getElementById('editMealName') as HTMLInputElement).value;
        const mealType = (document.getElementById('editMealType') as HTMLSelectElement).value;
        const instructions = (document.getElementById('editMealInstructions') as HTMLTextAreaElement).value;

        // Calculate totals
        let totalCarbs = 0;
        let totalFat = 0;
        let totalProtein = 0;

        // Load serving units for all foods
        const { data: servingUnits, error: unitsError } = await supabase
            .from('serving_units')
            .select('*');

        if (unitsError) throw unitsError;

        // Prepare ingredients with proper serving units and macros
        const ingredientsToSave = await Promise.all(currentMealIngredients.map(async (ing) => {
            // Get food details
            const { data: food } = await supabase
                .from('foods')
                .select('*')
                .eq('id', ing.food_id)
                .single();

            if (!food) {
                return ing;
            }

            // Get serving unit for this food
            let servingUnit = servingUnits?.find(u => 
                u.food_id === food.id && 
                (u.unit_name.toLowerCase() === (ing.serving_unit || '').toLowerCase() || u.is_default)
            );

            // If no serving unit found, create a default one (1g per unit)
            if (!servingUnit) {
                servingUnit = {
                    unit_name: 'g',
                    grams_per_unit: 1,
                    is_default: true
                };
            }

            // Calculate macros based on serving unit and quantity
            let carbs, fat, protein;
            if (servingUnit.unit_name.toUpperCase() === 'EACH') {
                // For EACH units, food values are already per unit, just multiply by quantity
                carbs = Math.round((food.carbs * ing.quantity) * 100) / 100;
                fat = Math.round((food.fat * ing.quantity) * 100) / 100;
                protein = Math.round((food.protein * ing.quantity) * 100) / 100;
                
            } else {
                // For weight-based units, calculate using grams
                const totalGrams = servingUnit.grams_per_unit * ing.quantity;
                const factor = totalGrams / 100; // Convert from per 100g to actual grams

                carbs = Math.round((food.carbs * factor) * 100) / 100;
                fat = Math.round((food.fat * factor) * 100) / 100;
                protein = Math.round((food.protein * factor) * 100) / 100;
            }

            // Add to totals
            totalCarbs += carbs;
            totalFat += fat;
            totalProtein += protein;

            return {
                food_id: food.id,
                food_name: food.name,
                quantity: ing.quantity,
                serving_unit: servingUnit.unit_name,
                instructions: ing.instructions || '',
                carbs,
                fat,
                protein
            };
        }));

        // Update meal in database
        const { error } = await supabase
            .from('meals')
            .update({
                name,
                meal_type: mealType,
                cooking_instructions: instructions || null,
                ingredients: JSON.stringify(ingredientsToSave),
                total_carbs: Math.round(totalCarbs * 100) / 100,
                total_fat: Math.round(totalFat * 100) / 100,
                total_protein: Math.round(totalProtein * 100) / 100,
                image_url: imageUrl,
                picture,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentEditingMeal.id);

        if (error) throw error;

        showMessage('Meal saved successfully!', 'success');
        closeEditMealModal();

        // Refresh meals dropdown and display
        await loadMealsDropdown();
        await displayMeals(allMeals);

    } catch (error) {
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
    
}

export function previewMealImage(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const imagePreview = document.getElementById('editMealImagePreview') as HTMLImageElement;
    const imagePlaceholder = document.getElementById('editMealImagePlaceholder') as HTMLDivElement;

    reader.onload = (e) => {
        if (e.target?.result && imagePreview && imagePlaceholder) {
            imagePreview.src = e.target.result as string;
            imagePreview.style.display = 'block';
            imagePlaceholder.style.display = 'none';
            currentMealImageFile = file;
        }
    };

    reader.readAsDataURL(file);
}

export function removeMealImage() {
    const imagePreview = document.getElementById('editMealImagePreview') as HTMLImageElement;
    const imagePlaceholder = document.getElementById('editMealImagePlaceholder') as HTMLDivElement;
    const fileInput = document.getElementById('editMealImage') as HTMLInputElement;

    if (imagePreview && imagePlaceholder && fileInput) {
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        imagePlaceholder.style.display = 'flex';
        fileInput.value = '';
        currentMealImageFile = null;
    }
}

export function addServingUnit() {
    const servingUnitsList = document.getElementById('servingUnitsList');
    if (!servingUnitsList) return;

    const unitId = Date.now().toString(); // Temporary ID for new units
    const unitHtml = createServingUnitHtml(unitId);
    servingUnitsList.insertAdjacentHTML('beforeend', unitHtml);
}

// Function to remove an ingredient row
export function removeIngredientRow(button: HTMLButtonElement): void {
    const row = button.closest('.ingredient-row');
    if (!row) return;

    // Find the index of the ingredient to remove
    const container = document.getElementById('editMealIngredients');
    if (!container) return;

    const rows = Array.from(container.querySelectorAll('.ingredient-row'));
    const index = rows.indexOf(row);
    if (index === -1) return;

    // Remove the ingredient from the array and re-render
    currentMealIngredients.splice(index, 1);
    renderMealIngredients();
}

// Function to add a new ingredient row
export async function addNewIngredient() {
    try {
        // Make sure we have foods loaded
        if (allFoods.length === 0) {
            const { data: foods, error: foodsError } = await supabase
                .from('foods')
                .select('*')
                .order('name');

            if (foodsError) throw foodsError;
            allFoods.push(...(foods || []));
        }

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
        
        // Determine which container exists and call appropriate render function
        const createContainer = document.getElementById('ingredientsList');
        const editContainer = document.getElementById('editMealIngredients');
        
        if (editContainer) {
            await renderMealIngredients(); // Edit Meal modal (prioritize this)
        } else if (createContainer) {
            await renderMealIngredientsForCreate(); // Admin CREATE MEAL form
        }
    } catch (error) {
        showMessage('Error adding ingredient', 'error');
    }
}

// Helper for Create Meal form
async function renderMealIngredientsForCreate() {
    const container = document.getElementById('ingredientsList');
    if (!container) return;
    container.innerHTML = '';
    try {
        currentMealIngredients.forEach((ingredient, index) => {
            const div = document.createElement('div');
            div.className = 'ingredient-edit-row';

            // Food selection dropdown
            let foodSelectHtml = `<select class="food-select" onchange="updateIngredientFood(${index}, this.value)"><option value="">Select a food...</option>`;
            const foodsByCategory = allFoods.reduce((acc, food) => {
                const category = food.category || 'Other';
                if (!acc[category]) acc[category] = [];
                acc[category].push(food);
                return acc;
            }, {} as Record<string, any[]>);

            for (const category in foodsByCategory) {
                foodSelectHtml += `<optgroup label="${category}">`;
                foodSelectHtml += foodsByCategory[category].map(food => 
                    `<option value="${food.id}" ${ingredient.food_id === food.id ? 'selected' : ''}>${food.name}</option>`
                ).join('');
                foodSelectHtml += `</optgroup>`;
            }
            foodSelectHtml += `</select>`;

            // Quantity and Unit inputs
            let unitsHtml = '<select class="unit-select" onchange="updateIngredientUnit('+index+', this.value)" ' + (ingredient.serving_units?.length ? '' : 'disabled') + '>';
            if (ingredient.serving_units?.length) {
                unitsHtml += ingredient.serving_units.map((unit: any) => `<option value="${unit.unit_name}" ${ingredient.serving_unit === unit.unit_name ? 'selected' : ''}>${unit.unit_name}</option>`).join('');
            } else {
                unitsHtml += '<option>g</option>';
            }
            unitsHtml += '</select>';

            const quantityInputHtml = `<input type="number" class="quantity-input" value="${ingredient.quantity || 1}" onchange="updateIngredientQuantity(${index}, this.value)" min="0">`;

            // Nutrient display
            let carbs = ingredient.carbs || 0;
            let fat = ingredient.fat || 0;
            let protein = ingredient.protein || 0;
            const unitName = (ingredient.serving_unit || '').toLowerCase();
            const quantity = ingredient.quantity || 1;
            if (unitName === "each") {
                // For EACH units, multiply by quantity since values are per unit
                carbs = carbs * quantity;
                fat = fat * quantity;
                protein = protein * quantity;
            }
            // Note: SLICE units are already calculated correctly in the food details
            const nutrientsHtml = `
                <div class="nutrient-tags">
                    <span class="nutrient-tag carbs">${carbs.toFixed(1)}g C</span>
                    <span class="nutrient-tag fat">${fat.toFixed(1)}g F</span>
                    <span class="nutrient-tag protein">${protein.toFixed(1)}g P</span>
                </div>`;
            
            // Remove button
            const removeButtonHtml = `<button class="remove-ingredient-btn" onclick="removeIngredientFromMeal(${index})">&times;</button>`;
            
            div.innerHTML = `
                <div class="ingredient-main-controls">
                  ${foodSelectHtml}
                  <div class="ingredient-quant-controls">
                    ${quantityInputHtml}
                    ${unitsHtml}
                  </div>
                </div>
                ${nutrientsHtml}
                ${removeButtonHtml}
            `;
            container.appendChild(div);
        });
    } catch(e) {
        container.innerHTML = "Error rendering ingredients";
    }
}

async function reRenderIngredients() {
    const createContainer = document.getElementById('ingredientsList');
    const editContainer = document.getElementById('editMealIngredients');
    if (createContainer) {
        await renderMealIngredientsForCreate();
    } else if (editContainer) {
        await renderMealIngredients();
    }
}



// Assign functions to window object
window.removeIngredientFromMeal = removeIngredientFromMeal;
window.updateIngredientFood = updateIngredientFood;
window.updateIngredientQuantity = updateIngredientQuantity;
window.updateIngredientUnit = updateIngredientUnit;
window.updateIngredientNutrient = updateIngredientNutrient;
window.updateIngredientInstructions = updateIngredientInstructions;
window.updateServingUnitField = updateServingUnitField;
window.toggleGramsInput = toggleGramsInput;
window.loadMealForEdit = loadMealForEdit;
window.addNewIngredient = addNewIngredient;
window.removeIngredientRow = removeIngredientRow;
window.addServingUnit = addServingUnit;
window.removeServingUnit = removeServingUnit;