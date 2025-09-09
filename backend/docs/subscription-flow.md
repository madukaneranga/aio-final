# Subscription Management Flow Documentation

## Overview
New clean subscription management system with separated business logic and HTTP handling. No fake subscriptions, clear state management, and production-ready architecture.

## Architecture

### Service Layer (`SubscriptionService.js`)
- **Purpose**: Pure business logic for subscription operations
- **Responsibilities**: Database operations, validation, business rules
- **No HTTP concerns**: Returns data or throws business exceptions

### Controller Layer (`SubscriptionController.js`)
- **Purpose**: HTTP request/response handling
- **Responsibilities**: Request validation, response formatting, error handling
- **No business logic**: Delegates to service layer

## Core Entities

### Subscription States
```javascript
const SUBSCRIPTION_STATES = {
  ACTIVE: 'active',       // User has paid, subscription is valid
  CANCELLED: 'cancelled', // User cancelled, expires at endDate
  EXPIRED: 'expired'      // Subscription has ended
}
```

### Package Information
```javascript
// Packages define subscription tiers
{
  name: 'basic|standard|premium',
  amount: Number,         // Monthly price in LKR
  features: [String],     // Feature list
  limits: {
    items: Number,
    analytics: Boolean,
    // ... other feature limits
  }
}
```

## API Endpoints

### 1. Get Current Subscription
```http
GET /api/subscriptions/subscription
Authorization: Bearer <token>
```

**Response - Has Subscription:**
```json
{
  "success": true,
  "data": {
    "_id": "subscription_id",
    "userId": "user_id",
    "package": "basic",
    "amount": 1500,
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z",
    "lastUpgradeAt": null
  }
}
```

**Response - No Subscription:**
```json
{
  "success": false,
  "message": "No active subscription found",
  "code": "NO_SUBSCRIPTION"
}
```

### 2. Create New Subscription
```http
POST /api/subscriptions/subscription
Authorization: Bearer <token>
Content-Type: application/json

{
  "packageName": "basic"
}
```

**Response - Success:**
```json
{
  "success": true,
  "data": {
    "_id": "new_subscription_id",
    "userId": "user_id", 
    "package": "basic",
    "amount": 1500,
    "status": "active",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z"
  }
}
```

**Response - Already Has Subscription:**
```json
{
  "success": false,
  "message": "User already has active subscription",
  "code": "SUBSCRIPTION_EXISTS"
}
```

### 3. Upgrade Subscription
```http
PUT /api/subscriptions/subscription/upgrade
Authorization: Bearer <token>
Content-Type: application/json

{
  "packageName": "premium"
}
```

**Response - Success:**
```json
{
  "success": true,
  "data": {
    "_id": "subscription_id",
    "package": "premium", 
    "amount": 3500,
    "lastUpgradeAt": "2024-01-15T00:00:00.000Z"
  }
}
```

**Response - Downgrade Cooldown:**
```json
{
  "success": false,
  "message": "You can downgrade only after 2 months from your last package change",
  "code": "DOWNGRADE_COOLDOWN",
  "data": {
    "nextAvailableDate": "2024-03-15T00:00:00.000Z"
  }
}
```

### 4. Cancel Subscription
```http
DELETE /api/subscriptions/subscription
Authorization: Bearer <token>
```

**Response - Success:**
```json
{
  "success": true,
  "message": "Subscription cancelled successfully",
  "data": {
    "status": "cancelled",
    "validUntil": "2024-02-01T00:00:00.000Z"
  }
}
```

## Business Rules

### 1. Subscription Creation
- User can only have one active subscription
- Must select valid package name
- Subscription starts immediately upon creation
- EndDate = StartDate + 1 month

### 2. Package Upgrades
- Can upgrade to any higher-tier package immediately
- Downgrades have 2-month cooldown period
- Package change updates amount and lastUpgradeAt
- Subscription period continues unchanged

### 3. Subscription Cancellation
- Sets status to 'cancelled'
- Subscription remains valid until endDate
- User retains access until expiry
- Cannot reactivate cancelled subscription

### 4. Package Validation
- Package must exist in database
- Package must be different from current package
- Downgrade cooldown enforced (2 months)

## Service Layer Methods

### SubscriptionService Class

