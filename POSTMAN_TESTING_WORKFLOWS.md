# 🧪 Postman Testing Workflows Guide

## 🎯 **Complete Testing Workflows for Event Management Platform**

This guide provides step-by-step testing workflows using the updated Postman collection with dynamic variables and verification endpoints.

---

## 📋 **Prerequisites**

### **1. Import Updated Collection**
- Download `postman-collection.json`
- Import into Postman: **File → Import → Upload Files**
- Select the JSON file and import

### **2. Set Base URL**
- Click on collection name: **Event Management Platform**
- Go to **Variables** tab
- Verify `{{baseUrl}}` is set to:
  ```
  https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev
  ```

### **3. Open Postman Console**
- **View → Show Postman Console**
- This shows captured variables and test results

---

## 🔄 **Workflow 1: Complete User Registration & Verification**

### **Step 1: Register New User**
1. **Request**: `Register Attendee` or `Register Organizer`
2. **Expected Result**: 200/201 with user data
3. **Variables Captured**: `userId`, `userEmail`, `username`, `userRole`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "message": "User registered successfully. Please check your email for verification.",
    "user": {
      "id": "1e29f4b7-4974-44b2-a5d0-11cbbe46c05e",
      "email": "user@example.com",
      "username": "testuser",
      "firstName": "Test",
      "lastName": "User",
      "status": "pending_verification",
      "emailVerified": false,
      "phoneVerified": false
    }
  }
}
```

### **Step 2: Check Email for Verification Code**
- Look for email from `noreply@eventplatform.com`
- Note the 6-digit verification code
- Or click the verification link (optional)

### **Step 3: Verify Email**
1. **Request**: `Verify Email`
2. **Body**: Update the code with the actual code from email
   ```json
   {
     "userId": "{{userId}}",
     "code": "123456"
   }
   ```
3. **Expected Result**: 200 with verification success
4. **Variables Updated**: User status becomes `active`

### **Step 4: Login User**
1. **Request**: `Login User`
2. **Expected Result**: 200 with access token
3. **Variables Captured**: `accessToken`, `refreshToken`, `tokenExpiresIn`

### **Step 5: Test Authenticated Endpoints**
1. **Request**: `Get User Profile`
2. **Expected Result**: 200 with user profile
3. **Note**: Uses `{{accessToken}}` automatically

---

## 🔄 **Workflow 2: Organizer Event Management**

### **Step 1: Register Organizer**
1. **Request**: `Register Organizer`
2. **Body**: Use organizer credentials
   ```json
   {
     "email": "organizer@example.com",
     "username": "organizer123",
     "password": "TestPassword123!",
     "firstName": "Jane",
     "lastName": "Organizer",
     "phoneNumber": "+1234567890",
     "acceptTerms": true,
     "marketingConsent": true,
     "role": "organizer"
   }
   ```

### **Step 2: Verify Email & Login**
1. Follow email verification steps
2. Login to get access token

### **Step 3: Create Event**
1. **Request**: `Create Event`
2. **Expected Result**: 201 with event data
3. **Variables Captured**: `eventId`, `eventTitle`, `eventSlug`

**Example Event Data:**
```json
{
  "title": "Tech Conference 2024",
  "description": "Join us for the biggest tech conference of the year!",
  "type": "CONFERENCE",
  "category": "Technology",
  "startDate": "2024-12-15T09:00:00Z",
  "endDate": "2024-12-15T18:00:00Z",
  "timezone": "America/Toronto",
  "location": {
    "venue": "Toronto Convention Center",
    "address": "255 Front St W, Toronto, ON M5V 2W6",
    "city": "Toronto",
    "state": "Ontario",
    "country": "Canada",
    "postalCode": "M5V 2W6",
    "coordinates": {
      "latitude": 43.6426,
      "longitude": -79.3871
    }
  },
  "capacity": 500,
  "pricing": {
    "model": "TIERED",
    "tiers": [
      {
        "name": "Early Bird",
        "price": 99.99,
        "currency": "CAD",
        "availableUntil": "2024-11-15T23:59:59Z",
        "quantity": 100
      }
    ]
  },
  "visibility": "PUBLIC",
  "tags": ["technology", "conference", "networking"]
}
```

### **Step 4: Manage Event**
1. **Request**: `Get Event by ID`
2. **Expected Result**: 200 with event details
3. **Note**: Uses `{{eventId}}` automatically

### **Step 5: Update Event**
1. **Request**: `Update Event`
2. **Expected Result**: 200 with updated event

---

## 🔄 **Workflow 3: SMS Verification Testing**

### **Step 1: Register User with Phone**
1. **Request**: `Register Attendee`
2. **Body**: Include phone number
   ```json
   {
     "email": "user@example.com",
     "username": "testuser",
     "password": "TestPassword123!",
     "firstName": "Test",
     "lastName": "User",
     "phoneNumber": "+1234567890",
     "acceptTerms": true
   }
   ```

### **Step 2: Send SMS Verification**
1. **Request**: `Send SMS Verification`
2. **URL**: Uses `{{userId}}` automatically
3. **Expected Result**: 200 with verification ID

### **Step 3: Check Phone for SMS**
- Look for SMS with 6-digit code
- Note the verification code

### **Step 4: Verify SMS**
1. **Request**: `Verify SMS`
2. **Body**: Update with actual code
   ```json
   {
     "userId": "{{userId}}",
     "code": "123456"
   }
   ```
3. **Expected Result**: 200 with verification success

---

## 🔄 **Workflow 4: Complete Event Booking Flow**

### **Step 1: Register Attendee**
1. Follow registration and verification steps
2. Login to get access token

### **Step 2: Browse Events**
1. **Request**: `Get All Events`
2. **Expected Result**: 200 with event list

### **Step 3: Search Events**
1. **Request**: `Search Events`
2. **Expected Result**: 200 with search results

### **Step 4: View Event Details**
1. **Request**: `Get Event by ID`
2. **Expected Result**: 200 with event details

### **Step 5: Create Booking**
1. **Request**: `Create Booking`
2. **Expected Result**: 201 with booking data

---

## 🔄 **Workflow 5: Admin Management**

### **Step 1: Login as Admin**
1. Use admin credentials
2. Get access token

### **Step 2: List All Users**
1. **Request**: `List Users`
2. **Expected Result**: 200 with user list

### **Step 3: Get User Stats**
1. **Request**: `Get User Stats`
2. **Expected Result**: 200 with statistics

### **Step 4: Manage User Roles**
1. **Request**: `Change User Role`
2. **Expected Result**: 200 with updated user

---

## 🔄 **Workflow 6: Payment Processing**

### **Step 1: Create Payment**
1. **Request**: `Create Payment`
2. **Expected Result**: 201 with payment data

### **Step 2: Process Payment**
1. **Request**: `Process Payment`
2. **Expected Result**: 200 with payment status

### **Step 3: Get Payment Status**
1. **Request**: `Get Payment Status`
2. **Expected Result**: 200 with payment details

---

## 🔄 **Workflow 7: Analytics & Reporting**

### **Step 1: Get Event Analytics**
1. **Request**: `Get Event Analytics`
2. **Expected Result**: 200 with analytics data

### **Step 2: Get User Analytics**
1. **Request**: `Get User Analytics`
2. **Expected Result**: 200 with user analytics

### **Step 3: Get Platform Analytics**
1. **Request**: `Get Platform Analytics`
2. **Expected Result**: 200 with platform metrics

---

## 🔄 **Workflow 8: Notification Testing**

### **Step 1: Send Notification**
1. **Request**: `Send Notification`
2. **Expected Result**: 200 with notification sent

### **Step 2: Get Notifications**
1. **Request**: `Get User Notifications`
2. **Expected Result**: 200 with notification list

---

## 📊 **Dynamic Variables Reference**

### **Authentication Variables**
- `{{accessToken}}` - JWT access token
- `{{refreshToken}}` - JWT refresh token
- `{{tokenExpiresIn}}` - Token expiration time

### **User Variables**
- `{{userId}}` - Current user ID
- `{{userEmail}}` - User email address
- `{{username}}` - Username
- `{{userRole}}` - User role (attendee/organizer/admin)

### **Event Variables**
- `{{eventId}}` - Created event ID
- `{{eventTitle}}` - Event title
- `{{eventSlug}}` - Event slug

### **Role-Specific Variables**
- `{{organizerId}}` - Organizer user ID
- `{{organizerToken}}` - Organizer access token
- `{{attendeeId}}` - Attendee user ID
- `{{attendeeToken}}` - Attendee access token

---

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Variables Not Updating**
1. Check Postman Console for error messages
2. Verify response status codes
3. Ensure test scripts are running correctly

#### **Authentication Errors**
1. Check if `{{accessToken}}` is set
2. Verify token hasn't expired
3. Use refresh token if needed

#### **Verification Issues**
1. Check email/spam folder for verification codes
2. Verify code hasn't expired (10 minutes)
3. Ensure correct user ID is used

#### **API Errors**
1. Check base URL is correct
2. Verify request body format
3. Check required fields are provided

---

## 🎯 **Best Practices**

### **1. Test Order**
- Always register → verify → login → test features
- Use fresh users for each test scenario
- Clean up test data when possible

### **2. Variable Management**
- Check console after each request
- Verify variables are captured correctly
- Use descriptive variable names

### **3. Error Handling**
- Check response status codes
- Review error messages in console
- Test both success and failure scenarios

### **4. Security Testing**
- Test with invalid tokens
- Try unauthorized access
- Verify proper error responses

---

## 🚀 **Quick Start Checklist**

- [ ] Import `postman-collection.json`
- [ ] Set `{{baseUrl}}` variable
- [ ] Open Postman Console
- [ ] Test Health Check endpoint
- [ ] Register a test user
- [ ] Verify email with code
- [ ] Login and get access token
- [ ] Test authenticated endpoints
- [ ] Create an event (organizer)
- [ ] Test SMS verification (optional)
- [ ] Verify all variables are captured

---

## 📖 **Additional Resources**

- **API Documentation**: `docs/openapi.yaml`
- **Verification Guide**: `EMAIL_SMS_VERIFICATION_GUIDE.md`
- **Dynamic Variables Guide**: `POSTMAN_DYNAMIC_VARIABLES_GUIDE.md`
- **Implementation Guide**: `FINAL_TESTING_GUIDE.md`

---

**🎉 With these workflows, you can thoroughly test all aspects of the Event Management Platform using the updated Postman collection!**
