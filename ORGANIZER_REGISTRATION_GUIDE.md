# 🎯 Organizer Registration Parameters Guide

## ✅ **How to Create Organizer Registration Parameters**

### **🔑 Key Parameter: `role`**

The **`role`** parameter is what differentiates an organizer from an attendee during registration.

---

## 📋 **Complete Parameter List**

### **Required Parameters:**
```json
{
  "email": "string (email format)",
  "username": "string (3-30 characters, alphanumeric)",
  "password": "string (min 8 chars, with uppercase, lowercase, number, special char)",
  "firstName": "string (2-50 characters)",
  "lastName": "string (2-50 characters)",
  "acceptTerms": "boolean (must be true)"
}
```

### **Optional Parameters:**
```json
{
  "phoneNumber": "string (phone format)",
  "dateOfBirth": "string (date format)",
  "marketingConsent": "boolean",
  "role": "string (attendee|organizer|admin)"
}
```

---

## 🎯 **Organizer Registration Examples**

### **1. Basic Organizer Registration**
```json
{
  "email": "organizer@example.com",
  "username": "organizer123",
  "password": "TestPassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "acceptTerms": true,
  "role": "organizer"
}
```

### **2. Complete Organizer Registration**
```json
{
  "email": "organizer@example.com",
  "username": "organizer123",
  "password": "TestPassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1234567891",
  "dateOfBirth": "1985-05-15",
  "acceptTerms": true,
  "marketingConsent": true,
  "role": "organizer"
}
```

### **3. Admin Registration**
```json
{
  "email": "admin@example.com",
  "username": "admin123",
  "password": "AdminPassword123!",
  "firstName": "Admin",
  "lastName": "User",
  "acceptTerms": true,
  "role": "admin"
}
```

---

## 🛠️ **Testing with Different Tools**

### **1. cURL Command**
```bash
curl -X POST \
  https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "organizer@example.com",
    "username": "organizer123",
    "password": "TestPassword123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "phoneNumber": "+1234567891",
    "acceptTerms": true,
    "marketingConsent": true,
    "role": "organizer"
  }'
```

### **2. Postman**
1. **Method:** `POST`
2. **URL:** `https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register`
3. **Headers:** `Content-Type: application/json`
4. **Body (raw JSON):**
```json
{
  "email": "organizer@example.com",
  "username": "organizer123",
  "password": "TestPassword123!",
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1234567891",
  "acceptTerms": true,
  "marketingConsent": true,
  "role": "organizer"
}
```

### **3. Swagger UI**
1. Open `docs/api-documentation.html`
2. Find the `POST /auth/register` endpoint
3. Click "Try it out"
4. Fill in the parameters:
   - **email:** `organizer@example.com`
   - **username:** `organizer123`
   - **password:** `TestPassword123!`
   - **firstName:** `Jane`
   - **lastName:** `Smith`
   - **phoneNumber:** `+1234567891`
   - **acceptTerms:** `true`
   - **marketingConsent:** `true`
   - **role:** `organizer`
5. Click "Execute"

---

## 🔄 **Role Comparison**

| Parameter | Attendee (Default) | Organizer | Admin |
|-----------|-------------------|-----------|-------|
| `role` | `"attendee"` or omitted | `"organizer"` | `"admin"` |
| **Permissions** | Book events | Create/manage events | Full access |
| **Can Create Events** | ❌ | ✅ | ✅ |
| **Can Book Events** | ✅ | ❌ | ❌ |
| **Can Manage Users** | ❌ | ❌ | ✅ |

---

## ✅ **Expected Response**

### **Successful Registration:**
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully. Please check your email for verification.",
    "user": {
      "id": "d7cb80cd-fe69-4cd4-9e6f-2cad95522820",
      "email": "organizer@example.com",
      "username": "organizer123",
      "firstName": "Jane",
      "lastName": "Smith",
      "status": "pending_verification",
      "emailVerified": false,
      "phoneVerified": false,
      "createdAt": "2025-08-25T22:28:48.458Z"
    }
  },
  "timestamp": "2025-08-25T22:28:48.496Z"
}
```

### **Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "message": "Invalid user role",
        "path": ["role"],
        "type": "any.only"
      }
    ]
  }
}
```

---

## 🚨 **Common Issues & Solutions**

### **1. Role Validation Error**
**Problem:** `"Invalid user role"`
**Solution:** Use only `"attendee"`, `"organizer"`, or `"admin"`

### **2. Password Requirements**
**Problem:** `"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"`
**Solution:** Use passwords like `TestPassword123!`

### **3. Username Requirements**
**Problem:** `"Username must contain only letters and numbers"`
**Solution:** Use alphanumeric usernames like `organizer123`

### **4. Email Already Exists**
**Problem:** `"User with this email or username already exists"`
**Solution:** Use a different email address

---

## 🎯 **Quick Test Commands**

### **Test Attendee Registration:**
```bash
curl -X POST \
  https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "attendee@example.com",
    "username": "attendee123",
    "password": "TestPassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "acceptTerms": true
  }'
```

### **Test Organizer Registration:**
```bash
curl -X POST \
  https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "organizer@example.com",
    "username": "organizer123",
    "password": "TestPassword123!",
    "firstName": "Jane",
    "lastName": "Smith",
    "acceptTerms": true,
    "role": "organizer"
  }'
```

---

## 📝 **Summary**

**To create organizer registration parameters:**

1. **Include the `role` parameter** with value `"organizer"`
2. **All other parameters** are the same as attendee registration
3. **The `role` parameter is optional** - if omitted, defaults to `"attendee"`
4. **Valid role values:** `"attendee"`, `"organizer"`, `"admin"`

**The key difference is simply adding:**
```json
"role": "organizer"
```

This single parameter changes the user from an attendee (who can book events) to an organizer (who can create and manage events)!
