# Subscription API Documentation

## Base URL
```
/api/subscriptions
```

## Authentication
All endpoints (except IPN) require:
- **Authentication**: Bearer JWT token in Authorization header or cookie
- **Authorization**: `store_owner` role (admin endpoints require `admin` role)

## Endpoints Overview

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/subscription` | Get current user subscription | ✅ | store_owner |
| POST | `/` | Create new subscription | ✅ | store_owner |
| PUT | `/upgrade` | Upgrade/downgrade subscription | ✅ | store_owner |
| POST | `/cancel` | Cancel subscription | ✅ | store_owner |
| POST | `/rollback` | Rollback failed upgrade | ✅ | store_owner |
| POST | `/ipn` | PayHere IPN webhook | ❌ | public |
| GET | `/admin/all` | Get all subscriptions (admin) | ✅ | admin |
| GET | `/admin/stats` | Get subscription statistics (admin) | ✅ | admin |

---

## 📋 User Endpoints

### 1. Get Current Subscription
```http
GET /api/subscriptions/subscription
```

**Authentication**: Required (store_owner)

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "676...",
      "userId": "675...",
      "storeId": "675...",
      "package": "premium",
      "amount": 2500,
      "currency": "LKR",
      "status": "active",
      "plan": "monthly",
      "startDate": "2024-12-24T10:00:00.000Z",
      "endDate": "2025-01-24T10:00:00.000Z",
      "recurrenceId": "PH_SUB_123456",
      "paymentHistory": [
        {
          "amount": 2500,
          "currency": "LKR",
          "paidAt": "2024-12-24T10:00:00.000Z",
          "localPaymentId": "PH_PAY_789",
          "status": "completed",
          "paymentMethod": "payhere"
        }
      ],
      "lastUpgradeAt": "2024-12-20T08:00:00.000Z",
      "createdAt": "2024-12-24T10:00:00.000Z"
    },
    "isSubscribed": true
  },
  "message": "Subscription retrieved successfully"
}
```

**Response No Subscription (404)**:
```json
{
  "success": false,
  "message": "No active subscription found",
  "status": 404,
  "errorCode": "NO_SUBSCRIPTION"
}
```

---

### 2. Create New Subscription
```http
POST /api/subscriptions/
```

**Authentication**: Required (store_owner)

**Request Body**:
```json
{
  "packageName": "premium"
}
```

**Request Validation**:
- `packageName`: Required, string, must be one of: "basic", "standard", "pro", "premium"

**Response Success (201)**:
```json
{
  "success": true,
  "data": {
    "pendingSubscription": {
      "_id": "676...",
      "userId": "675...",
      "storeId": "675...",
      "packageName": "premium",
      "amount": 2500,
      "currency": "LKR",
      "orderId": "PSUB_1703412345678_675...",
      "userInfo": {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "0771234567"
      },
      "storeName": "John's Store",
      "createdAt": "2024-12-24T10:00:00.000Z"
    },
    "paymentParams": {
      "sandbox": true,
      "merchant_id": "1231188",
      "return_url": "https://aiocart.lk/dashboard",
      "cancel_url": "https://aiocart.lk/dashboard",
      "notify_url": "https://aio-backend-x770.onrender.com/api/subscriptions/ipn",
      "order_id": "PSUB_1703412345678_675...",
      "items": "Monthly Subscription for Store Name",
      "currency": "LKR",
      "amount": "2500.00",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "0771234567",
      "address": "123 Main St",
      "city": "Colombo",
      "country": "Sri Lanka",
      "recurrence": "1 Month",
      "duration": "Forever",
      "hash": "A1B2C3D4E5F6..."
    }
  },
  "message": "Pending subscription created - complete payment to activate",
  "status": 201
}
```

**Response Errors**:
```json
// User already has active subscription (409)
{
  "success": false,
  "message": "User already has active subscription",
  "status": 409,
  "errorCode": "SUBSCRIPTION_EXISTS"
}

// Invalid package (400)
{
  "success": false,
  "message": "Package 'invalid' not found",
  "status": 400,
  "errorCode": "NOT_FOUND"
}

// No store found (400)
{
  "success": false,
  "message": "User must have a store to create subscription",
  "status": 400,
  "errorCode": "NO_STORE"
}
```

