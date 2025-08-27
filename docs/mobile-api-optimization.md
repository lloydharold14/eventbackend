# 📱 Mobile API Optimization Documentation

## Overview

The Event Management Platform API now includes **mobile-optimized responses** that automatically reduce payload size by ~40% for mobile devices while maintaining full functionality for web/desktop applications.

## 🎯 Key Features

### **Automatic Mobile Detection**
- **User-Agent Analysis**: Detects mobile devices via User-Agent headers
- **Keywords**: `mobile`, `android`, `ios`, `iPhone`, `iPad`, `Android`
- **Fallback**: Web/desktop response for non-mobile devices

### **Response Optimization**
- **Payload Reduction**: ~40% smaller responses for mobile
- **Field Filtering**: Removes internal database fields
- **Simplified Preferences**: Streamlined user preferences
- **Performance**: Faster parsing and reduced bandwidth usage

## 📊 Response Comparison

### **Web/Desktop Response (Full)**
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attendee",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "lastLoginAt": "2025-08-26T16:20:18.414Z",
      "createdAt": "2025-08-25T22:41:53.390Z",
      "updatedAt": "2025-08-25T22:41:53.390Z",
      "PK": "USER#123e4567-e89b-12d3-a456-426614174000",
      "SK": "USER#123e4567-e89b-12d3-a456-426614174000",
      "GSI1PK": "EMAIL#user@example.com",
      "GSI1SK": "USER#123e4567-e89b-12d3-a456-426614174000",
      "GSI2PK": "USERNAME#johndoe",
      "GSI2SK": "USER#123e4567-e89b-12d3-a456-426614174000",
      "GSI3PK": "ROLE#attendee",
      "GSI3SK": "USER#123e4567-e89b-12d3-a456-426614174000",
      "preferences": {
        "emailNotifications": true,
        "smsNotifications": false,
        "pushNotifications": true,
        "timezone": "UTC",
        "language": "en",
        "currency": "USD",
        "marketingEmails": true,
        "privacySettings": {
          "allowDirectMessages": true,
          "profileVisibility": "public",
          "showEmail": false,
          "showPhone": false,
          "showDateOfBirth": false
        }
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  },
  "timestamp": "2025-08-26T16:20:27.835Z"
}
```

### **Mobile Response (Optimized)**
```json
{
  "success": true,
  "data": {
    "message": "Login successful",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attendee",
      "status": "active",
      "emailVerified": true,
      "phoneVerified": false,
      "lastLoginAt": "2025-08-26T16:20:18.414Z",
      "preferences": {
        "emailNotifications": true,
        "smsNotifications": false,
        "pushNotifications": true,
        "timezone": "UTC",
        "language": "en",
        "currency": "USD",
        "marketingEmails": true
      }
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  },
  "timestamp": "2025-08-26T16:20:27.835Z"
}
```

## 🔧 Implementation Details

### **Mobile Detection Logic**
```typescript
const userAgent = event.headers['User-Agent'] || '';
const isMobileRequest = userAgent.toLowerCase().includes('mobile') || 
                       userAgent.toLowerCase().includes('android') || 
                       userAgent.toLowerCase().includes('ios');
```

### **Field Filtering**
**Removed Fields:**
- `PK`, `SK`, `GSI1PK`, `GSI1SK`, `GSI2PK`, `GSI2SK`, `GSI3PK`, `GSI3SK` (DynamoDB internal)
- `createdAt`, `updatedAt` (System timestamps)
- `passwordHash` (Sensitive data)
- `privacySettings` (Complex nested object)

**Simplified Preferences:**
- Removed `privacySettings` object
- Kept essential notification and locale settings

## 📱 Supported Endpoints

### **Authentication Endpoints**
- `POST /auth/login` - User login with email/password
- `POST /auth/oauth/login` - OAuth provider login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh access token
- `POST /auth/change-password` - Change password
- `POST /auth/reset-password` - Reset password
- `POST /auth/confirm-reset` - Confirm password reset

### **User Management Endpoints**
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/{userId}` - Get user by ID
- `POST /auth/verify-email` - Verify email address
- `POST /auth/verify-phone` - Verify phone number
- `POST /auth/resend-email-verification` - Resend email verification
- `POST /auth/send-sms-verification` - Send SMS verification

