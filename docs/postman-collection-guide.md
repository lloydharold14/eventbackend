# 📮 Postman Collection Guide - Event Management Platform

## 🎯 Overview

This comprehensive Postman collection provides a complete test suite for the Event Management Platform API, organized by user roles and featuring dynamic variables for seamless testing.

## 📁 Collection Structure

### **🔧 Setup & Authentication**
- Health Check
- User Registration (Attendee & Organizer)
- User Login (Attendee & Organizer)
- Token Refresh

### **👥 Attendee APIs**
- **🔍 Event Discovery** - Browse, search, and discover events
- **📅 Booking Management** - Create, view, and manage bookings
- **💳 Payment Processing** - Handle payments and view history
- **📱 QR Code & Validation** - QR code generation and validation
- **🔔 Notifications** - Manage notifications and preferences
- **🔍 Search & Discovery** - Advanced search and trending events

### **🎪 Organizer APIs**
- **📝 Event Management** - Create, update, and manage events
- **📊 Analytics & Reports** - Event performance and attendee analytics
- **💰 Financial Management** - Revenue tracking and payouts
- **📱 QR Code Management** - Generate and manage event QR codes

### **👨‍💼 Admin APIs**
- **👥 User Management** - Manage all users and roles
- **📊 Platform Analytics** - System-wide analytics and reports
- **⚙️ System Configuration** - Platform settings and configurations

## 🚀 Quick Start

### **1. Import the Collection**

1. Download the `postman-collection-complete.json` file
2. Open Postman
3. Click **Import** → **Upload Files**
4. Select the JSON file
5. The collection will be imported with all variables and tests

### **2. Configure Environment Variables**

The collection includes pre-configured variables:

```json
{
  "baseUrl": "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev",
  "attendeeEmail": "attendee@example.com",
  "attendeePassword": "TestPassword123!",
  "organizerEmail": "organizer@example.com",
  "organizerPassword": "TestPassword123!"
}
```

### **3. Run the Setup Flow**

1. **Health Check** - Verify API is running
2. **Register Attendee** - Create test attendee account
3. **Register Organizer** - Create test organizer account
4. **Login Attendee** - Get authentication tokens
5. **Login Organizer** - Get organizer tokens

## 🔧 Dynamic Variables

### **Automatically Set Variables**

The collection automatically sets these variables during testing:

| Variable | Description | Set By |
|----------|-------------|---------|
| `accessToken` | JWT access token | Login requests |
| `refreshToken` | JWT refresh token | Login requests |
| `userId` | Current user ID | Login/Register requests |
| `organizerId` | Organizer user ID | Organizer login |
| `eventId` | Event ID for testing | Event browse/search |
| `bookingId` | Booking ID for testing | Create booking |
| `paymentId` | Payment ID for testing | Payment creation |
| `categoryId` | Category ID for testing | Category browse |
| `notificationId` | Notification ID for testing | Get notifications |
| `qrCode` | QR code for validation | QR code generation |

### **Manual Configuration**

You can manually set these variables in the collection:

```json
{
  "attendeeEmail": "your-attendee@example.com",
  "attendeePassword": "YourPassword123!",
  "organizerEmail": "your-organizer@example.com",
  "organizerPassword": "YourPassword123!"
}
```

## 📱 Mobile Testing

### **Automatic Mobile Detection**

The collection automatically sets the User-Agent header for mobile testing:

```javascript
// Pre-request script automatically sets:
User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15
```

### **Mobile vs Web Testing**

- **Mobile Response**: Optimized payloads (~40% smaller)
- **Web Response**: Full data with internal fields
- **Automatic Detection**: Based on User-Agent header

## 🧪 Testing Workflows

### **Attendee Workflow**

1. **Setup**
   ```bash
   Health Check → Register Attendee → Login Attendee
   ```

2. **Event Discovery**
   ```bash
   Browse Events → Get Event Details → Browse Categories
   ```

3. **Booking Process**
   ```bash
   Create Booking → Get Booking Details → Create Payment Intent
   ```

4. **QR Code & Entry**
   ```bash
   Get Booking QR Code → Validate QR Code
   ```

5. **Notifications**
   ```bash
   Get User Notifications → Update Notification Preferences
   ```

### **Complete Attendee Journey**

```bash
# 1. Authentication
Health Check
Register Attendee
Login Attendee

# 2. Event Discovery
Browse Events
Search Events
Get Event Details
Browse Categories

# 3. Booking & Payment
Create Booking
Get User Bookings
Create Payment Intent
Get Payment History

# 4. QR Code & Entry
Get Booking QR Code
Validate QR Code

# 5. Notifications
Get User Notifications
Update Notification Preferences

# 6. Search & Discovery
Search Events with Filters
Get Trending Events
Get Nearby Events
```

## 🔍 Test Scripts

### **Automatic Variable Setting**

Each request includes test scripts that automatically set variables:

```javascript
// Example: Login Attendee
pm.test('Response has tokens', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('accessToken');
    pm.expect(response.data).to.have.property('refreshToken');
    
    // Automatically set variables for next requests
    pm.collectionVariables.set('accessToken', response.data.accessToken);
    pm.collectionVariables.set('refreshToken', response.data.refreshToken);
    pm.collectionVariables.set('userId', response.data.user.id);
});
```

### **Response Validation**

All requests include comprehensive response validation:

```javascript
pm.test('Status code is 200', function () {
    pm.response.to.have.status(200);
});

pm.test('Response has expected data', function () {
    const response = pm.response.json();
    pm.expect(response.success).to.be.true;
    pm.expect(response.data).to.have.property('events');
});
```

