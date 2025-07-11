import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Supabase Configuration
// Get them from: https://app.supabase.com/project/[your-project]/settings/api
const SUPABASE_URL = 'https://ehutpsrutyiorhqrwstz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVodXRwc3J1dHlpb3JocXJ3c3R6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTMyNzQsImV4cCI6MjA2NjY4OTI3NH0.lcfz59Uc2S6q9Mn2lj2OC_WAMG5CncrNbEnHX7MFTeI';

// INSTRUCTIONS: 
// 1. Go to https://app.supabase.com/project/ehutpsrutyiorhqrwstz/editor
// 2. Run the SQL script from database-setup.sql to create the tables
// 3. The application will automatically connect to your Supabase database

// Initialize Supabase client
export let supabase: SupabaseClient | null = null;

// Storage interface for consistent API
export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// Initialize Supabase or fall back to localStorage
export function initializeSupabase(): void {
  // Prevent multiple client instances
  if (supabase) {
    return;
  }
  
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    supabase = null;
  }
}

// LocalStorage wrapper that mimics Supabase interface
export const localStorageWrapper: Storage = {
  getItem: (key: string) => localStorage.getItem(`nutrivalor_${key}`),
  setItem: (key: string, value: string) => localStorage.setItem(`nutrivalor_${key}`, value),
  removeItem: (key: string) => localStorage.removeItem(`nutrivalor_${key}`)
};

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }
  // Fallback to localStorage
  return !!localStorageWrapper.getItem('currentUser');
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      return null;
    }
  }
  // Fallback to localStorage
  const userData = localStorageWrapper.getItem('currentUser');
  return userData ? JSON.parse(userData) : null;
} 