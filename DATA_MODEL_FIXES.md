# Data Model Fixes - Artisan vs User Separation

## Problem Identified
The application had inconsistent data model usage where:
- Some services were updating the `artisan` table
- Other functions were updating the `users` table
- Users with role "artisan" existed in both tables with overlapping data
- Registration and login functions weren't properly separating concerns

## Solution Implemented

### 1. Data Model Separation
- **Users Table**: Contains basic user information (firstName, lastName, email, password, role, addresses, paymentMethods)
- **Artisan Table**: Contains business-specific information (artisanName, type, deliveryOptions, pickupLocation, etc.)
- **Relationship**: Artisan table has a `user` field that references the User table

### 2. Migration Completed
- Successfully migrated 18 existing users with role "artisan" to the artisan table
- Created artisan profiles for users who didn't have them
- Maintained data integrity during migration

### 3. Backend API Updates

#### New Endpoints
- `POST /api/auth/register/artisan` - Dedicated artisan registration
- Enhanced `POST /api/auth/register` - Supports artisan data

#### Registration Flow
- **Patron Registration**: Creates user in users table only
- **Artisan Registration**: Creates user in users table + artisan profile in artisan table

### 4. Frontend Updates

#### Registration Component
- Added artisan-specific form fields (business name, type, description)
- Conditional rendering based on selected role
- Proper data preparation for artisan registration

#### Auth Service
- Updated to use appropriate registration endpoint based on role
- Handles artisan-specific data properly
- Returns both user and artisan information

### 5. Data Consistency Rules

#### Users Table Updates
- Basic profile information (name, email, phone)
- Addresses and payment methods
- Account settings and preferences
- Role and authentication data

#### Artisan Table Updates
- Business name and description
- Business type and category
- Delivery options and pickup details
- Business hours and location
- Professional delivery settings

### 6. Benefits of New Structure

1. **Clear Separation of Concerns**: User data vs business data
2. **Scalability**: Artisan profiles can be extended without affecting user data
3. **Data Integrity**: No more duplicate or conflicting data
4. **Better Performance**: Proper indexing and relationships
5. **Easier Maintenance**: Clear data flow and update patterns

### 7. Migration Results
- ✅ **18 users migrated** from users table to artisan table
- ✅ **12 new artisan profiles created** for existing users
- ✅ **6 artisan profiles already existed** (skipped)
- ✅ **0 failures** during migration
- ✅ **Total artisans in database**: 29

### 8. Testing Recommendations

1. **Test Patron Registration**: Ensure basic user creation works
2. **Test Artisan Registration**: Verify both user and artisan profile creation
3. **Test Login Flow**: Confirm authentication works for both user types
4. **Test Profile Updates**: Verify updates go to correct tables
5. **Test Data Retrieval**: Ensure proper data is returned from both tables

## Files Modified

### Backend
- `src/routes/auth.js` - Added artisan registration endpoint
- `src/routes/profile.js` - Verified artisan profile updates
- `src/models/user.js` - Confirmed user schema
- `src/models/artisan.js` - Confirmed artisan schema

### Frontend
- `src/components/register.jsx` - Added artisan form fields
- `src/services/authservice.js` - Updated registration logic

## Next Steps

1. **Test the new registration flow** thoroughly
2. **Monitor data consistency** in production
3. **Update any remaining services** that might still reference old patterns
4. **Consider adding validation** to prevent data inconsistencies
5. **Document the new data model** for development team

## Data Flow Summary

```
Patron Registration:
User Input → /api/auth/register → Users Table → Success

Artisan Registration:
User Input → /api/auth/register/artisan → Users Table + Artisan Table → Success

Profile Updates:
User Profile → /api/profile → Users Table
Artisan Profile → /api/profile/artisan → Artisan Table

Data Retrieval:
User Data → Users Table
Artisan Data → Artisan Table (with user reference)
Combined Data → Populated queries joining both tables
```