```javascript
class SubscriptionService {
  // Core Operations
  async getActiveSubscription(userId)        // Returns subscription or null
  async createSubscription(userId, packageName) // Creates new subscription  
  async upgradeSubscription(userId, packageName) // Updates existing subscription
  async cancelSubscription(userId)           // Marks subscription as cancelled
  
  // Validation Methods
  async validatePackageExists(packageName)   // Throws if package not found
  async validatePackageUpgrade(currentPkg, newPkg, lastUpgrade) // Validates upgrade rules
  async checkDowngradeCooldown(lastUpgrade, targetPackage) // Enforces 2-month rule
  
  // Utility Methods
  calculateEndDate(startDate)                // Adds 1 month to start date
  isValidPackageChange(fromPkg, toPkg)      // Checks if change is allowed
  findSubscriptionByUser(userId)            // Database query helper
}
```

## Controller Layer Methods

### SubscriptionController Class

```javascript
class SubscriptionController {
  // HTTP Endpoints
  getSubscription = async (req, res)      // GET /subscription
  createSubscription = async (req, res)   // POST /subscription
  upgradeSubscription = async (req, res)  // PUT /subscription/upgrade  
  cancelSubscription = async (req, res)   // DELETE /subscription
  
  // Admin Endpoints
  getAllSubscriptions = async (req, res)  // GET /admin/subscriptions
  getSubscriptionStats = async (req, res) // GET /admin/stats
}
```

## Error Handling

### Service Layer Errors (Business Exceptions)
```javascript
// Thrown by service, caught by controller
throw new Error('No active subscription found')
throw new Error('User already has active subscription')  
throw new Error('Package not found')
throw new Error('Cannot downgrade within cooldown period')
throw new Error('Cannot upgrade to same package')
```

### Controller Layer Error Mapping
```javascript
// Maps service errors to HTTP responses
'No active subscription found' → 404
'User already has active subscription' → 409  
'Package not found' → 400
'Cannot downgrade within cooldown period' → 403
'Cannot upgrade to same package' → 400
```

## Data Flow Examples

### 1. New User Flow
```
1. User visits subscription page
2. Frontend calls GET /subscription → 404 "No active subscription" 
3. User selects package and clicks subscribe
4. Frontend calls POST /subscription { packageName: 'basic' }
5. Service creates subscription with amount from package
6. Returns 201 with subscription data
7. Frontend shows success and active subscription
```

### 2. Upgrade Flow
```
1. User has active 'basic' subscription
2. User selects 'premium' package
3. Frontend calls PUT /subscription/upgrade { packageName: 'premium' }
4. Service validates upgrade (no cooldown for upgrades)
5. Updates subscription.package = 'premium', amount = 3500
6. Returns 200 with updated subscription
7. Frontend shows upgraded subscription immediately
```

### 3. Downgrade with Cooldown
```
1. User has 'premium' subscription, upgraded 1 month ago
2. User tries to downgrade to 'basic'
3. Frontend calls PUT /subscription/upgrade { packageName: 'basic' }
4. Service checks cooldown: 1 month < 2 months required
5. Returns 403 with next available downgrade date
6. Frontend shows error with waiting period
```

## Integration Points

### Frontend Integration
- **No fake data**: Show "No Subscription" when API returns 404
- **Clear states**: Loading, Error, Success with proper feedback
- **Package selection**: Use real package data from /api/packages
- **Error handling**: Display specific error messages from API

### Database Integration  
- **No defaults**: Subscription model has no default amounts
- **Real relationships**: Proper foreign keys to User and Package
- **Clean queries**: Use service layer for all database operations

### getUserPackage Integration
- **No auto-creation**: Returns null when no subscription exists
- **Real data only**: Uses actual subscription data when available
- **Clean fallback**: Basic package info for display purposes only

## Migration from Old System

### Removed Complexity
- ❌ Complex upgrade/rollback states
- ❌ Fake subscription creation  
- ❌ Mixed payment/subscription logic
- ❌ Debugging logs in business logic
- ❌ Default subscription amounts

### New Simplicity  
- ✅ Clear active/cancelled/expired states
- ✅ Real subscription data only
- ✅ Separated business/HTTP concerns
- ✅ Clean error handling
- ✅ Production-ready validation