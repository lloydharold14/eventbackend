# 🔄 Postman Dynamic Variables Guide

## 🎯 **How to Dynamically Update Access Tokens and Variables**

This guide shows you how to automatically capture and use dynamic variables in Postman for the Event Management Platform.

---

## 📋 **Available Collection Variables**

### **🔐 Authentication Variables**
- `{{accessToken}}` - JWT access token for API calls
- `{{refreshToken}}` - JWT refresh token
- `{{tokenExpiresIn}}` - Token expiration time in seconds

### **👤 User Variables**
- `{{userId}}` - Current user ID
- `{{userEmail}}` - Current user email
- `{{username}}` - Current username
- `{{userRole}}` - Current user role (attendee/organizer/admin)

### **🎉 Event Variables**
- `{{eventId}}` - Created event ID
- `{{eventTitle}}` - Event title
- `{{eventSlug}}` - Event slug

### **👥 Role-Specific Variables**
- `{{organizerId}}` - Organizer user ID
- `{{organizerToken}}` - Organizer access token
- `{{attendeeId}}` - Attendee user ID
- `{{attendeeToken}}` - Attendee access token

---

## 🛠️ **Setup Instructions**

### **1. Import the Collection**
1. Download `postman-collection.json` from the repository
2. In Postman: **File → Import → Upload Files**
3. Select the JSON file and import

### **2. Set Base URL**
1. Click on the collection name (Event Management Platform)
2. Go to **Variables** tab
3. Set `{{baseUrl}}` to:
   ```
   https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev
   ```

### **3. Test the Setup**
1. Run **Health Check** to verify the base URL works
2. Run **Register Attendee** or **Register Organizer**
3. Check the **Console** (View → Show Postman Console) to see captured variables

---

## 🔄 **How Dynamic Variables Work**

### **Registration Flow:**
1. **Register User** → Captures `userId`, `userEmail`, `username`, `userRole`
2. **Login User** → Captures `accessToken`, `refreshToken`, `tokenExpiresIn`
3. **Create Event** → Captures `eventId`, `eventTitle`, `eventSlug`

### **Example Test Script (Registration):**
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    const response = pm.response.json();
    if (response.success && response.data && response.data.user) {
        pm.collectionVariables.set('userId', response.data.user.id);
        pm.collectionVariables.set('userEmail', response.data.user.email);
        pm.collectionVariables.set('username', response.data.user.username);
        pm.collectionVariables.set('userRole', response.data.user.role);
        console.log('✅ User registered successfully:', response.data.user.id);
    }
}
```

### **Example Test Script (Login):**
```javascript
if (pm.response.code === 200) {
    const response = pm.response.json();
    if (response.success && response.data) {
        // Set user information
        pm.collectionVariables.set('userId', response.data.user.id);
        pm.collectionVariables.set('userEmail', response.data.user.email);
        pm.collectionVariables.set('userRole', response.data.user.role);
        
        // Set authentication tokens
        pm.collectionVariables.set('accessToken', response.data.accessToken);
        pm.collectionVariables.set('refreshToken', response.data.refreshToken);
        pm.collectionVariables.set('tokenExpiresIn', response.data.expiresIn);
        
        // Set role-specific variables
        if (response.data.user.role === 'organizer') {
            pm.collectionVariables.set('organizerId', response.data.user.id);
            pm.collectionVariables.set('organizerToken', response.data.accessToken);
        }
        
        console.log('✅ Login successful!');
    }
}
```

---

## 🎯 **Testing Workflows**

### **Workflow 1: Attendee Registration & Login**
1. **Register Attendee** → Sets `userId`, `userEmail`, `username`, `userRole`
2. **Login User** → Sets `accessToken`, `refreshToken`
3. **Get User Profile** → Uses `{{accessToken}}` automatically
4. **Update User Profile** → Uses `{{accessToken}}` automatically

### **Workflow 2: Organizer Registration & Event Creation**
1. **Register Organizer** → Sets `organizerId`, `organizerEmail`, `organizerRole`
2. **Login User** → Sets `accessToken`, `organizerToken`
3. **Create Event** → Uses `{{accessToken}}`, sets `eventId`, `eventTitle`
4. **Get Event by ID** → Uses `{{eventId}}` automatically
5. **Update Event** → Uses `{{accessToken}}` and `{{eventId}}`

### **Workflow 3: Complete Event Management**
1. **Register Organizer** → Sets organizer variables
2. **Login User** → Sets authentication tokens
3. **Create Event** → Sets event variables
4. **Search Events** → View all events
5. **Get Event by ID** → View specific event
6. **Update Event** → Modify event details

---

## 🔧 **Manual Variable Management**

### **View Current Variables:**
1. Click on collection name
2. Go to **Variables** tab
3. See all current variable values

### **Clear Variables:**
```javascript
// In a test script
pm.collectionVariables.clear();
```

### **Set Variables Manually:**
```javascript
// In a test script
pm.collectionVariables.set('customVariable', 'customValue');
```

### **Get Variable Values:**
```javascript
// In a test script
const userId = pm.collectionVariables.get('userId');
console.log('Current User ID:', userId);
```

---

## 🚨 **Troubleshooting**

### **Issue: Variables Not Updating**
**Solution:**
1. Check response status code in test script
2. Verify response structure matches expected format
3. Check Postman Console for error messages

### **Issue: Authorization Headers Not Working**
**Solution:**
1. Ensure `{{accessToken}}` is set after login
2. Check token expiration (`{{tokenExpiresIn}}`)
3. Use **Refresh Token** endpoint if token expired

### **Issue: Event ID Not Captured**
**Solution:**
1. Verify event creation was successful (201/200 status)
2. Check response structure for `data.id` field
3. Ensure test script is running correctly

---

## 📝 **Best Practices**

### **1. Always Check Response Status**
```javascript
if (pm.response.code === 200 || pm.response.code === 201) {
    // Process successful response
}
```

### **2. Validate Response Structure**
```javascript
if (response.success && response.data && response.data.user) {
    // Safe to access user data
}
```

### **3. Use Descriptive Console Logs**
```javascript
console.log('✅ Login successful!');
console.log('👤 User ID:', response.data.user.id);
console.log('🔑 Token expires in:', response.data.expiresIn, 'seconds');
```

### **4. Handle Errors Gracefully**
```javascript
} else {
    console.log('❌ Request failed:', pm.response.text());
}
```

---

## 🎉 **Quick Start Checklist**

- [ ] Import `postman-collection.json`
- [ ] Set `{{baseUrl}}` variable
- [ ] Test Health Check endpoint
- [ ] Register a user (attendee or organizer)
- [ ] Login with the user
- [ ] Verify variables are captured in Console
- [ ] Test authenticated endpoints
- [ ] Create an event (organizer only)
- [ ] Verify event variables are captured

---

## 🔗 **Related Files**

- `postman-collection.json` - Complete collection with dynamic variables
- `ORGANIZER_REGISTRATION_GUIDE.md` - Organizer registration guide
- `FINAL_TESTING_GUIDE.md` - Complete testing guide

---

**🎯 With this setup, your Postman collection will automatically manage all authentication tokens and user/event IDs, making API testing seamless and efficient!**
