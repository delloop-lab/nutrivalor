# Nutrime - Food Tracking Web Application

A modern, responsive web application for tracking food nutrition, managing meal plans, and organizing shopping lists. Built with vanilla JavaScript and designed to work with Supabase for database and authentication.

## 🚀 Features

- **User Authentication**: Secure signup/login with Supabase Auth
- **Food Tracking**: Upload and manage food databases with nutritional information
- **Meal Planning**: Create and organize meal plans with nutritional breakdowns
- **Shopping Lists**: Smart shopping lists with quantity management and nutritional totals
- **Analytics**: Visual nutrition analytics with charts and insights
- **Excel Integration**: Import food and meal data from Excel files
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Offline Support**: Works with localStorage fallback when offline

## 🛠️ Setup Instructions

### Prerequisites
- A modern web browser
- [Supabase](https://supabase.com) account (optional - app works with localStorage fallback)

### Quick Start (Development)
1. Clone/download this repository to your local machine
2. Open `index.html` in a web browser
3. The app will work immediately with localStorage as the database

### Production Setup with Supabase

#### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be set up

#### 2. Configure Authentication
1. In your Supabase dashboard, go to Authentication > Settings
2. Configure your site URL and any additional providers you want

#### 3. Create Database Tables
Run these SQL commands in your Supabase SQL editor:

```sql
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

-- Enable Row Level Security
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list ENABLE ROW LEVEL SECURITY;

-- Create policies for foods table
CREATE POLICY "Users can view own foods" ON foods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own foods" ON foods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own foods" ON foods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own foods" ON foods FOR DELETE USING (auth.uid() = user_id);

-- Create policies for meals table
CREATE POLICY "Users can view own meals" ON meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals" ON meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals" ON meals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals" ON meals FOR DELETE USING (auth.uid() = user_id);

-- Create policies for shopping_list table
CREATE POLICY "Users can view own shopping_list" ON shopping_list FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shopping_list" ON shopping_list FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shopping_list" ON shopping_list FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shopping_list" ON shopping_list FOR DELETE USING (auth.uid() = user_id);
```

#### 4. Configure the App
1. Open `src/js/supabase-client.js`
2. Replace the placeholder values:
   ```javascript
   const SUPABASE_URL = 'https://your-project-id.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key-here';
   ```
3. Get these values from your Supabase project Settings > API

#### 5. Deploy
Deploy your app to any static hosting service:
- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [GitHub Pages](https://pages.github.com)
- Any other static hosting provider

## 📱 How to Use

### 1. Authentication
- Create an account or login with existing credentials
- All your data is private and secure

### 2. Food Tracking
- Click "Upload Food Data" to import your food database from Excel
- Excel format: `Food Item | Brand | Carbs | Fat | Protein | Category`
- Browse and filter foods by category
- Add foods to your shopping list with quantities

### 3. Meals
- Upload meal data from Excel files
- Add meals to your daily meal plan
- View nutritional breakdowns by meal type

### 4. Shopping Lists
- Add foods from the Food Tracker
- Adjust quantities with +/- buttons
- View nutritional totals for your entire list
- Clear list when done shopping

### 5. Meal Planning
- Generate automatic meal plans
- Manually add meals to specific meal types
- View daily nutritional summaries

### 6. Analytics
- View nutrition breakdown charts
- Export detailed nutrition reports
- Get insights about your macro distribution

## 📁 Project Structure

```
nutrime/
├── index.html              # Main application file
├── package.json            # Project dependencies
├── README.md              # This file
└── src/
    ├── assets/
    │   └── nutrime.png    # Application logo
    ├── styles/
    │   └── main.css       # Application styles
    └── js/
        ├── supabase-client.js  # Supabase configuration
        ├── auth.js            # Authentication logic
        ├── database.js        # Database operations
        ├── food-tracker.js    # Food tracking functionality
        ├── meals.js           # Meal management
        ├── analytics.js       # Analytics and charts
        └── main.js           # Main application logic
```

## 🔧 Technical Details

### Technologies Used
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: Supabase (PostgreSQL) with localStorage fallback
- **Authentication**: Supabase Auth
- **Charts**: Chart.js
- **Excel Parsing**: SheetJS (xlsx)
- **Design**: Modern CSS with gradients and responsive layout

### Browser Support
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Data Storage
- **Production**: Supabase (cloud PostgreSQL database)
- **Development/Offline**: Browser localStorage
- **File Uploads**: Excel files parsed client-side

## 🔒 Security Features

- User authentication with Supabase Auth
- Row Level Security (RLS) policies
- User data isolation
- Secure API endpoints
- No sensitive data in localStorage

## 🚧 Development

### Local Development
1. Clone the repository
2. Open `index.html` in a browser
3. The app will work with localStorage immediately
4. Set up Supabase for production features

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you need help setting up or using Nutrime:
1. Check the browser console for any error messages
2. Ensure your Supabase configuration is correct
3. Try using the app with localStorage fallback first
4. Check that your Excel files are in the correct format

## 📈 Future Enhancements

- Recipe builder with automatic nutrition calculation
- Barcode scanning for quick food entry
- Integration with fitness trackers
- Meal photo uploads
- Social sharing features
- Advanced analytics and trends
- Mobile app versions

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Nutrime** - Your Personal Food Tracking Companion 🥗✨ 