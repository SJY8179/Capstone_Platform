#!/bin/bash

# Bash Authentication Smoke Test Script
BASE_URL="${1:-http://localhost:8080/api}"
COOKIE_FILE="$(mktemp)"
TESTS_PASSED=0
TOTAL_TESTS=8
TEST_EMAIL="smoketest_$(date +%Y%m%d%H%M%S)@example.com"
TEST_PASSWORD="testpass123"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test HTTP status
test_http_status() {
    local response_code=$1
    local expected_code=$2
    local test_name="$3"
    
    if [ "$response_code" -eq "$expected_code" ]; then
        echo -e "${GREEN}✓ $test_name - Status: $response_code${NC}"
        return 0
    else
        echo -e "${RED}✗ $test_name - Expected: $expected_code, Got: $response_code${NC}"
        return 1
    fi
}

# Function to make HTTP requests
make_request() {
    local method="$1"
    local url="$2"
    local data="$3"
    local use_cookies="$4"
    
    local curl_args=("-s" "-w" "%{http_code}" "-o" "/dev/null")
    
    if [ "$use_cookies" = "true" ]; then
        curl_args+=("-c" "$COOKIE_FILE" "-b" "$COOKIE_FILE")
    fi
    
    if [ "$method" = "POST" ]; then
        curl_args+=("-X" "POST" "-H" "Content-Type: application/json")
        if [ -n "$data" ]; then
            curl_args+=("-d" "$data")
        fi
    fi
    
    curl "${curl_args[@]}" "$url"
}

echo -e "${YELLOW}Starting Authentication Smoke Tests...${NC}"
echo -e "${YELLOW}Base URL: $BASE_URL${NC}"
echo ""

# Cleanup function
cleanup() {
    rm -f "$COOKIE_FILE"
}
trap cleanup EXIT

# Test 1: User Registration
echo "1. Testing user registration..."
register_data="{\"name\":\"Smoke Test User\",\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
register_code=$(make_request "POST" "$BASE_URL/auth/register" "$register_data" "false")

if test_http_status "$register_code" "200" "User Registration"; then
    ((TESTS_PASSED++))
fi

# Test 2: User Login (with session)
echo "2. Testing user login..."
login_data="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
login_code=$(make_request "POST" "$BASE_URL/auth/login" "$login_data" "true")

if test_http_status "$login_code" "200" "User Login"; then
    ((TESTS_PASSED++))
    # Check for JSESSIONID cookie
    if grep -q "JSESSIONID" "$COOKIE_FILE"; then
        echo -e "  ${GREEN}✓ JSESSIONID cookie found${NC}"
    else
        echo -e "  ${RED}✗ JSESSIONID cookie not found${NC}"
    fi
fi

# Test 3: /auth/me endpoint
echo "3. Testing /auth/me endpoint..."
me_code=$(make_request "GET" "$BASE_URL/auth/me" "" "true")

if test_http_status "$me_code" "200" "/auth/me with session"; then
    ((TESTS_PASSED++))
fi

# Test 4: /projects without authentication
echo "4. Testing /projects without authentication..."
projects_no_auth_code=$(make_request "GET" "$BASE_URL/projects" "" "false")

if test_http_status "$projects_no_auth_code" "403" "Projects without auth"; then
    ((TESTS_PASSED++))
fi

# Test 5: /projects with authentication
echo "5. Testing /projects with authentication..."
projects_auth_code=$(make_request "GET" "$BASE_URL/projects" "" "true")

if test_http_status "$projects_auth_code" "200" "Projects with auth"; then
    ((TESTS_PASSED++))
fi

# Test 6: Logout
echo "6. Testing logout..."
logout_code=$(make_request "POST" "$BASE_URL/auth/logout" "" "true")

if test_http_status "$logout_code" "200" "Logout"; then
    ((TESTS_PASSED++))
fi

# Test 7: /projects after logout
echo "7. Testing /projects after logout..."
projects_after_logout_code=$(make_request "GET" "$BASE_URL/projects" "" "true")

if test_http_status "$projects_after_logout_code" "403" "Projects after logout"; then
    ((TESTS_PASSED++))
fi

# Test 8: Health check
echo "8. Testing health endpoint..."
health_code=$(make_request "GET" "$BASE_URL/actuator/health" "" "false")

if test_http_status "$health_code" "200" "Health check"; then
    ((TESTS_PASSED++))
fi

echo ""
if [ "$TESTS_PASSED" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}Test Results: $TESTS_PASSED/$TOTAL_TESTS passed${NC}"
    echo -e "${GREEN}All smoke tests passed! ✓${NC}"
    exit 0
else
    echo -e "${YELLOW}Test Results: $TESTS_PASSED/$TOTAL_TESTS passed${NC}"
    echo -e "${YELLOW}Some tests failed. Check the output above.${NC}"
    exit 1
fi