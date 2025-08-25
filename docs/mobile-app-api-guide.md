# 📱 Mobile App API Integration Guide

## 🚀 **Ready for Mobile App Development!**

Your Event Management Platform APIs are **partially operational** and ready for mobile app integration. Here's what's currently available and what's coming next.

### ✅ **Currently Available:**
- **User Registration & Authentication** (FULLY OPERATIONAL)
- **OAuth 2.0 Integration** (READY)
- **Event Discovery & Viewing** (FULLY OPERATIONAL)
- **Test Data** (10 organizers + 10 events in database)
- **Health Monitoring** (ACTIVE)

### 🚧 **Coming Soon:**
- **Booking System** (Infrastructure deployed, endpoints pending)
- **Payment Integration** (Next phase)

---

## 🎯 **Test Data Status**

✅ **10 Test Organizers** created in database  
✅ **10 Test Events** created in database  
✅ **Diverse Categories**: Music, Technology, Sports, Food, Arts, Business, Wellness, Startup, Film, Charity  
✅ **Multiple Price Points**: Free to $2,000  
✅ **Various Locations**: Toronto, Muskoka  
✅ **Realistic Data**: Images, descriptions, pricing, capacity

---

## 🌐 **API Base URLs**

### **Main API Gateway (Event Management)**
```
https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/
```

### **User Management API**
```
https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/
```

### **Booking Service API** (Infrastructure Deployed)
```
https://bxmcilkslg.execute-api.ca-central-1.amazonaws.com/prod/
```

---

## 🔐 **Authentication**

### **JWT Token Format**
```json
{
  "Authorization": "Bearer <your-jwt-token>"
}
```

### **Token Response Format**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attendee"
    }
  }
}
```

---

## 👤 **User Registration & Authentication**

### **1. User Registration**
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "attendee"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attendee",
      "emailVerified": false
    },
    "message": "Registration successful. Please check your email for verification."
  }
}
```

### **2. User Login**
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "attendee"
    }
  }
}
```

### **3. OAuth 2.0 Login (Google, Facebook, Apple)**
```http
POST /auth/oauth/login
Content-Type: application/json

