#!/bin/bash

echo "🔐 Creating First Admin User"
echo "============================"
echo ""

# Configuration
API_URL="https://r2nbmrglq6.execute-api.ca-central-1.amazonaws.com/dev"
ADMIN_EMAIL="admin@tkhtech.com"
ADMIN_PASSWORD="SecureAdminPass123!"
TABLE_NAME="UserManagement-dev-dev-users"
REGION="ca-central-1"

echo "📝 Step 1: Registering admin user..."
echo "Email: $ADMIN_EMAIL"

# Register the admin user
RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\",
    \"firstName\": \"System\",
    \"lastName\": \"Administrator\"
  }")

echo "Registration Response: $RESPONSE"

# Extract user ID from response
USER_ID=$(echo $RESPONSE | jq -r '.data.user.id // empty')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo "❌ Failed to register user. Response: $RESPONSE"
    exit 1
fi

echo "✅ User registered successfully!"
echo "User ID: $USER_ID"
echo ""

echo "📝 Step 2: Promoting user to admin role in DynamoDB..."

# Update user role to admin in DynamoDB
UPDATE_RESPONSE=$(aws dynamodb update-item \
  --table-name "$TABLE_NAME" \
  --key "{\"PK\":{\"S\":\"USER#$USER_ID\"},\"SK\":{\"S\":\"USER#$USER_ID\"}}" \
  --update-expression "SET #role = :role" \
  --expression-attribute-names '{"#role":"role"}' \
  --expression-attribute-values '{":role":{"S":"admin"}}' \
  --region "$REGION" \
  2>&1)

if [ $? -eq 0 ]; then
    echo "✅ User promoted to admin successfully!"
else
    echo "❌ Failed to promote user to admin:"
    echo "$UPDATE_RESPONSE"
    echo ""
    echo "Manual command to run:"
    echo "aws dynamodb update-item \\"
    echo "  --table-name \"$TABLE_NAME\" \\"
    echo "  --key '{\"PK\":{\"S\":\"USER#$USER_ID\"},\"SK\":{\"S\":\"USER#$USER_ID\"}}' \\"
    echo "  --update-expression \"SET #role = :role\" \\"
    echo "  --expression-attribute-names '{\"#role\":\"role\"}' \\"
    echo "  --expression-attribute-values '{\":role\":{\"S\":\"admin\"}}' \\"
    echo "  --region \"$REGION\""
    exit 1
fi

echo ""
echo "📝 Step 3: Testing admin login..."

# Test login
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$ADMIN_EMAIL\",
    \"password\": \"$ADMIN_PASSWORD\"
  }")

echo "Login Response: $LOGIN_RESPONSE"

# Extract token and role
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // empty')
ROLE=$(echo $LOGIN_RESPONSE | jq -r '.data.user.role // empty')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "❌ Failed to login admin user"
    exit 1
fi

if [ "$ROLE" != "admin" ]; then
    echo "⚠️ WARNING: User role is '$ROLE', not 'admin'. Role update may not have taken effect yet."
else
    echo "✅ Admin login successful!"
fi

echo ""
echo "🎉 SUCCESS! First admin user created!"
echo "=========================="
echo "👤 Admin Credentials:"
echo "   Email: $ADMIN_EMAIL"
echo "   Password: $ADMIN_PASSWORD"
echo "   User ID: $USER_ID"
echo "   JWT Token: $TOKEN"
echo ""
echo "📋 Next Steps:"
echo "1. Save the JWT token for admin operations"
echo "2. Import admin-postman-requests.json into Postman"
echo "3. Set the admin_token variable in Postman"
echo "4. Start managing users with admin privileges!"
echo ""
echo "🔧 Admin API Base URL: $API_URL"
echo ""
echo "🚀 You can now create more admins using the API!"
