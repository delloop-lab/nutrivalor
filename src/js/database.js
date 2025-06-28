// Database Module for Nutrime
// This module handles database operations and provides a unified interface

// Initialize database connection
async function initializeDatabase() {
    try {
        console.log('🗄️ Initializing database connection...');
        
        // Check if Supabase is properly configured
        if (supabase && SUPABASE_URL && !SUPABASE_URL.includes('your-project')) {
            console.log('✅ Using Supabase database');
            await testSupabaseConnection();
        } else {
            console.log('📝 Using localStorage fallback');
            initializeLocalStorage();
        }
        
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        console.log('📝 Falling back to localStorage');
        initializeLocalStorage();
    }
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error && error.message !== 'Auth session missing!') {
            throw error;
        }
        console.log('✅ Supabase connection test successful');
    } catch (error) {
        console.error('❌ Supabase connection test failed:', error);
        throw error;
    }
}

// Initialize localStorage structure
function initializeLocalStorage() {
    const keys = [
        'nutrime_users',
        'nutrime_foods',
        'nutrime_meals',
        'nutrime_shopping_list',
        'nutrime_meal_plan'
    ];
    
    keys.forEach(key => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify([]));
        }
    });
    
    console.log('✅ localStorage initialized');
}

// Generic database operations
const Database = {
    // Create operation
    async create(table, data) {
        try {
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            const dataWithUserId = {
                ...data,
                user_id: currentUser.id,
                id: generateId(),
                created_at: new Date().toISOString()
            };
            
            // Use Supabase if available
            if (supabase && supabase.from) {
                const { data: result, error } = await supabase
                    .from(table)
                    .insert([dataWithUserId])
                    .select();
                
                if (error) throw error;
                return result[0];
            }
            
            // Fallback to localStorage
            const storageKey = `nutrime_${table}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existing.push(dataWithUserId);
            localStorage.setItem(storageKey, JSON.stringify(existing));
            
            return dataWithUserId;
            
        } catch (error) {
            console.error(`Error creating ${table}:`, error);
            throw error;
        }
    },
    
    // Read operation
    async read(table, filters = {}) {
        try {
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            // Use Supabase if available
            if (supabase && supabase.from) {
                let query = supabase
                    .from(table)
                    .select('*')
                    .eq('user_id', currentUser.id);
                
                // Apply filters
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
            }
            
            // Fallback to localStorage
            const storageKey = `nutrime_${table}`;
            const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
            
            // Filter by user_id and other filters
            let filtered = data.filter(item => item.user_id === currentUser.id);
            
            Object.entries(filters).forEach(([key, value]) => {
                filtered = filtered.filter(item => item[key] === value);
            });
            
            return filtered;
            
        } catch (error) {
            console.error(`Error reading ${table}:`, error);
            throw error;
        }
    },
    
    // Update operation
    async update(table, id, data) {
        try {
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            const updateData = {
                ...data,
                updated_at: new Date().toISOString()
            };
            
            // Use Supabase if available
            if (supabase && supabase.from) {
                const { data: result, error } = await supabase
                    .from(table)
                    .update(updateData)
                    .eq('id', id)
                    .eq('user_id', currentUser.id)
                    .select();
                
                if (error) throw error;
                return result[0];
            }
            
            // Fallback to localStorage
            const storageKey = `nutrime_${table}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const index = existing.findIndex(item => item.id === id && item.user_id === currentUser.id);
            
            if (index !== -1) {
                existing[index] = { ...existing[index], ...updateData };
                localStorage.setItem(storageKey, JSON.stringify(existing));
                return existing[index];
            }
            
            throw new Error('Item not found');
            
        } catch (error) {
            console.error(`Error updating ${table}:`, error);
            throw error;
        }
    },
    
    // Delete operation
    async delete(table, id) {
        try {
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            // Use Supabase if available
            if (supabase && supabase.from) {
                const { error } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', id)
                    .eq('user_id', currentUser.id);
                
                if (error) throw error;
                return true;
            }
            
            // Fallback to localStorage
            const storageKey = `nutrime_${table}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const filtered = existing.filter(item => !(item.id === id && item.user_id === currentUser.id));
            localStorage.setItem(storageKey, JSON.stringify(filtered));
            
            return true;
            
        } catch (error) {
            console.error(`Error deleting ${table}:`, error);
            throw error;
        }
    },
    
    // Bulk create operation
    async bulkCreate(table, dataArray) {
        try {
            if (!currentUser) {
                throw new Error('User not authenticated');
            }
            
            const dataWithUserId = dataArray.map(data => ({
                ...data,
                user_id: currentUser.id,
                id: generateId(),
                created_at: new Date().toISOString()
            }));
            
            // Use Supabase if available
            if (supabase && supabase.from) {
                const { data: result, error } = await supabase
                    .from(table)
                    .insert(dataWithUserId)
                    .select();
                
                if (error) throw error;
                return result;
            }
            
            // Fallback to localStorage
            const storageKey = `nutrime_${table}`;
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existing.push(...dataWithUserId);
            localStorage.setItem(storageKey, JSON.stringify(existing));
            
            return dataWithUserId;
            
        } catch (error) {
            console.error(`Error bulk creating ${table}:`, error);
            throw error;
        }
    }
};

// Specific database operations for each entity
const FoodDB = {
    async create(foodData) {
        return Database.create('foods', foodData);
    },
    
    async getAll() {
        return Database.read('foods');
    },
    
    async getByCategory(category) {
        return Database.read('foods', { category });
    },
    
    async update(id, foodData) {
        return Database.update('foods', id, foodData);
    },
    
    async delete(id) {
        return Database.delete('foods', id);
    },
    
    async bulkCreate(foodsArray) {
        return Database.bulkCreate('foods', foodsArray);
    }
};

const MealDB = {
    async create(mealData) {
        return Database.create('meals', mealData);
    },
    
    async getAll() {
        return Database.read('meals');
    },
    
    async update(id, mealData) {
        return Database.update('meals', id, mealData);
    },
    
    async delete(id) {
        return Database.delete('meals', id);
    },
    
    async bulkCreate(mealsArray) {
        return Database.bulkCreate('meals', mealsArray);
    }
};

const ShoppingListDB = {
    async create(itemData) {
        return Database.create('shopping_list', itemData);
    },
    
    async getAll() {
        return Database.read('shopping_list');
    },
    
    async update(id, itemData) {
        return Database.update('shopping_list', id, itemData);
    },
    
    async delete(id) {
        return Database.delete('shopping_list', id);
    },
    
    async clear() {
        try {
            if (!currentUser) return;
            
            if (supabase && supabase.from) {
                const { error } = await supabase
                    .from('shopping_list')
                    .delete()
                    .eq('user_id', currentUser.id);
                
                if (error) throw error;
            }
            
            // Clear localStorage
            localStorage.setItem('nutrime_shopping_list', JSON.stringify([]));
            
        } catch (error) {
            console.error('Error clearing shopping list:', error);
            throw error;
        }
    }
};

// Export data functionality
async function exportAllData() {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        
        const data = {
            user: currentUser,
            foods: await FoodDB.getAll(),
            meals: await MealDB.getAll(),
            shoppingList: await ShoppingListDB.getAll(),
            exportDate: new Date().toISOString()
        };
        
        return data;
        
    } catch (error) {
        console.error('Error exporting data:', error);
        throw error;
    }
}

// Import data functionality
async function importAllData(importData) {
    try {
        if (!currentUser) {
            throw new Error('User not authenticated');
        }
        
        let importCount = 0;
        
        if (importData.foods && importData.foods.length > 0) {
            await FoodDB.bulkCreate(importData.foods);
            importCount += importData.foods.length;
        }
        
        if (importData.meals && importData.meals.length > 0) {
            await MealDB.bulkCreate(importData.meals);
            importCount += importData.meals.length;
        }
        
        return importCount;
        
    } catch (error) {
        console.error('Error importing data:', error);
        throw error;
    }
}

// Initialize database when module loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initializeDatabase, 1000);
});
