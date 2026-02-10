#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="password123"
TOKEN=""

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASSED: $1${NC}"
    ((TESTS_PASSED++))
}

print_failure() {
    echo -e "${RED}✗ FAILED: $1${NC}"
    echo -e "${RED}  Response: $2${NC}"
    ((TESTS_FAILED++))
}

run_test() {
    ((TESTS_RUN++))
}

# Helper to extract HTTP code (last line) and body (all but last line)
extract_response() {
    local response="$1"
    HTTP_CODE=$(echo "$response" | tail -n1)
    HTTP_BODY=$(echo "$response" | sed '$d')
}

# Check if server is running
print_header "Checking Server Status"
print_test "Health check endpoint"
run_test

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/health")
extract_response "$HEALTH_RESPONSE"
HEALTH_BODY="$HTTP_BODY"
HEALTH_CODE="$HTTP_CODE"

if [ "$HEALTH_CODE" -eq 200 ] && echo "$HEALTH_BODY" | grep -q "ok"; then
    print_success "Health check returned 200 OK"
else
    print_failure "Health check failed" "$HEALTH_BODY (HTTP $HEALTH_CODE)"
    echo -e "${RED}Server is not running or not healthy. Exiting.${NC}"
    exit 1
fi

# Test Metrics Endpoint
print_test "Metrics endpoint"
run_test

METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/metrics")
extract_response "$METRICS_RESPONSE"
METRICS_CODE="$HTTP_CODE"

if [ "$METRICS_CODE" -eq 200 ]; then
    print_success "Metrics endpoint accessible"
else
    print_failure "Metrics endpoint failed" "HTTP $METRICS_CODE"
fi

# Test User Signup
print_header "Testing User Authentication"
print_test "User signup with valid credentials"
run_test

SIGNUP_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

extract_response "$SIGNUP_RESPONSE"
SIGNUP_BODY="$HTTP_BODY"
SIGNUP_CODE="$HTTP_CODE"

if [ "$SIGNUP_CODE" -eq 201 ]; then
    TOKEN=$(echo "$SIGNUP_BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        print_success "User signup successful, token received"
    else
        print_failure "User signup returned 201 but no token found" "$SIGNUP_BODY"
    fi
else
    print_failure "User signup failed" "$SIGNUP_BODY (HTTP $SIGNUP_CODE)"
fi

# Test Signup with Invalid Email
print_test "User signup with invalid email"
run_test

INVALID_SIGNUP=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/signup" \
    -H "Content-Type: application/json" \
    -d '{"email":"not-an-email","password":"password123"}')

extract_response "$INVALID_SIGNUP"
INVALID_CODE="$HTTP_CODE"

if [ "$INVALID_CODE" -eq 400 ]; then
    print_success "Invalid email rejected (400 Bad Request)"
else
    print_failure "Invalid email should return 400" "HTTP $INVALID_CODE"
fi

# Test Signup with Short Password
print_test "User signup with short password"
run_test

SHORT_PW=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test2@example.com\",\"password\":\"short\"}")

extract_response "$SHORT_PW"
SHORT_PW_CODE="$HTTP_CODE"

if [ "$SHORT_PW_CODE" -eq 400 ]; then
    print_success "Short password rejected (400 Bad Request)"
else
    print_failure "Short password should return 400" "HTTP $SHORT_PW_CODE"
fi

# Test Login with Correct Credentials
print_test "User login with correct credentials"
run_test

LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

extract_response "$LOGIN_RESPONSE"
LOGIN_BODY="$HTTP_BODY"
LOGIN_CODE="$HTTP_CODE"

if [ "$LOGIN_CODE" -eq 200 ]; then
    print_success "User login successful"
else
    print_failure "User login failed" "$LOGIN_BODY (HTTP $LOGIN_CODE)"
fi

# Test Login with Wrong Password
print_test "User login with wrong password"
run_test

WRONG_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"wrongpassword\"}")

extract_response "$WRONG_LOGIN"
WRONG_LOGIN_CODE="$HTTP_CODE"

if [ "$WRONG_LOGIN_CODE" -eq 401 ]; then
    print_success "Wrong password rejected (401 Unauthorized)"
else
    print_failure "Wrong password should return 401" "HTTP $WRONG_LOGIN_CODE"
fi

# Test Login with Nonexistent User
print_test "User login with nonexistent email"
run_test

NO_USER_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"nonexistent@example.com","password":"password123"}')

extract_response "$NO_USER_LOGIN"
NO_USER_CODE="$HTTP_CODE"

if [ "$NO_USER_CODE" -eq 401 ]; then
    print_success "Nonexistent user rejected (401 Unauthorized)"
else
    print_failure "Nonexistent user should return 401" "HTTP $NO_USER_CODE"
fi

# Test Protected Endpoint Without Auth
print_header "Testing Protected Endpoints"
print_test "Create message without authentication"
run_test

NO_AUTH=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/messages" \
    -H "Content-Type: application/json" \
    -d '{"content":"This should fail"}')

extract_response "$NO_AUTH"
NO_AUTH_CODE="$HTTP_CODE"

if [ "$NO_AUTH_CODE" -eq 401 ]; then
    print_success "Protected endpoint requires auth (401 Unauthorized)"
else
    print_failure "Protected endpoint should return 401 without auth" "HTTP $NO_AUTH_CODE"
fi

# Test Creating a Message
print_test "Create message with authentication"
run_test

CREATE_MSG=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/messages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"content":"Hello, this is a test message!","media_urls":[]}')

extract_response "$CREATE_MSG"
CREATE_MSG_BODY="$HTTP_BODY"
CREATE_MSG_CODE="$HTTP_CODE"

