# Subscription Debugging Guide

## Issue: Subscription Amount Showing as 0

The subscription amount is appearing as 0 when users try to subscribe. This guide outlines the debugging steps and logs added to identify the root cause.

## Debugging Logs Added

### 1. Package Retrieval Debugging (subscriptionController.js:157-182)
- **Log**: Package lookup by name
- **Log**: Full package data retrieved from database
- **Validation**: Check if package amount is valid (> 0)
- **Error**: Return 400 if package amount is invalid

### 2. Subscription Creation Debugging (subscriptionController.js:190-206)
- **Log**: Amount being used for new subscription creation
- **Log**: Confirmation after subscription is saved with final amount

### 3. Payment Processing Debugging (subscriptionController.js:210-252)
- **Log**: Amount being prepared for PayHere hash generation
- **Log**: Final amount being sent to PayHere
- **Summary**: Complete payment summary with all amounts tracked

### 4. Upgrade Process Debugging (subscriptionController.js:737-745)
- **Log**: Package lookup for upgrades
- **Log**: Both current and selected package amounts

## Testing Steps

### 1. Check Database Packages
```bash
cd backend
node debug/checkPackages.js
```
This will:
- List all packages in database
- Show their amounts
- Identify any packages with invalid amounts (0 or null)

### 2. Test Subscription Creation
1. Start backend server with logging
2. Attempt to create a subscription
3. Monitor console logs for:
   - `🔍 Looking for package: "packageName"`
   - `📦 Package lookup result:`
   - `💰 Package amount: X`
   - `💳 Creating new subscription with amount: X`
   - `✅ Subscription created with ID: X, Amount: X`
   - `💰 Final payment amount being sent to PayHere: X`

### 3. Expected Log Flow
```
🔍 Looking for package: "basic"
📦 Package lookup result: {
  packageName: 'basic',
  found: true,
  packageData: { name: 'basic', amount: 1500, ... }
}
💰 Package amount: 1500
💳 Creating new subscription with amount: 1500
✅ Subscription created with ID: 12345, Amount: 1500
🔢 Preparing payment with subscription amount: 1500
🔐 Generated hash for amount: 1500
💰 Final payment amount being sent to PayHere: 1500.00
📋 Payment summary: {
  subscriptionId: '12345',
  packageName: 'basic',
  originalAmount: 1500,
  subscriptionAmount: 1500,
  paymentAmount: '1500.00'
}
```

## Potential Root Causes

### 1. Database Issues
- Packages don't exist in database
- Packages exist but have amount: 0
- Package names don't match (case sensitivity)

### 2. Model Default Issues
- Package model default amount (currently 1500)
- Subscription model default amount (currently 1000)

### 3. Frontend Issues
- Wrong package name being sent
- Package name formatting issues

### 4. Controller Logic Issues
- Package lookup failing silently
- Amount not being properly transferred

## Next Steps

1. **Run the database check script** when MongoDB is available
2. **Test subscription creation** and monitor all logs
3. **Compare logs** with expected flow above
4. **Identify** where the amount becomes 0
5. **Fix** the specific issue found

## Error Scenarios to Watch For

- `❌ Package not found: "packageName"` - Package doesn't exist
- `❌ Invalid package amount:` - Package has 0 or null amount
- Any mismatch between logged amounts in the flow