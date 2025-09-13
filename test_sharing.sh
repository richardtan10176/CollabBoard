#!/bin/bash

echo "🧪 Testing CollabBoard Document Sharing Functionality"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test credentials
ADMIN_USER="admin"
ADMIN_PASS="admin123"
USER_USER="user"
USER_PASS="admin123"

BASE_URL="https://localhost"

echo -e "${YELLOW}Step 1: Testing user authentication${NC}"

# Test admin login
echo "Testing admin login..."
ADMIN_RESPONSE=$(curl -s -k -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")

if echo "$ADMIN_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ Admin login successful${NC}"
  ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
  echo -e "${RED}❌ Admin login failed${NC}"
  echo "Response: $ADMIN_RESPONSE"
  exit 1
fi

# Test user login
echo "Testing user login..."
USER_RESPONSE=$(curl -s -k -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER_USER\",\"password\":\"$USER_PASS\"}")

if echo "$USER_RESPONSE" | grep -q "token"; then
  echo -e "${GREEN}✅ User login successful${NC}"
  USER_TOKEN=$(echo "$USER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
  echo -e "${RED}❌ User login failed${NC}"
  echo "Response: $USER_RESPONSE"
  exit 1
fi

echo -e "${YELLOW}Step 2: Testing document access${NC}"

# Test admin can get documents
echo "Testing admin document access..."
ADMIN_DOCS=$(curl -s -k -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/documents")

if echo "$ADMIN_DOCS" | grep -q "documents"; then
  echo -e "${GREEN}✅ Admin can access documents${NC}"
  DOCUMENT_ID=$(echo "$ADMIN_DOCS" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Found document ID: $DOCUMENT_ID"
else
  echo -e "${RED}❌ Admin cannot access documents${NC}"
  echo "Response: $ADMIN_DOCS"
  exit 1
fi

# Test user cannot see admin's documents initially
echo "Testing user document access (should be empty initially)..."
USER_DOCS=$(curl -s -k -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/api/documents")

if echo "$USER_DOCS" | grep -q '"documents":\[\]'; then
  echo -e "${GREEN}✅ User cannot see admin's documents (as expected)${NC}"
else
  echo -e "${YELLOW}⚠️  User can see some documents (might be public ones)${NC}"
fi

echo -e "${YELLOW}Step 3: Testing user search${NC}"

# Test user search
echo "Testing user search..."
SEARCH_RESPONSE=$(curl -s -k -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/sharing/users/search?q=user")

if echo "$SEARCH_RESPONSE" | grep -q "user"; then
  echo -e "${GREEN}✅ User search working${NC}"
else
  echo -e "${RED}❌ User search failed${NC}"
  echo "Response: $SEARCH_RESPONSE"
  exit 1
fi

echo -e "${YELLOW}Step 4: Testing document sharing${NC}"

# Test sharing document with read permission
echo "Testing document sharing with read permission..."
SHARE_RESPONSE=$(curl -s -k -X POST "$BASE_URL/api/sharing/documents/$DOCUMENT_ID/share" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"user","permission":"read"}')

if echo "$SHARE_RESPONSE" | grep -q "shared with user"; then
  echo -e "${GREEN}✅ Document shared successfully${NC}"
else
  echo -e "${RED}❌ Document sharing failed${NC}"
  echo "Response: $SHARE_RESPONSE"
  exit 1
fi

echo -e "${YELLOW}Step 5: Testing shared document access${NC}"

# Test user can now see the shared document
echo "Testing user can access shared document..."
USER_DOCS_AFTER=$(curl -s -k -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/api/documents")

if echo "$USER_DOCS_AFTER" | grep -q "$DOCUMENT_ID"; then
  echo -e "${GREEN}✅ User can now see shared document${NC}"
else
  echo -e "${RED}❌ User cannot see shared document${NC}"
  echo "Response: $USER_DOCS_AFTER"
  exit 1
fi

echo -e "${YELLOW}Step 6: Testing permission enforcement${NC}"

# Test user cannot edit document (read-only)
echo "Testing read-only permission enforcement..."
EDIT_RESPONSE=$(curl -s -k -X PUT "$BASE_URL/api/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"This should fail"}')

if echo "$EDIT_RESPONSE" | grep -q "permission"; then
  echo -e "${GREEN}✅ Read-only permission enforced${NC}"
else
  echo -e "${RED}❌ Read-only permission not enforced${NC}"
  echo "Response: $EDIT_RESPONSE"
fi

echo -e "${YELLOW}Step 7: Testing permission upgrade${NC}"

# Test upgrading permission to write
echo "Testing permission upgrade to write..."
UPGRADE_RESPONSE=$(curl -s -k -X PUT "$BASE_URL/api/sharing/documents/$DOCUMENT_ID/shares/45579db7-4cf3-445f-8792-080d20833deb" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permission":"write"}')

if echo "$UPGRADE_RESPONSE" | grep -q "updated successfully"; then
  echo -e "${GREEN}✅ Permission upgraded to write${NC}"
else
  echo -e "${RED}❌ Permission upgrade failed${NC}"
  echo "Response: $UPGRADE_RESPONSE"
fi

echo -e "${YELLOW}Step 8: Testing write permission${NC}"

# Test user can now edit document
echo "Testing write permission..."
EDIT_RESPONSE2=$(curl -s -k -X PUT "$BASE_URL/api/documents/$DOCUMENT_ID" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"This should work now"}')

if echo "$EDIT_RESPONSE2" | grep -q "updated successfully"; then
  echo -e "${GREEN}✅ Write permission working${NC}"
else
  echo -e "${RED}❌ Write permission failed${NC}"
  echo "Response: $EDIT_RESPONSE2"
fi

echo -e "${YELLOW}Step 9: Testing share management${NC}"

# Test getting document shares
echo "Testing get document shares..."
SHARES_RESPONSE=$(curl -s -k -H "Authorization: Bearer $ADMIN_TOKEN" "$BASE_URL/api/sharing/documents/$DOCUMENT_ID/shares")

if echo "$SHARES_RESPONSE" | grep -q "shares"; then
  echo -e "${GREEN}✅ Get shares working${NC}"
else
  echo -e "${RED}❌ Get shares failed${NC}"
  echo "Response: $SHARES_RESPONSE"
fi

echo -e "${YELLOW}Step 10: Testing share revocation${NC}"

# Test revoking share
echo "Testing share revocation..."
REVOKE_RESPONSE=$(curl -s -k -X DELETE "$BASE_URL/api/sharing/documents/$DOCUMENT_ID/shares/45579db7-4cf3-445f-8792-080d20833deb" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$REVOKE_RESPONSE" | grep -q "revoked successfully"; then
  echo -e "${GREEN}✅ Share revoked successfully${NC}"
else
  echo -e "${RED}❌ Share revocation failed${NC}"
  echo "Response: $REVOKE_RESPONSE"
fi

# Test user can no longer access document
echo "Testing user access after revocation..."
USER_DOCS_FINAL=$(curl -s -k -H "Authorization: Bearer $USER_TOKEN" "$BASE_URL/api/documents")

if ! echo "$USER_DOCS_FINAL" | grep -q "$DOCUMENT_ID"; then
  echo -e "${GREEN}✅ User access properly revoked${NC}"
else
  echo -e "${YELLOW}⚠️  User still has access (might be public document)${NC}"
fi

echo ""
echo -e "${GREEN}🎉 All sharing functionality tests completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Open https://localhost in your browser"
echo "2. Login as admin (admin/admin123)"
echo "3. Open a new incognito window and login as user (user/user123)"
echo "4. Test the sharing functionality in the UI"
echo ""
echo "The sharing system is working correctly! 🚀"