MESSAGE_ID=""
if [ "$CREATE_MSG_CODE" -eq 201 ]; then
    MESSAGE_ID=$(echo "$CREATE_MSG_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    if [ -n "$MESSAGE_ID" ]; then
        print_success "Message created successfully (ID: $MESSAGE_ID)"
    else
        print_failure "Message created but no ID found" "$CREATE_MSG_BODY"
    fi
else
    print_failure "Message creation failed" "$CREATE_MSG_BODY (HTTP $CREATE_MSG_CODE)"
fi

# Test Creating Message Without Content
print_test "Create message without content"
run_test

NO_CONTENT=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/messages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{"content":"","media_urls":[]}')

extract_response "$NO_CONTENT"
NO_CONTENT_CODE="$HTTP_CODE"

if [ "$NO_CONTENT_CODE" -eq 400 ]; then
    print_success "Empty content rejected (400 Bad Request)"
else
    print_failure "Empty content should return 400" "HTTP $NO_CONTENT_CODE"
fi

# Test Listing Messages
print_header "Testing Public Endpoints"
print_test "List all messages (public endpoint)"
run_test

LIST_MSG=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/messages")
extract_response "$LIST_MSG"
LIST_MSG_BODY="$HTTP_BODY"
LIST_MSG_CODE="$HTTP_CODE"

if [ "$LIST_MSG_CODE" -eq 200 ]; then
    print_success "Messages listed successfully"
else
    print_failure "Message listing failed" "$LIST_MSG_BODY (HTTP $LIST_MSG_CODE)"
fi

# Test Getting a Single Message
if [ -n "$MESSAGE_ID" ]; then
    print_test "Get single message by ID"
    run_test

    GET_MSG=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/messages/${MESSAGE_ID}")
    extract_response "$GET_MSG"
    GET_MSG_BODY="$HTTP_BODY"
    GET_MSG_CODE="$HTTP_CODE"

    if [ "$GET_MSG_CODE" -eq 200 ]; then
        print_success "Message retrieved successfully"
    else
        print_failure "Message retrieval failed" "$GET_MSG_BODY (HTTP $GET_MSG_CODE)"
    fi

    # Test Creating a Reply
    print_test "Create reply to message"
    run_test

    CREATE_REPLY=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/messages/${MESSAGE_ID}/replies" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${TOKEN}" \
        -d '{"content":"This is a reply to the message","media_urls":[]}')

    extract_response "$CREATE_REPLY"
    CREATE_REPLY_BODY="$HTTP_BODY"
    CREATE_REPLY_CODE="$HTTP_CODE"

    if [ "$CREATE_REPLY_CODE" -eq 201 ]; then
        REPLY_ID=$(echo "$CREATE_REPLY_BODY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        print_success "Reply created successfully (ID: $REPLY_ID)"
    else
        print_failure "Reply creation failed" "$CREATE_REPLY_BODY (HTTP $CREATE_REPLY_CODE)"
    fi

    # Test Listing Replies
    print_test "List replies for message"
    run_test

    LIST_REPLIES=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/messages/${MESSAGE_ID}/replies")
    extract_response "$LIST_REPLIES"
    LIST_REPLIES_BODY="$HTTP_BODY"
    LIST_REPLIES_CODE="$HTTP_CODE"

    if [ "$LIST_REPLIES_CODE" -eq 200 ]; then
        print_success "Replies listed successfully"
    else
        print_failure "Reply listing failed" "$LIST_REPLIES_BODY (HTTP $LIST_REPLIES_CODE)"
    fi
fi

# Test Getting Nonexistent Message
print_test "Get nonexistent message"
run_test

NO_MSG=$(curl -s -w "\n%{http_code}" "${API_BASE_URL}/api/v1/messages/00000000-0000-0000-0000-000000000000")
extract_response "$NO_MSG"
NO_MSG_CODE="$HTTP_CODE"

if [ "$NO_MSG_CODE" -eq 404 ]; then
    print_success "Nonexistent message returns 404"
else
    print_failure "Nonexistent message should return 404" "HTTP $NO_MSG_CODE"
fi

# Test Invalid Auth Token
print_test "Request with invalid token"
run_test

INVALID_TOKEN=$(curl -s -w "\n%{http_code}" -X POST "${API_BASE_URL}/api/v1/messages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid.token.here" \
    -d '{"content":"This should fail"}')

extract_response "$INVALID_TOKEN"
INVALID_TOKEN_CODE="$HTTP_CODE"

if [ "$INVALID_TOKEN_CODE" -eq 401 ]; then
    print_success "Invalid token rejected (401 Unauthorized)"
else
    print_failure "Invalid token should return 401" "HTTP $INVALID_TOKEN_CODE"
fi

# Test CORS (if needed)
print_header "Testing CORS"
print_test "OPTIONS request (CORS preflight)"
run_test

CORS=$(curl -s -w "\n%{http_code}" -X OPTIONS "${API_BASE_URL}/api/v1/messages" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: GET")

extract_response "$CORS"
CORS_CODE="$HTTP_CODE"

if [ "$CORS_CODE" -eq 204 ] || [ "$CORS_CODE" -eq 200 ]; then
    print_success "CORS preflight successful"
else
    print_failure "CORS preflight failed" "HTTP $CORS_CODE"
fi

# Print Summary
print_header "Test Summary"
echo -e "Total Tests: ${BLUE}${TESTS_RUN}${NC}"
echo -e "Passed:      ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed:      ${RED}${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! ✓${NC}\n"
    exit 0
else
    echo -e "\n${RED}Some tests failed. ✗${NC}\n"
    exit 1
fi
