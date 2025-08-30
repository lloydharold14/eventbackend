# 🔐 Admin Role Management Guide

## **📋 Available User Roles**

Your system has three predefined roles:

```typescript
enum UserRole {
  ADMIN = 'admin',      // Full system access
  ORGANIZER = 'organizer', // Can create/manage events  
  ATTENDEE = 'attendee'    // Default role for new users
}
```

---

## **🚀 Methods to Create Admin Users**

### **Method 1: Register First Admin (Bootstrap)**

**Step 1**: Register a regular user first:
```bash
POST {{main_api_url}}/auth/register
```
```json
{
  "email": "admin@tkhtech.com",
  "password": "SecureAdminPass123!",
  "firstName": "System",
  "lastName": "Administrator",
  "role": "attendee"
}
```

**Step 2**: Manually promote to admin (see Method 3 below)

---

### **Method 2: Direct Database Update (First Admin)**

For your very first admin user, you can directly update the database:

```bash
# Connect to DynamoDB and update the user record
aws dynamodb update-item \
  --table-name UserManagement-dev-dev-users \
  --key '{"PK":{"S":"USER#<user-id>"},"SK":{"S":"USER#<user-id>"}}' \
  --update-expression "SET #role = :role" \
  --expression-attribute-names '{"#role":"role"}' \
  --expression-attribute-values '{":role":{"S":"admin"}}' \
  --region ca-central-1
```

---

### **Method 3: Using API (Requires Existing Admin)**

Once you have at least one admin, you can promote other users:

```bash
PUT {{main_api_url}}/users/{userId}/role
Authorization: Bearer {admin_jwt_token}
```
```json
{
  "role": "admin"
}
```

---

## **🔧 Admin Management Endpoints**

### **1. Change User Role** (Admin Only)
```
PUT /users/{userId}/role
Authorization: Bearer {admin_token}
```
**Request Body:**
```json
{
  "role": "admin" | "organizer" | "attendee"
}
```

### **2. List All Users** (Admin Only)
```
GET /users
Authorization: Bearer {admin_token}
```

### **3. Delete User** (Admin Only)
```
DELETE /users/{userId}
Authorization: Bearer {admin_token}
```

### **4. Get Any User Details** (Admin Only)
```
GET /users/{userId}
Authorization: Bearer {admin_token}
```

---

## **⚠️ Security Restrictions**

1. **Self-Role Protection**: Admins cannot demote themselves
2. **Admin-Only Access**: Only admins can change roles
3. **Token Validation**: All admin operations require valid JWT tokens
4. **Audit Logging**: All role changes are logged with who made the change

---

## **🎯 Quick Setup Steps**

### **For Your First Admin:**

1. **Register a user** with regular signup
2. **Get the user ID** from the response
3. **Use Method 2** (direct database update) to promote to admin
4. **Login** to get admin JWT token
5. **Use Method 3** for all future admin promotions

### **Example First Admin Setup:**

```bash
# 1. Register user
curl -X POST https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tkhtech.com",
    "password": "SecureAdminPass123!",
    "firstName": "System",
    "lastName": "Administrator"
  }'

# 2. Note the user ID from response, then update role in DynamoDB

# 3. Login to get admin token
curl -X POST https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@tkhtech.com",
    "password": "SecureAdminPass123!"
  }'

# 4. Use admin token for future role management
```

---

## **📱 Mobile App Integration**

In your Kotlin app, check user roles:

```kotlin
data class User(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String,
    val role: UserRole, // "admin", "organizer", "attendee"
    // ... other fields
)

enum class UserRole {
    ADMIN, ORGANIZER, ATTENDEE
}

// Check if user is admin
fun isAdmin(user: User): Boolean {
    return user.role == UserRole.ADMIN
}

// Show admin features in UI
if (isAdmin(currentUser)) {
    // Show admin dashboard, user management, etc.
}
```

---

## **🔍 Troubleshooting**

**Issue**: "Only administrators can change user roles"  
**Solution**: Ensure you're using a JWT token from an admin user

**Issue**: "Cannot change your own admin role"  
**Solution**: Use a different admin account or create a new admin first

**Issue**: "User not found"  
**Solution**: Verify the user ID exists in the database

---

## **✅ Admin Capabilities**

With admin role, users can:
- ✅ View all users in the system
- ✅ Change any user's role
- ✅ Delete users
- ✅ View any user's profile
- ✅ Access admin-only analytics
- ✅ Manage system-wide settings

**Your admin system is fully functional and ready to use!** 🚀