{
  "provider": "google",
  "accessToken": "google-access-token",
  "userData": {
    "email": "user@gmail.com",
    "firstName": "John",
    "lastName": "Doe",
    "picture": "https://..."
  }
}
```

### **4. Refresh Token**
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### **5. Get User Profile**
```http
GET /users/profile
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "attendee",
    "emailVerified": true,
    "profilePicture": "https://...",
    "preferences": {
      "notifications": true,
      "newsletter": false
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 🎫 **Event Discovery & Viewing** (FULLY OPERATIONAL)

> **✅ Ready for Mobile App Integration**: All event discovery endpoints are now live and returning real data from the database.

### **Available Test Events in Database:**

1. **Summer Music Festival 2024** - $89.99 (General), $299.99 (VIP)
2. **Tech Innovation Summit 2024** - $299.99 (Early Bird), $499.99 (Regular)
3. **Toronto Marathon 2024** - $45 (10K), $75 (Half), $95 (Full)
4. **Toronto Food & Wine Festival** - $65 (Single Day), $120 (Weekend)
5. **Contemporary Art Exhibition** - $25 (Adult), $15 (Student)
6. **Canadian Business Leadership Summit** - $899.99 (Early Bird), $1,299.99 (Regular)
7. **Mindfulness & Wellness Retreat** - $399.99 (Shared), $599.99 (Private)
8. **Toronto Startup Meetup** - Free, $25 (Premium)
9. **Independent Film Festival** - $15 (Single), $45 (Day), $150 (Festival)
10. **Charity Gala Dinner** - $250 (Individual), $450 (Couple)

### **1. Get All Events (Public)** - ✅ OPERATIONAL
```http
GET /events?page=1&limit=20&category=music&location=Toronto
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event-001",
        "title": "Summer Music Festival 2024",
        "description": "Join us for the biggest summer music festival...",
        "startDate": "2024-07-15T18:00:00Z",
        "endDate": "2024-07-17T23:00:00Z",
        "location": {
          "address": "Exhibition Place",
          "city": "Toronto",
          "province": "ON",
          "country": "Canada",
          "coordinates": {
            "latitude": 43.6305,
            "longitude": -79.4204
          }
        },
        "organizer": {
          "id": "org-001",
          "name": "Music Festivals Inc",
          "email": "musicfest@example.com"
        },
        "category": "music",
        "pricing": [
          {
            "ticketType": "general",
            "price": 89.99,
            "currency": "CAD",
            "available": 5000,
            "description": "General admission for all three days"
          },
          {
            "ticketType": "vip",
            "price": 299.99,
            "currency": "CAD",
            "available": 500,
            "description": "VIP access with premium seating"
          }
        ],
        "images": [
          "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800"
        ],
        "status": "published",
        "maxAttendees": 10000,
        "currentAttendees": 2500,
        "tags": ["music", "festival", "summer", "live-music"],
        "features": ["parking", "food", "drinks", "merchandise", "vip-lounge"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 10,
      "totalPages": 1
    }
  }
}
```

### **2. Get Event by ID (Public)** - ✅ OPERATIONAL
```http
GET /events/event-001
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-001",
    "title": "Summer Music Festival 2024",
    "description": "Join us for the biggest summer music festival featuring top artists from around the world. Three days of amazing music, food, and entertainment in the heart of Toronto.",
    "startDate": "2024-07-15T18:00:00Z",
    "endDate": "2024-07-17T23:00:00Z",
    "location": {
      "address": "Exhibition Place",
      "city": "Toronto",
      "province": "ON",
      "country": "Canada",
      "postalCode": "M6K 3C3",
      "coordinates": {
        "latitude": 43.6305,
        "longitude": -79.4204
      }
    },
    "organizer": {
      "id": "org-001",
      "name": "Music Festivals Inc",
      "email": "musicfest@example.com",
      "phone": "+1-416-555-0101",
      "website": "https://musicfestivals.com"
    },
    "category": "music",
    "pricing": [
      {
        "ticketType": "general",
        "price": 89.99,
        "currency": "CAD",
        "available": 5000,
        "description": "General admission for all three days"
      },
      {
        "ticketType": "vip",
        "price": 299.99,
        "currency": "CAD",
        "available": 500,
        "description": "VIP access with premium seating and exclusive areas"
      }
    ],
    "images": [
      "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800",
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800"
    ],
    "status": "published",
    "maxAttendees": 10000,
    "currentAttendees": 2500,
    "tags": ["music", "festival", "summer", "live-music"],
    "features": ["parking", "food", "drinks", "merchandise", "vip-lounge"],
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### **3. Search Events** - ✅ OPERATIONAL
```http
GET /events/search?q=music&location=Toronto&date=2024-07&category=music&priceMin=50&priceMax=100
```

### **4. Get Event Categories** - ✅ OPERATIONAL
```http
GET /events/categories
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "music",
      "name": "Music",
      "description": "Music concerts and festivals",
      "icon": "🎵",
      "color": "#FF6B6B",
      "count": 1
    },
    {
      "id": "technology",
      "name": "Technology",
      "description": "Tech conferences and meetups",
      "icon": "💻",
      "color": "#45B7D1",
      "count": 1
    },
    {
      "id": "sports",
      "name": "Sports",
      "description": "Sports events and competitions",
      "icon": "⚽",
      "color": "#4ECDC4",
      "count": 1
    },
    {
      "id": "food",
      "name": "Food & Wine",
      "description": "Culinary events and tastings",
      "icon": "🍷",
      "color": "#FFA726",
      "count": 1
    },
    {
      "id": "arts",
      "name": "Arts & Culture",
      "description": "Art exhibitions and cultural events",
      "icon": "🎨",
      "color": "#AB47BC",
      "count": 1
    },
    {
      "id": "business",
      "name": "Business",
      "description": "Business conferences and summits",
      "icon": "💼",
      "color": "#26A69A",
      "count": 1
    },
    {
      "id": "wellness",
      "name": "Wellness",
      "description": "Health and wellness events",
      "icon": "🧘",
      "color": "#66BB6A",
      "count": 1
    },
    {
      "id": "startup",
      "name": "Startup",
      "description": "Startup events and meetups",
      "icon": "🚀",
      "color": "#FF7043",
      "count": 1
    },
    {
      "id": "film",
      "name": "Film",
      "description": "Film festivals and screenings",
      "icon": "🎬",
      "color": "#8D6E63",
      "count": 1
    },
    {
      "id": "charity",
      "name": "Charity",
      "description": "Charity and fundraising events",
      "icon": "❤️",
      "color": "#EF5350",
      "count": 1
    }
  ]
}
```

---

## 🎟️ **Booking & Reservations** (Infrastructure Deployed)

> **Note**: Booking service infrastructure is deployed. Endpoints will be available when Event Management endpoints are active.

### **Available Booking Endpoints (When Events are Ready):**

### **1. Create Booking (Requires Authentication)** - Coming Soon
```http
POST /bookings
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "eventId": "event-001",
  "items": [
    {
      "ticketType": "general",
      "quantity": 2
    }
  ],
  "attendeeInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "specialRequirements": ["wheelchair_access"]
  },
  "paymentMethodId": "pm_1234567890",
  "notes": "Please seat us together"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "booking-123",
    "userId": "user-123",
    "eventId": "event-001",
    "status": "pending",
    "items": [
      {
        "ticketType": "general",
        "quantity": 2,
        "unitPrice": 89.99,
        "totalPrice": 179.98
      }
    ],
    "totalAmount": 179.98,
    "currency": "CAD",
    "attendeeInfo": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "bookingDate": "2024-01-15T10:30:00Z",
    "eventDate": "2024-07-15T18:00:00Z",
    "expiresAt": "2024-01-15T11:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### **2. Get User Bookings** - Coming Soon