## 📊 Collection Features

### **✅ Pre-configured Authentication**

- Bearer token authentication
- Automatic token refresh
- Role-based access control

### **✅ Dynamic Variables**

- Automatic variable setting
- Cross-request data sharing
- Environment-specific values

### **✅ Comprehensive Testing**

- Status code validation
- Response structure validation
- Data integrity checks

### **✅ Mobile Optimization**

- Automatic mobile User-Agent
- Mobile response testing
- Performance validation

### **✅ Error Handling**

- Error response validation
- Edge case testing
- Boundary condition checks

## 🚀 Advanced Usage

### **Running Specific Workflows**

1. **Attendee Testing Only**
   ```bash
   # Run only attendee-related requests
   Health Check → Register Attendee → Login Attendee → [Attendee APIs]
   ```

2. **Event Discovery Testing**
   ```bash
   # Test event discovery features
   Browse Events → Search Events → Get Event Details → Browse Categories
   ```

3. **Booking Flow Testing**
   ```bash
   # Test complete booking process
   Create Booking → Get Booking Details → Create Payment Intent → Get QR Code
   ```

### **Custom Test Data**

You can modify the request bodies to test different scenarios:

```json
// Custom booking data
{
  "eventId": "{{eventId}}",
  "ticketQuantity": 5,
  "attendeeInfo": {
    "firstName": "Custom",
    "lastName": "User",
    "email": "custom@example.com",
    "phoneNumber": "+1234567890"
  },
  "specialRequests": "Custom special requests"
}
```

### **Environment Switching**

Create different environments for testing:

```json
// Development Environment
{
  "baseUrl": "https://dev-api.example.com",
  "attendeeEmail": "dev-attendee@example.com"
}

// Staging Environment
{
  "baseUrl": "https://staging-api.example.com",
  "attendeeEmail": "staging-attendee@example.com"
}

// Production Environment
{
  "baseUrl": "https://api.example.com",
  "attendeeEmail": "prod-attendee@example.com"
}
```

## 📋 API Coverage

### **Complete API Coverage**

| Role | Category | Endpoints | Status |
|------|----------|-----------|---------|
| **👥 Attendee** | Event Discovery | 5 endpoints | ✅ Complete |
| **👥 Attendee** | Booking Management | 5 endpoints | ✅ Complete |
| **👥 Attendee** | Payment Processing | 2 endpoints | ✅ Complete |
| **👥 Attendee** | QR Code & Validation | 2 endpoints | ✅ Complete |
| **👥 Attendee** | Notifications | 2 endpoints | ✅ Complete |
| **👥 Attendee** | Search & Discovery | 3 endpoints | ✅ Complete |
| **🎪 Organizer** | Event Management | 4 endpoints | ✅ Complete |
| **🎪 Organizer** | Analytics & Reports | 2 endpoints | ✅ Complete |
| **🎪 Organizer** | Financial Management | 1 endpoint | ✅ Complete |
| **👨‍💼 Admin** | User Management | 3 endpoints | ✅ Complete |
| **👨‍💼 Admin** | Platform Analytics | 2 endpoints | ✅ Complete |
| **👨‍💼 Admin** | System Configuration | 2 endpoints | ✅ Complete |

### **Total Coverage**
- **35+ endpoints** across all user roles
- **Complete authentication** flow
- **Mobile optimization** testing
- **Error handling** validation
- **Role-based access** control

## 🔧 Troubleshooting

### **Common Issues**

1. **Authentication Errors**
   ```bash
   # Check if tokens are set
   pm.collectionVariables.get('accessToken')
   
   # Re-run login if needed
   Login Attendee → Login Organizer
   ```

2. **Missing Variables**
   ```bash
   # Check variable values
   pm.collectionVariables.toObject()
   
   # Re-run setup flow
   Health Check → Register → Login
   ```

3. **API Errors**
   ```bash
   # Check API status
   Health Check
   
   # Verify base URL
   pm.collectionVariables.get('baseUrl')
   ```

### **Debug Mode**

Enable debug mode in Postman:

1. **Console Logging**
   ```javascript
   console.log('Debug info:', pm.collectionVariables.toObject());
   ```

2. **Response Logging**
   ```javascript
   pm.test('Debug response', function () {
       console.log('Response:', pm.response.json());
   });
   ```

## 📈 Performance Testing

### **Load Testing Setup**

1. **Collection Runner**
   - Select specific requests
   - Set iteration count
   - Configure delays

2. **Newman CLI**
   ```bash
   newman run postman-collection-complete.json \
     --iteration-count 100 \
     --delay-request 1000
   ```

3. **Performance Monitoring**
   - Response time tracking
   - Error rate monitoring
   - Throughput analysis

## 🎯 Best Practices

### **Testing Strategy**

1. **Start with Setup**
   - Always run authentication first
   - Verify API health before testing

2. **Follow User Workflows**
   - Test complete user journeys
   - Validate end-to-end processes

3. **Test Edge Cases**
   - Invalid data scenarios
   - Error conditions
   - Boundary values

4. **Mobile Testing**
   - Test mobile-optimized responses
   - Validate performance improvements

### **Maintenance**

1. **Regular Updates**
   - Update collection with new endpoints
   - Refresh test data periodically

2. **Version Control**
   - Track collection changes
   - Document API updates

3. **Environment Management**
   - Maintain separate environments
   - Update URLs and credentials

---

## 📞 Support

For questions about the Postman collection:

- **Documentation**: Check this guide and inline comments
- **Issues**: Create an issue in the repository
- **Updates**: Check for collection updates regularly

---

**Last Updated:** August 26, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅

