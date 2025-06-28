// Authentication Module for Nutrime
let currentUser = null;

// Authentication event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auth state
    checkAuthState();
    
    // Add file upload event listeners
    const foodFileInput = document.getElementById('foodFileInput');
    const mealFileInput = document.getElementById('mealFileInput');
    
    if (foodFileInput) {
        foodFileInput.addEventListener('change', handleFoodFileUpload);
    }
    
    if (mealFileInput) {
        mealFileInput.addEventListener('change', handleMealFileUpload);
    }
});

// Check current authentication state
async function checkAuthState() {
    try {
        showLoading();
        
        // Wait a bit for supabase to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!supabase) {
            // Fallback to localStorage
            const user = JSON.parse(localStorage.getItem('nutrime_current_user') || 'null');
            if (user) {
                handleAuthSuccess(user);
            } else {
                showAuthSection();
            }
            return;
        }
        
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Auth error:', error);
            showAuthSection();
            return;
        }
        
        if (data.user) {
            handleAuthSuccess(data.user);
        } else {
            showAuthSection();
        }
    } catch (error) {
        console.error('Error checking auth state:', error);
        showAuthSection();
    }
}

// Handle successful authentication
function handleAuthSuccess(user) {
    currentUser = user;
    hideLoading();
    showMainApp();
    updateUserInfo(user);
    loadUserData();
}

// Show/hide different sections
function showLoading() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingScreen').style.display = 'none';
}

function showAuthSection() {
    hideLoading();
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    hideLoading();
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
}

// Update user info in header
function updateUserInfo(user) {
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        userEmailElement.textContent = user.email || 'User';
    }
}

// Auth tab switching
function showAuthTab(tab) {
    // Remove active class from all tabs
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    
    // Hide all forms
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('forgotForm').style.display = 'none';
    
    // Show selected tab and form
    if (tab === 'login') {
        document.querySelector('.auth-tab').classList.add('active');
        document.getElementById('loginForm').style.display = 'block';
    } else if (tab === 'signup') {
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
        document.getElementById('signupForm').style.display = 'block';
    }
}

// Show forgot password form
function showForgotPassword() {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('forgotForm').style.display = 'block';
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    try {
        showLoading();
        
        if (!supabase) {
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('nutrime_users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            
            if (!user) {
                showMessage('Invalid email or password', 'error');
                showAuthSection();
                return;
            }
            
            const userWithoutPassword = { ...user };
            delete userWithoutPassword.password;
            localStorage.setItem('nutrime_current_user', JSON.stringify(userWithoutPassword));
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
        
        handleAuthSuccess(data.user);
        showMessage('Login successful!', 'success');
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage('An error occurred during login', 'error');
        showAuthSection();
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
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
            const users = JSON.parse(localStorage.getItem('nutrime_users') || '[]');
            const existingUser = users.find(u => u.email === email);
            
            if (existingUser) {
                showMessage('User already exists with this email', 'error');
                showAuthSection();
                return;
            }
            
            const user = {
                id: generateId(),
                email,
                user_metadata: { name },
                created_at: new Date().toISOString()
            };
            
            users.push({ ...user, password });
            localStorage.setItem('nutrime_users', JSON.stringify(users));
            localStorage.setItem('nutrime_current_user', JSON.stringify(user));
            handleAuthSuccess(user);
            showMessage('Account created successfully!', 'success');
            return;
        }
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
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
async function handleForgotPassword(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    
    if (!email) {
        showMessage('Please enter your email address', 'error');
        return;
    }
    
    try {
        if (!supabase) {
            showMessage('Password reset requested (localStorage mode)', 'success');
            showAuthTab('login');
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
        showMessage('An error occurred during password reset', 'error');
    }
}

// Handle logout
async function handleLogout() {
    try {
        if (!supabase) {
            localStorage.removeItem('nutrime_current_user');
            currentUser = null;
            showAuthSection();
            showMessage('Logged out successfully', 'success');
            return;
        }
        
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            console.error('Logout error:', error);
        }
        
        currentUser = null;
        showAuthSection();
        showMessage('Logged out successfully', 'success');
        
    } catch (error) {
        console.error('Logout error:', error);
        showMessage('An error occurred during logout', 'error');
    }
}

// Load user data after authentication
async function loadUserData() {
    try {
        // Load foods data
        await loadFoodsFromDatabase();
        
        // Load meals data
        await loadMealsFromDatabase();
        
        // Load shopping list
        await loadShoppingListFromDatabase();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        showMessage('Error loading user data', 'error');
    }
}

// Helper function to generate IDs (used in localStorage fallback)
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
} 