---

### 3. Upgrade/Downgrade Subscription
```http
PUT /api/subscriptions/upgrade
```

**Authentication**: Required (store_owner)

**Request Body**:
```json
{
  "packageName": "pro"
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Subscription upgrade initiated safely. Your current subscription remains active until payment is confirmed.",
    "subscriptionId": "676...",
    "upgradeAttemptId": "UPG_1703412345678_675...",
    "paymentParams": {
      "sandbox": true,
      "merchant_id": "1231188",
      "order_id": "SUB_676..._UPG_1703412345678_675...",
      "amount": "3500.00",
      "currency": "LKR",
      "items": "Subscription Upgrade to Pro for Store Name",
      "hash": "A1B2C3D4E5F6...",
      "recurrence": "1 Month",
      "duration": "Forever"
    },
    "paymentRequired": true,
    "safeUpgrade": true
  },
  "message": "Subscription updated successfully"
}
```

**Response Downgrade Cooldown (403)**:
```json
{
  "success": false,
  "message": "You can downgrade only after 2 months from your last package change. 45 days remaining.",
  "status": 403,
  "errorCode": "DOWNGRADE_COOLDOWN"
}
```

**Response Same Package (400)**:
```json
{
  "success": false,
  "message": "You are already on this package",
  "status": 400,
  "errorCode": "SAME_PACKAGE"
}
```

---

### 4. Cancel Subscription
```http
POST /api/subscriptions/cancel
```

**Authentication**: Required (store_owner)

**Request Body** (optional):
```json
{
  "subscriptionId": "676..." // Optional - if not provided, finds by userId
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "status": "cancelled",
    "validUntil": "2025-01-24T10:00:00.000Z"
  },
  "message": "Subscription cancelled successfully"
}
```

---

### 5. Rollback Failed Upgrade
```http
POST /api/subscriptions/rollback
```

**Authentication**: Required (store_owner)

**Request Body**:
```json
{
  "upgradeAttemptId": "UPG_1703412345678_675..." // Required for validation
}
```

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "676...",
      "package": "premium", // Restored to original
      "status": "active",
      "amount": 2500
    },
    "message": "Upgrade rolled back successfully",
    "restoredPackage": "premium"
  },
  "message": "Upgrade rolled back successfully"
}
```

---

## 🔗 PayHere Integration

### 6. PayHere IPN Webhook
```http
POST /api/subscriptions/ipn
```

**Authentication**: Not required (validates signature)

**Request Body** (from PayHere):
```json
{
  "merchant_id": "1231188",
  "order_id": "SUB_676...",
  "payment_id": "PH_PAY_123456",
  "subscription_id": "PH_SUB_789012",
  "payhere_amount": "2500.00",
  "payhere_currency": "LKR",
  "status_code": "2",
  "md5sig": "A1B2C3D4E5F6G7H8I9J0..."
}
```

**Response Success (200)**:
```
OK
```

**Response Invalid Signature (400)**:
```
Invalid signature
```

**Response Error (500)**:
```
IPN Error
```

---

## 👑 Admin Endpoints

### 7. Get All Subscriptions (Admin)
```http
GET /api/subscriptions/admin/all
```

**Authentication**: Required (admin)

**Query Parameters** (optional):
- `status`: Filter by status (active, cancelled, pending, expired)
- `package`: Filter by package (basic, standard, pro, premium)

**Example**: `/api/subscriptions/admin/all?status=active&package=premium`

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "subscriptions": [
      {
        "_id": "676...",
        "userId": {
          "_id": "675...",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "storeId": {
          "_id": "675...",
          "name": "John's Store"
        },
        "package": "premium",
        "amount": 2500,
        "status": "active",
        "startDate": "2024-12-24T10:00:00.000Z",
        "endDate": "2025-01-24T10:00:00.000Z",
        "createdAt": "2024-12-24T10:00:00.000Z"
      }
    ],
    "count": 1
  }
}
```

---

### 8. Get Subscription Statistics (Admin)
```http
GET /api/subscriptions/admin/stats
```

**Authentication**: Required (admin)

