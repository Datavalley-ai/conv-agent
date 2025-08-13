#!/bin/bash

# Production API Testing Script for AI Interviewer Platform
# This script tests all endpoints with proper Cloud Run authentication

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AI Interviewer Platform - Production API Tests${NC}"
echo "==============================================="

# Get service URL and authentication token
SERVICE_URL=$(gcloud run services describe interview-gateway --region=asia-south1 --format="value(status.url)")
ID_TOKEN=$(gcloud auth print-identity-token --audiences="$SERVICE_URL")

if [ -z "$SERVICE_URL" ] || [ -z "$ID_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get service URL or authentication token${NC}"
    exit 1
fi

echo -e "${YELLOW}🔗 Service URL: $SERVICE_URL${NC}"
echo -e "${YELLOW}🔑 Authentication: Token acquired${NC}"
echo ""

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ID_TOKEN" "$SERVICE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" -d "$data" "$SERVICE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS (HTTP $http_code)${NC}"
        PASSED=$((PASSED + 1))
        if [ ! -z "$response_body" ]; then
            echo "   Response: $(echo "$response_body" | head -c 100)..."
        fi
    else
        echo -e "${RED}❌ FAIL (HTTP $http_code, expected $expected_status)${NC}"
        echo "   Response: $(echo "$response_body" | head -c 200)..."
        FAILED=$((FAILED + 1))
    fi
    echo ""
}

# 1. Health Check Endpoints
echo -e "${YELLOW}📊 HEALTH CHECK ENDPOINTS${NC}"
echo "-------------------------"
test_endpoint "GET" "/api/v1/healthz" "" "200" "Health Check"

# 2. Authentication Endpoints
echo -e "${YELLOW}🔐 AUTHENTICATION ENDPOINTS${NC}"
echo "---------------------------"

# Register new user
USER_EMAIL="test-$(date +%s)@cloudrun.com"
REGISTER_DATA="{\"email\":\"$USER_EMAIL\",\"password\":\"password123\",\"firstName\":\"Test\",\"lastName\":\"User\",\"role\":\"interviewer\"}"
test_endpoint "POST" "/api/v1/auth/register" "$REGISTER_DATA" "201" "User Registration"

# Login user
LOGIN_DATA="{\"email\":\"$USER_EMAIL\",\"password\":\"password123\"}"
echo -n "Testing: User Login... "
login_response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $ID_TOKEN" -H "Content-Type: application/json" -X POST -d "$LOGIN_DATA" "$SERVICE_URL/api/v1/auth/login")
login_code=$(echo "$login_response" | tail -n1)
login_body=$(echo "$login_response" | head -n -1)

if [ "$login_code" = "200" ]; then
    echo -e "${GREEN}✅ PASS (HTTP $login_code)${NC}"
    PASSED=$((PASSED + 1))
    USER_JWT=$(echo "$login_body" | jq -r '.token' 2>/dev/null || echo "")
    echo "   JWT token acquired"
else
    echo -e "${RED}❌ FAIL (HTTP $login_code)${NC}"
    echo "   Response: $(echo "$login_body" | head -c 200)..."
    FAILED=$((FAILED + 1))
    USER_JWT=""
fi
echo ""

# Test protected endpoint with JWT
if [ "$USER_JWT" != "" ] && [ "$USER_JWT" != "null" ]; then
    echo -n "Testing: Get User Profile (with JWT)... "
    profile_response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $USER_JWT" "$SERVICE_URL/api/v1/auth/me")
    profile_code=$(echo "$profile_response" | tail -n1)
    
    if [ "$profile_code" = "200" ]; then
        echo -e "${GREEN}✅ PASS (HTTP $profile_code)${NC}"
        PASSED=$((PASSED + 1))
        profile_body=$(echo "$profile_response" | head -n -1)
        echo "   User verified"
    else
        echo -e "${RED}❌ FAIL (HTTP $profile_code)${NC}"
        FAILED=$((FAILED + 1))
    fi
    echo ""
fi

# 3. Test Error Handling
echo -e "${YELLOW}⚠️  ERROR HANDLING TESTS${NC}"
echo "----------------------" 
test_endpoint "GET" "/api/v1/nonexistent" "" "404" "404 Error Handling"

# Final Results
echo ""
echo "==============================================="
echo -e "${GREEN}📊 TEST RESULTS SUMMARY${NC}"
echo "==============================================="
echo -e "✅ PASSED: ${GREEN}$PASSED${NC}"
echo -e "❌ FAILED: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ALL TESTS PASSED! Your production API is working perfectly!${NC}"
    echo -e "${GREEN}🚀 AI Interviewer Platform is ready for production use!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