```http
GET /bookings/user
Authorization: Bearer <access-token>
```

### **3. Get Booking Details** - Coming Soon
```http
GET /bookings/booking-123
Authorization: Bearer <access-token>
```

### **4. Cancel Booking** - Coming Soon
```http
DELETE /bookings/booking-123
Authorization: Bearer <access-token>
```

### **5. Get Event Capacity** - Coming Soon
```http
GET /bookings/capacity/event-001
```

---

## 🔍 **Advanced Features**

### **1. Get Events by Location (Nearby)**
```http
GET /events?latitude=43.6532&longitude=-79.3832&radius=50
```

### **2. Get Events by Date Range**
```http
GET /events?startDate=2024-07-01&endDate=2024-07-31
```

### **3. Get Featured Events**
```http
GET /events?featured=true
```

### **4. Get Trending Events**
```http
GET /events?trending=true
```

---

## 📱 **Mobile App Integration Examples**

### **React Native Example**
```javascript
// API Configuration
const API_BASE_URL = 'https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev';

// Authentication
const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await response.json();
    if (data.success) {
      // Store tokens securely
      await SecureStore.setItemAsync('accessToken', data.data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.data.refreshToken);
      return data.data.user;
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};

// Get Events
const getEvents = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/events?${queryString}`);
    const data = await response.json();
    return data.data.events;
  } catch (error) {
    console.error('Get events error:', error);
  }
};

// Create Booking
const createBooking = async (bookingData) => {
  try {
    const token = await SecureStore.getItemAsync('accessToken');
    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingData),
    });
    
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Create booking error:', error);
  }
};
```

### **Flutter Example**
```dart
// API Service
class EventApiService {
  static const String baseUrl = 'https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev';
  
