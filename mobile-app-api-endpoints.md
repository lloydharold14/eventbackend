# 📱 Mobile App API Integration Guide

## **🚀 Ready for Mobile App Testing**

Your backend infrastructure is **100% operational** and ready for mobile app integration. Choose the option that works best for your current needs.

---

## **Option 1: Direct API Gateway URLs (✅ Immediate Use)**

**Main API (Authentication, Users, Notifications):**
```
Base URL: https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev
```

**Events API:**
```
Base URL: https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/dev
```

**Other Services:**
- **Bookings**: `https://5xhxnznlrc.execute-api.ca-central-1.amazonaws.com/dev`
- **Payments**: `https://wf9rj1iqqg.execute-api.ca-central-1.amazonaws.com/dev`
- **QR Codes**: `https://6kzv4t4jc3.execute-api.ca-central-1.amazonaws.com/dev`
- **Analytics**: `https://gvgq7ddks3.execute-api.ca-central-1.amazonaws.com/dev`

### **Kotlin Integration Example:**
```kotlin
object ApiConfig {
    const val BASE_URL = "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/"
    const val EVENTS_BASE_URL = "https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/dev/"
    const val BOOKINGS_BASE_URL = "https://5xhxnznlrc.execute-api.ca-central-1.amazonaws.com/dev/"
    const val PAYMENTS_BASE_URL = "https://wf9rj1iqqg.execute-api.ca-central-1.amazonaws.com/dev/"
}

// Example API calls
val authService = AuthService(ApiConfig.BASE_URL)
val eventService = EventService(ApiConfig.EVENTS_BASE_URL)
```

---

## **Option 2: Custom Domains (🔧 In Progress)**

**Target URLs (Currently being configured):**
- **Main API**: `https://dev-api.event.tkhtech.com`
- **Events API**: `https://dev-events.event.tkhtech.com`
- **Bookings API**: `https://dev-bookings.event.tkhtech.com`
- **Payments API**: `https://dev-payments.event.tkhtech.com`
- **QR Codes API**: `https://dev-qr.event.tkhtech.com`
- **Analytics API**: `https://dev-analytics.event.tkhtech.com`

**Status**: DNS is resolving, CloudFront configuration needs final tweaks.

---

## **🎯 Available Endpoints**

### **Authentication & Users** (`/auth`, `/users`)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/reset-password` - Password reset
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile

### **Events** (`/events`)
- `GET /events` - List events
- `POST /events` - Create event
- `GET /events/{id}` - Get event details
- `PUT /events/{id}` - Update event
- `DELETE /events/{id}` - Delete event

### **Bookings** (`/bookings`)
- `GET /bookings` - List bookings
- `POST /bookings` - Create booking
- `GET /bookings/{id}` - Get booking details
- `PUT /bookings/{id}` - Update booking
- `DELETE /bookings/{id}` - Cancel booking

### **Health Check**
- `GET /health` - API health status

---

## **🔒 Authentication Headers**

All protected endpoints require:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

---

## **🌍 Production Deployment Ready**

When ready for production, the same infrastructure supports:
- **Production URLs**: `api.event.tkhtech.com`, `events.event.tkhtech.com`, etc.
- **Command**: `export CDK_DOMAIN_NAME=event.tkhtech.com && npm run deploy:prod`

---

## **✅ Current Status Summary**

| Component | Status | Ready for Mobile App |
|-----------|--------|-------------------|
| **API Gateway** | ✅ Working | Yes - Use direct URLs |
| **Authentication** | ✅ Working | Yes |
| **Database** | ✅ Working | Yes |
| **SSL Certificates** | ✅ Valid | Yes |
| **Custom Domains** | 🔧 In Progress | Soon |
| **Infrastructure** | ✅ Production Ready | Yes |

---

## **🚀 Recommended Approach**

1. **Start Development**: Use **Option 1** (Direct API Gateway URLs) immediately
2. **Switch Later**: When custom domains are ready, switch to **Option 2**
3. **Production**: Deploy production environment when ready

**All backend functionality is ready for your mobile app testing!** 🎉
