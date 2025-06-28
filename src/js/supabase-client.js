// Supabase Client Configuration
// You'll need to replace these with your actual Supabase project details

// Replace these with your actual Supabase credentials
// Get them from: https://app.supabase.com/project/[your-project]/settings/api
const SUPABASE_URL = 'https://ehutpsrutyiorhqrwstz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodXRwc3J1dHlpb3JocXJ3c3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTMyNzQsImV4cCI6MjA2NjY4OTI3NH0.lcfz59Uc2S6q9Mn2lj2OC_WAMG5CncrNbEnHX7MFTeI';

// INSTRUCTIONS: 
// 1. Go to https://supabase.com → New Project
// 2. Name your project: "nutrivalor"
// 3. Copy your Project URL and Anon Key from Settings → API  
// 4. Replace the values above

// Initialize Supabase client
let supabase;

async function initializeSupabase() {
    try {
        // Import Supabase from CDN if not already loaded
        if (typeof supabase === 'undefined') {
            // Load Supabase from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase client initialized');
            };
            document.head.appendChild(script);
        }
    } catch (error) {
        console.error('❌ Error initializing Supabase:', error);
        // Fallback to localStorage for development
        console.log('📝 Using localStorage fallback for development');
        supabase = createLocalStorageFallback();
    }
}

// Fallback implementation using localStorage for development
function createLocalStorageFallback() {
    console.log('🔧 Using localStorage fallback implementation');
    
    return {
        auth: {
            signUp: async ({ email, password, options = {} }) => {
                const users = JSON.parse(localStorage.getItem('nutrivalor_users') || '[]');
                const existingUser = users.find(u => u.email === email);
                
                if (existingUser) {
                    return { data: null, error: { message: 'User already exists' } };
                }
                
                const user = {
                    id: generateId(),
                    email,
                    user_metadata: options.data || {},
                    created_at: new Date().toISOString()
                };
                
                users.push({ ...user, password });
                localStorage.setItem('nutrivalor_users', JSON.stringify(users));
                localStorage.setItem('nutrivalor_current_user', JSON.stringify(user));
                
                return { data: { user }, error: null };
            },
            
            signInWithPassword: async ({ email, password }) => {
                const users = JSON.parse(localStorage.getItem('nutrivalor_users') || '[]');
                const user = users.find(u => u.email === email && u.password === password);
                
                if (!user) {
                    return { data: null, error: { message: 'Invalid credentials' } };
                }
                
                const userWithoutPassword = { ...user };
                delete userWithoutPassword.password;
                localStorage.setItem('nutrivalor_current_user', JSON.stringify(userWithoutPassword));
                
                return { data: { user: userWithoutPassword }, error: null };
            },
            
            signOut: async () => {
                localStorage.removeItem('nutrivalor_current_user');
                return { error: null };
            },
            
            resetPasswordForEmail: async ({ email }) => {
                console.log('Password reset requested for:', email);
                return { data: {}, error: null };
            },
            
            getUser: async () => {
                const user = JSON.parse(localStorage.getItem('nutrivalor_current_user') || 'null');
                return { data: { user }, error: null };
            },
            
            onAuthStateChange: (callback) => {
                // Simple implementation for localStorage fallback
                const checkAuthState = () => {
                    const user = JSON.parse(localStorage.getItem('nutrivalor_current_user') || 'null');
                    callback(user ? 'SIGNED_IN' : 'SIGNED_OUT', { user });
                };
                
                // Check immediately
                checkAuthState();
                
                // Listen for storage changes
                window.addEventListener('storage', (e) => {
                    if (e.key === 'nutrivalor_current_user') {
                        checkAuthState();
                    }
                });
                
                return {
                    data: { subscription: { unsubscribe: () => {} } }
                };
            }
        },
        
        from: (table) => ({
            select: (columns = '*') => ({
                eq: (column, value) => ({
                    async single() {
                        const data = JSON.parse(localStorage.getItem(`nutrivalor_${table}`) || '[]');
                        const item = data.find(item => item[column] === value);
                        return { data: item, error: null };
                    }
                }),
                async then(callback) {
                    const data = JSON.parse(localStorage.getItem(`nutrivalor_${table}`) || '[]');
                    const result = { data, error: null };
                    if (callback) callback(result);
                    return result;
                }
            }),
            
            insert: (newData) => ({
                async select() {
                    const data = JSON.parse(localStorage.getItem(`nutrime_${table}`) || '[]');
                    const itemWithId = { ...newData, id: generateId(), created_at: new Date().toISOString() };
                    data.push(itemWithId);
                    localStorage.setItem(`nutrime_${table}`, JSON.stringify(data));
                    return { data: [itemWithId], error: null };
                }
            }),
            
            update: (updateData) => ({
                eq: (column, value) => ({
                    async select() {
                        const data = JSON.parse(localStorage.getItem(`nutrime_${table}`) || '[]');
                        const index = data.findIndex(item => item[column] === value);
                        if (index !== -1) {
                            data[index] = { ...data[index], ...updateData, updated_at: new Date().toISOString() };
                            localStorage.setItem(`nutrime_${table}`, JSON.stringify(data));
                            return { data: [data[index]], error: null };
                        }
                        return { data: [], error: { message: 'Record not found' } };
                    }
                })
            }),
            
            delete: () => ({
                eq: (column, value) => ({
                    async execute() {
                        const data = JSON.parse(localStorage.getItem(`nutrime_${table}`) || '[]');
                        const filtered = data.filter(item => item[column] !== value);
                        localStorage.setItem(`nutrime_${table}`, JSON.stringify(filtered));
                        return { error: null };
                    }
                })
            })
        }),
        
        storage: {
            from: (bucket) => ({
                upload: async (path, file) => {
                    // Simple fallback - convert file to base64 and store in localStorage
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const images = JSON.parse(localStorage.getItem('nutrime_images') || '{}');
                            images[path] = reader.result;
                            localStorage.setItem('nutrime_images', JSON.stringify(images));
                            resolve({ data: { path }, error: null });
                        };
                        reader.readAsDataURL(file);
                    });
                },
                
                getPublicUrl: (path) => {
                    const images = JSON.parse(localStorage.getItem('nutrime_images') || '{}');
                    return { data: { publicUrl: images[path] || '' } };
                }
            })
        }
    };
}

function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Check if we're in development mode
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Configuration instructions
function showSupabaseSetupInstructions() {
    if (isDevelopment && (SUPABASE_URL.includes('your-project') || SUPABASE_ANON_KEY.includes('your-anon'))) {
        console.log(`
🔧 SUPABASE SETUP INSTRUCTIONS:

1. Go to https://supabase.com and create a new project
2. In your project dashboard, go to Settings > API
3. Copy your Project URL and Anon Key
4. Replace the values in src/js/supabase-client.js:
   - SUPABASE_URL: Replace 'https://your-project-id.supabase.co' with your Project URL
   - SUPABASE_ANON_KEY: Replace 'your-anon-key-here' with your Anon Key

5. Create the following tables in your Supabase database:

-- Users table (handled by Supabase Auth automatically)

-- Foods table
CREATE TABLE foods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    brand TEXT,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    protein DECIMAL DEFAULT 0,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meals table
CREATE TABLE meals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    carbs DECIMAL DEFAULT 0,
    fat DECIMAL DEFAULT 0,
    protein DECIMAL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping List table
CREATE TABLE shopping_list (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

6. Set up Row Level Security (RLS) policies for each table to ensure users can only access their own data.

For now, the app will work with localStorage as a fallback!
        `);
    }
}

// Initialize when the script loads
initializeSupabase();
showSupabaseSetupInstructions(); 