  // Login
  Future<User> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    
    final data = jsonDecode(response.body);
    if (data['success']) {
      // Store tokens
      await storage.write(key: 'accessToken', value: data['data']['accessToken']);
      return User.fromJson(data['data']['user']);
    }
    throw Exception('Login failed');
  }
  
  // Get Events
  Future<List<Event>> getEvents({Map<String, dynamic>? params}) async {
    final queryString = Uri(queryParameters: params).query;
    final response = await http.get(
      Uri.parse('$baseUrl/events?$queryString'),
    );
    
    final data = jsonDecode(response.body);
    return (data['data']['events'] as List)
        .map((event) => Event.fromJson(event))
        .toList();
  }
  
  // Create Booking
  Future<Booking> createBooking(BookingRequest request) async {
    final token = await storage.read(key: 'accessToken');
    final response = await http.post(
      Uri.parse('$baseUrl/bookings'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(request.toJson()),
    );
    
    final data = jsonDecode(response.body);
    return Booking.fromJson(data['data']);
  }
}
```

---

## 🛠️ **Error Handling**

### **Standard Error Response Format**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "email": "Must be a valid email address"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### **Common Error Codes**
- `VALIDATION_ERROR` (400) - Invalid input data
- `UNAUTHORIZED` (401) - Authentication required
- `FORBIDDEN` (403) - Insufficient permissions
- `NOT_FOUND` (404) - Resource not found
- `CONFLICT` (409) - Resource conflict
- `INTERNAL_ERROR` (500) - Server error

---

## 🎯 **Test Data for Development**

### **Available Test Events (In Database):**

| Event | Category | Price Range | Location | Date |
|-------|----------|-------------|----------|------|
| Summer Music Festival 2024 | Music | $89.99 - $299.99 | Toronto | July 15-17, 2024 |
| Tech Innovation Summit 2024 | Technology | $299.99 - $799.99 | Toronto | September 20-22, 2024 |
| Toronto Marathon 2024 | Sports | $45 - $95 | Toronto | October 20, 2024 |
| Toronto Food & Wine Festival | Food | $65 - $250 | Toronto | August 10-12, 2024 |
| Contemporary Art Exhibition | Arts | $15 - $60 | Toronto | November 15 - December 15, 2024 |
| Canadian Business Leadership Summit | Business | $899.99 - $1,999.99 | Toronto | June 25-27, 2024 |
| Mindfulness & Wellness Retreat | Wellness | $399.99 - $899.99 | Muskoka | July 5-7, 2024 |
| Toronto Startup Meetup | Startup | Free - $25 | Toronto | August 28, 2024 |
| Independent Film Festival | Film | $15 - $150 | Toronto | September 15-22, 2024 |
| Charity Gala Dinner | Charity | $250 - $2,000 | Toronto | December 7, 2024 |

### **Available Test Organizers (In Database):**

| Organizer | Company | Industry | Contact |
|-----------|---------|----------|---------|
| Sarah Johnson | Music Festivals Inc | Music | musicfest@example.com |
| Michael Chen | Tech Conferences Canada | Technology | techconf@example.com |
| David Rodriguez | Sports Events Toronto | Sports | sportsevents@example.com |
| Emma Thompson | Toronto Food Festival | Food | foodfestival@example.com |
| Lisa Wang | Contemporary Art Gallery | Arts | artgallery@example.com |
| James Wilson | Canadian Business Summit | Business | businesssummit@example.com |
| Maria Garcia | Wellness Retreats Canada | Wellness | wellnessretreat@example.com |
| Alex Brown | Toronto Startup Community | Startup | startupmeetup@example.com |
| Rachel Davis | Toronto Film Festival | Film | filmfestival@example.com |
| Robert Anderson | Charity Events Foundation | Charity | charitygala@example.com |

---

## 🔧 **Testing Your Integration**

### **1. Health Check**
```http
GET /health
```

### **2. Test User Registration**
```bash
curl -X POST https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "role": "attendee",
    "username": "testuser",
    "acceptTerms": true
  }'
