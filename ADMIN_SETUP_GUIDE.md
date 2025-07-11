# Admin Setup Guide

## Issue Summary
The Admin section was missing the "All Users" functionality and the SUPER ADMIN role for lou@schillaci.me was not properly configured.

## Root Causes
1. **Missing Database Table**: The `user_roles` table didn't exist in the database
2. **Missing User Management Functions**: The `refreshUserList`, `grantAdminRole`, and `revokeAdminRole` functions were not implemented
3. **Missing SUPER ADMIN Setup**: No mechanism to grant SUPER ADMIN role to lou@schillaci.me

## Solution

### Step 1: Create the User Roles Table
Run the following SQL in your Supabase database:

```sql
-- Run this in Supabase SQL Editor
-- File: create-user-roles-table.sql
```

This creates:
- `user_roles` table with proper constraints
- RLS policies for security
- Automatic role assignment for new users
- Indexes for performance

### Step 2: Set Up SUPER ADMIN Role
After logging in as lou@schillaci.me at least once, run:

```sql
-- Run this in Supabase SQL Editor
-- File: setup-super-admin.sql
```

This will:
- Find the user ID for lou@schillaci.me
- Grant SUPER ADMIN role
- Verify the setup

### Step 3: Verify the Setup
1. Log in as lou@schillaci.me
2. Navigate to the Admin section
3. You should see:
   - "SUPER ADMIN" badge in the top right
   - "All Users" section with user management
   - Ability to grant/revoke admin roles

## New Features Added

### User Management Interface
- **All Users List**: Shows all registered users with their roles
- **Role Management**: Grant/revoke admin roles (SUPER ADMIN only)
- **User Status**: Shows confirmation status and last login
- **Real-time Updates**: Refresh button to update the list

### Admin Functions
- `refreshUserList()`: Load and display all users
- `grantAdminRole(userId)`: Grant admin role to a user
- `revokeAdminRole(userId)`: Revoke admin role from a user
- `debugAdminStatus()`: Debug admin functionality

### Security Features
- **Row Level Security**: Only SUPER ADMINS can manage user roles
- **Role-based Access**: Different permissions for different roles
- **Audit Trail**: Tracks who granted roles and when

## Testing

### Test Files Created
1. `test-admin-functionality.html` - Test admin functions
2. `test-edit-meal.html` - Test edit meal functionality

### Manual Testing Steps
1. **Database Setup**:
   - Run `create-user-roles-table.sql`
   - Log in as lou@schillaci.me
   - Run `setup-super-admin.sql`

2. **Admin Section**:
   - Navigate to Admin section
   - Verify SUPER ADMIN badge appears
   - Check "All Users" section loads

3. **User Management**:
   - Click "Refresh" to load users
   - Test granting/revoking admin roles
   - Verify role changes persist

## Files Modified/Created

### Database Files
- `create-user-roles-table.sql` - Creates user_roles table
- `setup-super-admin.sql` - Sets up SUPER ADMIN role

### Code Files
- `src/js/admin.ts` - Added user management functions
- `src/js/auth.ts` - Added debug functions to window
- `src/styles/main.css` - Added admin message styles

### Test Files
- `test-admin-functionality.html` - Admin function tests
- `test-edit-meal.html` - Edit meal tests

## Troubleshooting

### If Admin Tab Doesn't Appear
1. Check browser console for errors
2. Verify user_roles table exists
3. Run `debugAdminStatus()` in console
4. Check if user has logged in at least once

### If User Management Doesn't Work
1. Verify SUPER ADMIN role is set
2. Check RLS policies are correct
3. Test with `refreshUserList()` in console
4. Check network tab for API errors

### If Role Changes Don't Persist
1. Check database permissions
2. Verify RLS policies
3. Check for constraint violations
4. Review audit logs

## Expected Behavior

### For SUPER ADMIN (lou@schillaci.me)
- Admin tab visible
- "SUPER ADMIN" badge displayed
- Can see all users
- Can grant/revoke admin roles
- Can manage all system data

### For Regular Users
- Admin tab hidden
- No access to user management
- Can only manage their own data

### For Admin Users (granted by SUPER ADMIN)
- Admin tab visible
- "ADMIN" badge displayed
- Can manage system data
- Cannot manage user roles

## Security Notes
- Only SUPER ADMINS can manage user roles
- All role changes are logged with audit trail
- RLS policies prevent unauthorized access
- User roles are automatically assigned on signup 