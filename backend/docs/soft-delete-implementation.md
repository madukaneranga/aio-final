# PendingSubscription Soft Delete Implementation

## 🎯 **Implementation Complete**

Added `isActive` field to PendingSubscription model for soft delete functionality with intelligent handling of existing pending subscriptions and package changes.

## 🔄 **Enhanced Flow**

### Scenario 1: Same Package Request
```
User has: PendingSubscription(basic, isActive: true)
User requests: basic package
Result: Returns existing pending subscription (no new record created)
```

### Scenario 2: Different Package Request
```
User has: PendingSubscription(basic, isActive: true)
User requests: premium package
Result: 
1. Set existing.isActive = false (soft delete)
2. Create new PendingSubscription(premium, isActive: true)
```

### Scenario 3: No Active Pending
```
User has: PendingSubscription(basic, isActive: false) OR none
User requests: premium package
Result: Create new PendingSubscription(premium, isActive: true)
```

### Scenario 4: Successful Payment
```
PayHere IPN arrives for PSUB_123
Result:
1. Find PendingSubscription(orderId: PSUB_123, isActive: true)
2. Create actual Subscription
3. Set PendingSubscription.isActive = false (soft delete)
```

## 📊 **Database Changes**

### PendingSubscription Model Updates
```javascript
{
  // ... existing fields ...
  isActive: {
    type: Boolean,
    default: true,  // New records are active by default
  }
}

// New indexes for efficient querying
schema.index({ isActive: 1 });
schema.index({ userId: 1, isActive: 1 });
```

## 🔧 **Code Changes**

### 1. **createSubscription Service Logic**
```javascript
// Find existing active pending subscription
const existingPending = await PendingSubscription.findOne({ 
  userId, 
  isActive: true 
});

if (existingPending) {
  if (existingPending.packageName === packageName) {
    // Same package - return existing
    return { pendingSubscription: existingPending, ... };
  } else {
    // Different package - soft delete existing
    existingPending.isActive = false;
    await existingPending.save();
    // Then create new one...
  }
}
```

### 2. **IPN Processing Logic**
```javascript
// Only process active pending subscriptions
const pendingSubscription = await PendingSubscription.findOne({ 
  orderId: order_id,
  isActive: true 
});

// After successful processing
if (status_code === "2") {
  // Create actual subscription...
  
  // Soft delete pending subscription
  pendingSubscription.isActive = false;
  await pendingSubscription.save();
}
```

## 🎯 **Benefits Achieved**

### ✅ **Duplicate Prevention**
- Only one active pending subscription per user at any time
- Same package requests return existing pending subscription
- No unnecessary duplicate records created

### ✅ **Package Change Handling**
- Different package requests properly soft delete old pending subscription
- Clean transition between package choices
- Maintains payment flow continuity

### ✅ **External Cleanup Control**
- Active records (`isActive: true`) are operational
- Inactive records (`isActive: false`) are ready for external cleanup
- Clear separation between active and processed/abandoned records

### ✅ **Payment Processing Safety**
- Only active pending subscriptions can be processed via IPN
- Prevents processing of old/stale pending subscriptions
- Automatic soft delete after successful payment

## 📋 **Query Patterns**

### Find Active Pending Subscription
```javascript
PendingSubscription.findOne({ userId, isActive: true })
```

### Find for IPN Processing
```javascript
PendingSubscription.findOne({ orderId, isActive: true })
```

### Find Records Ready for Cleanup
```javascript
PendingSubscription.find({ isActive: false })
```

### Soft Delete Operation
```javascript
pendingSubscription.isActive = false;
await pendingSubscription.save();
```

## 🔄 **Complete User Journey**

1. **First Request**: `POST /subscriptions` (basic) → Creates `PendingSubscription(basic, isActive: true)`
2. **Same Request**: `POST /subscriptions` (basic) → Returns existing pending subscription
3. **Package Change**: `POST /subscriptions` (premium) → Soft deletes basic, creates `PendingSubscription(premium, isActive: true)`
4. **Payment**: PayHere IPN → Creates actual `Subscription`, soft deletes pending
5. **Cleanup**: External process targets records where `isActive: false`

## 🧪 **Testing Results**

✅ **Model Validation**: isActive field works correctly (default: true)  
✅ **Service Logic**: Handles same/different package scenarios  
✅ **IPN Processing**: Only processes active pending subscriptions  
✅ **Database Queries**: Efficient indexing for isActive field  
✅ **Soft Delete**: Proper state transitions from active to inactive  

## 🚀 **Implementation Status: COMPLETE**

The soft delete functionality has been successfully implemented with:
- ✅ `isActive` field added to PendingSubscription model
- ✅ Intelligent handling of existing pending subscriptions
- ✅ Package change management with soft delete
- ✅ IPN processing limited to active records only
- ✅ Automatic soft delete after successful payment
- ✅ External cleanup targeting for inactive records

**Ready for production deployment with enhanced pending subscription management.**