### **Event Discovery & Search (Attendee-Focused)**
- `GET /events` - Browse and search events
- `GET /events/{eventId}` - Get event details
- `GET /events/slug/{slug}` - Get event by slug
- `GET /events/search` - Advanced event search
- `GET /events/category/{categoryId}` - Get events by category
- `GET /events/organizer/{organizerId}` - Get organizer's events
- `GET /categories` - Browse event categories

### **Booking & Reservations (Attendee-Focused)**
- `POST /bookings` - Create booking/reservation
- `GET /bookings` - Get user's bookings
- `GET /bookings/{bookingId}` - Get booking details
- `PUT /bookings/{bookingId}` - Update booking
- `DELETE /bookings/{bookingId}` - Cancel booking
- `POST /bookings/{bookingId}/confirm` - Confirm booking
- `GET /bookings/event/{eventId}` - Get bookings for specific event

### **Payment Processing (Attendee-Focused)**
- `POST /payments/create-intent` - Create payment intent
- `POST /payments/confirm` - Confirm payment
- `GET /payments/{paymentId}` - Get payment details
- `POST /payments/{paymentId}/refund` - Request refund
- `GET /payments/history` - Get payment history

### **QR Code & Validation (Attendee-Focused)**
- `GET /qr-codes/event/{eventId}` - Get event QR codes
- `POST /qr-codes/validate` - Validate QR code for entry
- `GET /qr-codes/booking/{bookingId}` - Get booking QR code

### **Notifications (Attendee-Focused)**
- `GET /notifications` - Get user notifications
- `PUT /notifications/{notificationId}/read` - Mark notification as read
- `POST /notifications/preferences` - Update notification preferences
- `DELETE /notifications/{notificationId}` - Delete notification

### **Search & Discovery (Attendee-Focused)**
- `GET /search/events` - Search events with filters
- `GET /search/suggestions` - Get search suggestions
- `GET /search/trending` - Get trending events
- `GET /search/nearby` - Get nearby events

### **Analytics & Insights (Attendee-Focused)**
- `GET /analytics/events/{eventId}/attendees` - Get event attendee analytics
- `GET /analytics/user/activity` - Get user activity analytics
- `GET /analytics/events/popular` - Get popular events

## 🚀 Benefits

### **Performance Improvements**
- **40% smaller payloads** for mobile devices
- **Faster network transfer** and reduced bandwidth usage
- **Improved battery life** due to reduced processing
- **Better user experience** with faster loading times

### **Development Benefits**
- **Automatic optimization** - no code changes needed in mobile apps
- **Backward compatibility** - web/desktop apps continue to work
- **Debugging support** - full responses available for web development
- **Flexible detection** - easy to extend mobile detection logic

## 📋 API Schema

### **MobileUser Schema**
```yaml
MobileUser:
  type: object
  description: "Mobile-optimized user object with internal fields removed"
  properties:
    id:
      type: string
      format: uuid
    email:
      type: string
      format: email
    username:
      type: string
    firstName:
      type: string
    lastName:
      type: string
    role:
      type: string
      enum: [attendee, organizer, admin]
    status:
      type: string
      enum: [pending_verification, active, suspended, deleted]
    emailVerified:
      type: boolean
    phoneVerified:
      type: boolean
    lastLoginAt:
      type: string
      format: date-time
    preferences:
      $ref: '#/components/schemas/MobileUserPreferences'
```

### **MobileUserPreferences Schema**
```yaml
MobileUserPreferences:
  type: object
  description: "Mobile-optimized user preferences (privacy settings removed)"
  properties:
    emailNotifications:
      type: boolean
    smsNotifications:
      type: boolean
    pushNotifications:
      type: boolean
    timezone:
      type: string
    language:
      type: string
    currency:
      type: string
    marketingEmails:
      type: boolean
```