```

### **3. Test User Login**
```bash
curl -X POST https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### **4. Test Event Listing** (Coming Soon)
```bash
# This endpoint will be available when Event Management is deployed
curl -X GET "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/events?limit=5"
```

---

## 📊 **API Status & Monitoring**

### **Current Status:**
- ✅ **User Management API**: `https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/` (OPERATIONAL)
- ✅ **Booking Service API**: `https://bxmcilkslg.execute-api.ca-central-1.amazonaws.com/prod/` (INFRASTRUCTURE DEPLOYED)
- ✅ **Event Management API**: `https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/prod/` (FULLY OPERATIONAL)

### **Health Checks:**
- **User Management**: `https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/health`
- **Event Management**: `https://a5sma74inf.execute-api.ca-central-1.amazonaws.com/prod/health`
- **Booking Service**: `https://bxmcilkslg.execute-api.ca-central-1.amazonaws.com/prod/health`

### **Database Status:**
- ✅ **Users Table**: `UserManagement-dev-dev-users` (11 records)
- ✅ **Events Table**: `EventManagement-dev-dev-events` (10 records)
- ✅ **Bookings Table**: `EventPlatform-Bookings-dev` (ready for data)

### **Monitoring:**
- **CloudWatch Logs**: Available in AWS Console
- **API Gateway Metrics**: Real-time monitoring
- **DynamoDB Metrics**: Performance tracking

---

## 🚀 **Ready to Start Building!**

Your APIs are **partially operational** and ready for mobile app development. You can start building your mobile app immediately with:

✅ **User Registration & Authentication** (FULLY OPERATIONAL)  
✅ **OAuth 2.0 Integration** (READY)  
✅ **Test Data** (10 organizers + 10 events in database)  
✅ **Booking Infrastructure** (DEPLOYED)  
✅ **Event Discovery & Search** (FULLY OPERATIONAL)  
🚧 **Booking Endpoints** (COMING SOON)  

### **What You Can Build Now:**

1. **User Authentication System**
   - Registration and login flows
   - OAuth 2.0 integration
   - User profile management

2. **App Foundation**
   - Navigation structure
   - UI components
   - State management

3. **Event Discovery UI** (with real API data)
   - Event listing screens
   - Event detail pages
   - Search and filtering UI

4. **Booking Flow UI** (with mock data)
   - Ticket selection
   - Payment forms
   - Booking confirmation

### **Event Endpoints Are Ready!**
- ✅ Real API calls are working
- 🚧 Booking functionality coming next
- 🚧 Real-time updates coming next

**Start building your mobile app today!** 📱✨

---

## 🛠️ **Development Recommendations**

### **Phase 1: Foundation (Start Now)**
1. **Set up your mobile app project** (React Native, Flutter, etc.)
2. **Implement user authentication** using the available endpoints
3. **Create the app navigation structure**
4. **Build UI components** for events, bookings, and user profiles

### **Phase 2: Real API Integration**
1. **Use the real API endpoints** that are now operational
2. **Build event discovery screens** with real data from the API
3. **Implement booking flow UI** with real event data
4. **Test with real user authentication**

### **Phase 3: Booking Integration**
1. **Integrate with booking endpoints** when they become available
2. **Enable full booking functionality**
3. **Add payment integration**
4. **Add real-time updates and notifications**

### **Recommended Tech Stack:**
- **Frontend**: React Native, Flutter, or native iOS/Android
- **State Management**: Redux, MobX, or Provider
- **HTTP Client**: Axios, Fetch, or Dio
- **Authentication**: JWT token management
- **Local Storage**: AsyncStorage, SharedPreferences, or Core Data

### **Development Timeline:**
- **Week 1-2**: App foundation and authentication
- **Week 3-4**: Event discovery UI with real API data
- **Week 5-6**: Booking flow and user profiles
- **Week 7-8**: Real API integration and testing

**Your Event Management Platform is ready for mobile app development!** 🎉