**Response Success (200)**:
```json
{
  "success": true,
  "data": {
    "byStatus": [
      {
        "_id": "active",
        "count": 150,
        "totalRevenue": 375000
      },
      {
        "_id": "cancelled",
        "count": 25,
        "totalRevenue": 62500
      }
    ],
    "byPackage": [
      {
        "_id": "basic",
        "count": 50,
        "revenue": 75000
      },
      {
        "_id": "premium",
        "count": 75,
        "revenue": 187500
      }
    ],
    "totalActive": 150
  }
}
```

---

## 🚨 Error Responses

### HTTP Status Codes
- **200**: Success
- **201**: Created (new subscription)
- **400**: Bad Request (validation errors, invalid package, etc.)
- **401**: Unauthorized (no auth token)
- **403**: Forbidden (insufficient permissions, cooldown violations)
- **404**: Not Found (no subscription, user not found)
- **409**: Conflict (already has subscription, same package)
- **500**: Internal Server Error

### Error Response Format
```json
{
  "success": false,
  "message": "Error message",
  "status": 400,
  "errorCode": "ERROR_CODE"
}
```

### Error Codes
- `NO_SUBSCRIPTION`: No active subscription found
- `SUBSCRIPTION_EXISTS`: User already has active subscription
- `SAME_PACKAGE`: Already on the requested package
- `DOWNGRADE_COOLDOWN`: Must wait before downgrading
- `NO_STORE`: User must have a store
- `NOT_FOUND`: Package/resource not found
- `VALIDATION_ERROR`: Request validation failed

---

## 🔒 Security Features

1. **JWT Authentication**: All user endpoints require valid JWT
2. **Role-based Access**: Store owner vs admin permissions
3. **PayHere Signature Validation**: IPN requests verified with MD5 signature
4. **Input Validation**: All request bodies validated
5. **Rate Limiting**: Built into middleware
6. **CORS Protection**: Configured for specific origins

---

## 📊 Data Models

### PendingSubscription Model
Temporary data structure used before payment confirmation with soft delete capability:

```javascript
{
  "_id": "676...",
  "userId": "675...",        // User creating subscription
  "storeId": "675...",       // Store for subscription
  "packageName": "premium",  // Requested package
  "amount": 2500,           // Package price
  "currency": "LKR",        // Currency
  "orderId": "PSUB_1703...", // Unique PayHere order ID
  "paymentParams": {...},    // Complete PayHere parameters
  "userInfo": {             // User details for payment
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0771234567"
  },
  "storeName": "John's Store",
  "isActive": true,          // Soft delete flag (default: true)
  "createdAt": "2024-12-24T10:00:00.000Z"
}
```

**Soft Delete Behavior**:
- **Same package request**: Returns existing active pending subscription
- **Different package request**: Soft deletes existing (isActive: false), creates new
- **After successful payment**: Automatically soft deleted (isActive: false)
- **External cleanup**: Target only inactive records (isActive: false)

### Subscription Model
Actual subscription created only after successful payment:

```javascript
{
  "_id": "676...",
  "userId": "675...",
  "storeId": "675...", 
  "package": "premium",
  "amount": 2500,
  "status": "active",        // Only created with active status
  "recurrenceId": "PH_SUB_123", // PayHere subscription ID
  "paymentHistory": [...],
  "createdAt": "2024-12-24T10:00:00.000Z"
}
```

---

## 🎯 PayHere Integration Flow

### Subscription Creation Flow (Payment-First):
1. User calls `POST /api/subscriptions/` with package name
2. System creates pending subscription data (NOT actual subscription)
3. System generates PayHere payment parameters with unique order ID (PSUB_...)
4. Frontend redirects user to PayHere checkout
5. PayHere sends IPN to `/api/subscriptions/ipn` after payment
6. System validates signature and creates actual subscription only on successful payment
7. Pending subscription data remains for external cleanup

### Upgrade Flow:
1. User calls `PUT /api/subscriptions/upgrade` with new package
2. System initiates safe upgrade (backing up original data)
3. System generates PayHere payment parameters
4. User completes payment at PayHere
5. PayHere sends IPN with upgrade order ID
6. System completes upgrade and cancels old PayHere subscription

### Cancellation Flow:
1. User calls `POST /api/subscriptions/cancel`
2. System calls PayHere API to cancel recurring subscription
3. System marks local subscription as cancelled
4. Subscription remains valid until end date