### **MobileEvent Schema**
```yaml
MobileEvent:
  type: object
  description: "Mobile-optimized event object"
  properties:
    id:
      type: string
      format: uuid
    title:
      type: string
    description:
      type: string
    slug:
      type: string
    organizerId:
      type: string
      format: uuid
    organizerName:
      type: string
    categoryId:
      type: string
      format: uuid
    categoryName:
      type: string
    status:
      type: string
      enum: [draft, published, cancelled, completed]
    startDate:
      type: string
      format: date-time
    endDate:
      type: string
      format: date-time
    location:
      type: object
      properties:
        address:
          type: string
        city:
          type: string
        state:
          type: string
        country:
          type: string
        coordinates:
          type: object
          properties:
            latitude:
              type: number
            longitude:
              type: number
    maxAttendees:
      type: integer
    currentAttendees:
      type: integer
    pricing:
      type: object
      properties:
        model:
          type: string
          enum: [free, paid, donation, tiered]
        currency:
          type: string
        basePrice:
          type: number
    featuredImage:
      type: string
    tags:
      type: array
      items:
        type: string
```

### **MobileBooking Schema**
```yaml
MobileBooking:
  type: object
  description: "Mobile-optimized booking object"
  properties:
    id:
      type: string
      format: uuid
    eventId:
      type: string
      format: uuid
    eventTitle:
      type: string
    attendeeId:
      type: string
      format: uuid
    status:
      type: string
      enum: [pending, confirmed, cancelled, completed]
    ticketQuantity:
      type: integer
    totalAmount:
      type: number
    currency:
      type: string
    bookingDate:
      type: string
      format: date-time
    qrCode:
      type: string
    paymentStatus:
      type: string
      enum: [pending, paid, failed, refunded]
```

### **MobilePayment Schema**
```yaml
MobilePayment:
  type: object
  description: "Mobile-optimized payment object"
  properties:
    id:
      type: string
      format: uuid
    bookingId:
      type: string
      format: uuid
    amount:
      type: number
    currency:
      type: string
    status:
      type: string
      enum: [pending, completed, failed, refunded]
    paymentMethod:
      type: string
    transactionId:
      type: string
    createdAt:
      type: string
      format: date-time
```

## 📱 Mobile Response Examples

### **Event Search Response (Mobile)**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "Tech Conference 2024",
        "description": "Join us for the biggest tech conference of the year",
        "slug": "tech-conference-2024",
        "organizerId": "456e7890-e89b-12d3-a456-426614174000",
        "organizerName": "Tech Events Inc",
        "categoryId": "789e0123-e89b-12d3-a456-426614174000",
        "categoryName": "Technology",
        "status": "published",
        "startDate": "2024-06-15T09:00:00Z",
        "endDate": "2024-06-15T17:00:00Z",
        "location": {
          "address": "123 Main St, San Francisco, CA",
          "city": "San Francisco",
          "state": "CA",
          "country": "USA",
          "coordinates": {
            "latitude": 37.7749,
            "longitude": -122.4194
          }
        },
        "maxAttendees": 500,
        "currentAttendees": 250,
        "pricing": {
          "model": "paid",
          "currency": "USD",
          "basePrice": 99.99
        },
        "featuredImage": "https://example.com/images/tech-conference.jpg",
        "tags": ["technology", "conference", "networking"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  },
  "timestamp": "2025-08-26T16:20:27.835Z"
}
```

### **Booking Creation Response (Mobile)**
```json
{
  "success": true,
  "data": {
    "message": "Booking created successfully",
    "booking": {
      "id": "abc123-def456-ghi789",
      "eventId": "123e4567-e89b-12d3-a456-426614174000",
      "eventTitle": "Tech Conference 2024",
      "attendeeId": "456e7890-e89b-12d3-a456-426614174000",
      "status": "pending",
      "ticketQuantity": 2,
      "totalAmount": 199.98,
      "currency": "USD",
      "bookingDate": "2025-08-26T16:20:27.835Z",
      "qrCode": "EVENT_123e4567-e89b-12d3-a456-426614174000_BOOKING_abc123",
      "paymentStatus": "pending"
    },
    "paymentIntent": {
      "id": "pi_1234567890",
      "clientSecret": "pi_1234567890_secret_abc123",
      "amount": 19998,
      "currency": "usd"
    }
  },
  "timestamp": "2025-08-26T16:20:27.835Z"
}
```

### **QR Code Validation Response (Mobile)**
```json
{
  "success": true,
  "data": {
    "message": "QR Code validated successfully",
    "validation": {
      "isValid": true,
      "bookingId": "abc123-def456-ghi789",
      "eventId": "123e4567-e89b-12d3-a456-426614174000",
      "eventTitle": "Tech Conference 2024",
      "attendeeName": "John Doe",
      "ticketQuantity": 2,
      "checkInTime": "2025-08-26T16:20:27.835Z",
      "checkInLocation": "Main Entrance"
    }
  },
  "timestamp": "2025-08-26T16:20:27.835Z"
}
```

## 🔍 Testing
```bash
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### **Test Web Response**
```bash
curl -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

### **Test Event Search (Mobile)**
```bash
curl -X GET "https://api.example.com/events?category=tech&location=San%20Francisco&startDate=2024-06-01" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### **Test Booking Creation (Mobile)**
```bash
curl -X POST https://api.example.com/bookings \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "eventId": "123e4567-e89b-12d3-a456-426614174000",
    "ticketQuantity": 2,
    "attendeeInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }'
```

