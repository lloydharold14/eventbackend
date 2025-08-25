# Event Management Platform API Documentation

This directory contains the comprehensive API documentation for the Event Management Platform.

## 📋 Files

- **`openapi.yaml`** - OpenAPI 3.0 specification file
- **`api-documentation.html`** - Interactive API documentation viewer
- **`README.md`** - This documentation guide

## 🚀 Quick Start

### View Interactive Documentation

1. **Local Development:**
   ```bash
   # Navigate to the docs directory
   cd docs
   
   # Open the HTML file in your browser
   open api-documentation.html
   ```

2. **Using a Local Server:**
   ```bash
   # Using Python 3
   python3 -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Then open http://localhost:8000/api-documentation.html
   ```

### Online Documentation

You can also view the documentation using online OpenAPI viewers:

- **Swagger Editor:** https://editor.swagger.io/
- **Swagger UI Online:** https://petstore.swagger.io/
- **Redoc:** https://redocly.github.io/redoc/

Simply copy and paste the contents of `openapi.yaml` into any of these tools.

## 📚 API Overview

### Base URLs
- **Development:** `https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev`
- **Production:** `https://api.eventplatform.com`

### Authentication
- **JWT Bearer Token:** For authenticated endpoints
- **OAuth 2.0:** For social login integration

### Available Endpoints

#### 🔐 Authentication (6 endpoints)
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/change-password` - Password change
- `POST /auth/reset-password` - Password reset
- `POST /auth/confirm-reset` - Confirm password reset

#### 🔗 OAuth Integration (5 endpoints)
- `POST /auth/oauth/login` - OAuth login
- `GET /auth/oauth/authorization-url` - Get OAuth URL
- `POST /users/oauth/link` - Link OAuth account
- `POST /users/oauth/unlink` - Unlink OAuth account
- `GET /users/oauth/accounts` - Get linked accounts

#### 👤 User Profile (4 endpoints)
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `GET /users/{userId}` - Get user by ID
- `POST /users/verify-email` - Verify email
- `POST /users/verify-phone` - Verify phone

#### 🎉 Events (15+ endpoints)
- `GET /events` - List events
- `POST /events` - Create event
- `GET /events/{eventId}` - Get event by ID
- `PUT /events/{eventId}` - Update event
- `DELETE /events/{eventId}` - Delete event
- `POST /events/{eventId}/publish` - Publish event
- `POST /events/{eventId}/cancel` - Cancel event
- `POST /events/{eventId}/duplicate` - Duplicate event
- `GET /events/search` - Search events
- `GET /events/organizer/{organizerId}` - Get organizer events
- `GET /events/category/{categoryId}` - Get events by category
- `POST /events/{eventId}/media` - Add event media
- `GET /events/{eventId}/media` - Get event media
- `DELETE /events/{eventId}/media/{mediaId}` - Delete event media
- `POST /categories` - Create category
- `GET /categories` - List categories

#### 👨‍💼 Admin Functions (4 endpoints)
- `GET /admin/users` - List all users
- `DELETE /admin/users/{userId}` - Delete user
- `PUT /admin/users/{userId}/role` - Change user role
- `GET /admin/stats` - Get user statistics

#### 🏥 System (1 endpoint)
- `GET /health` - Health check

## 🔧 Testing the API

### Using the Interactive Documentation

1. Open `api-documentation.html` in your browser
2. Click on any endpoint to expand it
3. Click "Try it out" to test the endpoint
4. Fill in the required parameters
5. Click "Execute" to make the request

### Using cURL

```bash
# Health check
curl -X GET "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/health"

# User registration
curl -X POST "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "acceptTerms": true
  }'

# User login
curl -X POST "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### Using Postman

1. Import the OpenAPI specification into Postman
2. Set the base URL to the development environment
3. Use the collection to test all endpoints

## 📖 Schema Definitions

The OpenAPI specification includes comprehensive schema definitions for:

- **User** - User account information
- **UserProfile** - Extended user profile with preferences
- **Event** - Event details and metadata
- **CreateEventRequest** - Event creation payload
- **UpdateEventRequest** - Event update payload
- **LoginResponse** - Authentication response
- **TokenPair** - JWT token information
- **SuccessResponse** - Standard success response
- **ErrorResponse** - Standard error response
- **Pagination** - Pagination metadata

## 🔐 Authentication Examples

### JWT Bearer Token

```bash
# Include the token in the Authorization header
curl -X GET "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/users/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### OAuth 2.0

```bash
# OAuth login
curl -X POST "https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev/auth/oauth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "code": "OAUTH_AUTHORIZATION_CODE"
  }'
```

## 🛠️ Development

### Updating the Documentation

1. Edit `openapi.yaml` to add new endpoints or modify existing ones
2. Test the changes using the interactive documentation
3. Commit and push the changes

### Validation

```bash
# Validate the OpenAPI specification
npx @redocly/cli lint openapi.yaml

# Generate static documentation
npx @redocly/cli build-docs openapi.yaml -o docs/static
```

## 📞 Support

For questions about the API documentation:

- **Email:** support@eventplatform.com
- **GitHub Issues:** Create an issue in the repository
- **Documentation Updates:** Submit a pull request

## 🔄 Version History

- **v1.0.0** - Initial API documentation with User and Event Management services
- **v1.1.0** - Added OAuth 2.0 integration documentation
- **v1.2.0** - Added admin functions and comprehensive error handling

---

**Last Updated:** August 25, 2024  
**API Version:** 1.0.0  
**Status:** Production Ready