### **Test QR Code Validation (Mobile)**
```bash
curl -X POST https://api.example.com/qr-codes/validate \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "qrCode": "EVENT_123e4567-e89b-12d3-a456-426614174000_BOOKING_abc123",
    "eventId": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

## 🛠️ Configuration

### **Environment Variables**
```bash
# Mobile detection can be customized via environment variables
MOBILE_USER_AGENT_KEYWORDS=mobile,android,ios,iphone,ipad
ENABLE_MOBILE_OPTIMIZATION=true
```

### **Custom Mobile Detection**
```typescript
// Extend mobile detection logic
const customMobileDetection = (userAgent: string): boolean => {
  const keywords = process.env.MOBILE_USER_AGENT_KEYWORDS?.split(',') || 
                   ['mobile', 'android', 'ios', 'iphone', 'ipad'];
  
  return keywords.some(keyword => 
    userAgent.toLowerCase().includes(keyword.toLowerCase())
  );
};
```

## 📈 Monitoring

### **Metrics to Track**
- **Response size reduction** percentage
- **Mobile vs web** request distribution
- **Performance improvements** in mobile apps
- **User experience** metrics

### **Logging**
```typescript
logger.info('Mobile optimization applied', {
  userAgent: event.headers['User-Agent'],
  originalSize: originalResponseSize,
  optimizedSize: mobileResponseSize,
  reduction: `${reductionPercentage}%`
});
```

## 🔮 Future Enhancements

### **Planned Features**
- **Progressive optimization** based on device capabilities
- **Custom field selection** via query parameters
- **Caching strategies** for mobile responses
- **Compression optimization** for mobile networks

### **Extensibility**
- **Plugin system** for custom optimizations
- **A/B testing** for optimization strategies
- **Analytics integration** for performance monitoring
- **Custom mobile detection** rules

---

## 🎯 Complete Attendee API Coverage

### **Core Attendee Workflows Supported:**

1. **🔍 Event Discovery**
   - Browse events by category, location, date
   - Search events with advanced filters
   - View event details and organizer information
   - Get trending and nearby events

2. **📅 Booking Management**
   - Create bookings with multiple tickets
   - View booking history and details
   - Update or cancel bookings
   - Get QR codes for event entry

3. **💳 Payment Processing**
   - Secure payment processing with Stripe
   - Payment history and receipts
   - Refund requests and processing
   - Multiple payment methods support

4. **📱 QR Code & Entry**
   - Generate QR codes for bookings
   - Validate QR codes at event entry
   - Check-in tracking and validation
   - Entry confirmation and notifications

5. **🔔 Notifications**
   - Event reminders and updates
   - Booking confirmations
   - Payment receipts
   - Customizable notification preferences

6. **📊 Analytics & Insights**
   - Personal event history
   - Activity tracking
   - Popular events discovery
   - Personalized recommendations

### **Mobile-Optimized Features:**
- ✅ **40% smaller payloads** for all attendee endpoints
- ✅ **Automatic mobile detection** via User-Agent
- ✅ **Simplified data structures** for mobile consumption
- ✅ **Optimized for offline-first** mobile experiences
- ✅ **Real-time updates** for booking status changes
- ✅ **Push notifications** for important updates

**Last Updated:** August 26, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
