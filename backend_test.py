#!/usr/bin/env python3
import requests
import json
import uuid
import time
import sys
from pprint import pprint

# Configuration
BASE_URL = "http://localhost:8001"
API_BASE_URL = f"{BASE_URL}/api"

# Test session ID
TEST_SESSION_ID = str(uuid.uuid4())

# Test passwords with different strength levels
TEST_PASSWORDS = {
    "weak": ["123456", "password", "qwerty", "admin"],
    "moderate": ["Password123", "Summer2024!", "Hello@World"],
    "strong": ["P@ssw0rd!2024#Secure", "Th1s!Is@V3ry#Str0ng&P@ssw0rd", "9Ux$2pL7*mZ5vB3!kD8"]
}

# Edge cases
EDGE_CASES = {
    "empty": "",
    "very_long": "a" * 100 + "B" * 100 + "1" * 100 + "!" * 100,
    "special_chars": "!@#$%^&*()_+-=[]{}|;':\",./<>?",
    "unicode": "пароль123密码测试",
    "spaces": "password with spaces",
    "sql_injection": "password' OR 1=1--"
}

def print_separator(title):
    """Print a separator with a title"""
    print("\n" + "=" * 80)
    print(f" {title} ".center(80, "="))
    print("=" * 80 + "\n")

def test_health_endpoint():
    """Test the health check endpoint"""
    print_separator("Testing Health Endpoint")
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        print(f"Status Code: {response.status_code}")
        print("Response:")
        pprint(response.json())
        
        assert response.status_code == 200, "Health endpoint should return 200 OK"
        assert response.json()["status"] == "healthy", "Health status should be 'healthy'"
        assert response.json()["gemini_configured"] is True, "Gemini API should be configured"
        assert response.json()["gemini_key_length"] > 0, "Gemini API key should be present"
        
        print("✅ Health endpoint test passed")
        return True
    except Exception as e:
        print(f"❌ Health endpoint test failed: {e}")
        return False

def test_password_analysis(password, session_id, expected_strength=None):
    """Test the password analysis endpoint with a specific password"""
    try:
        payload = {
            "password": password,
            "session_id": session_id
        }
        
        response = requests.post(f"{API_BASE_URL}/analyze-password", json=payload)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("Response:")
            pprint(result)
            
            # Validate response structure
            assert "analysis_id" in result, "Response should contain analysis_id"
            assert "password_masked" in result, "Response should contain password_masked"
            assert "strength_score" in result, "Response should contain strength_score"
            assert "strength_level" in result, "Response should contain strength_level"
            assert "weaknesses" in result, "Response should contain weaknesses"
            assert "crack_time" in result, "Response should contain crack_time"
            assert "suggestions" in result, "Response should contain suggestions"
            assert "explanation" in result, "Response should contain explanation"
            assert "timestamp" in result, "Response should contain timestamp"
            
            # Validate strength level if expected
            if expected_strength and result["strength_level"] != expected_strength:
                print(f"⚠️ Warning: Expected strength '{expected_strength}' but got '{result['strength_level']}'")
            
            print(f"✅ Password analysis test passed for: {password}")
            return result
        else:
            print(f"❌ Password analysis test failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Password analysis test failed with exception: {e}")
        return None

def test_analysis_history(session_id, expected_count=None):
    """Test the analysis history endpoint"""
    try:
        response = requests.get(f"{API_BASE_URL}/analysis-history/{session_id}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"Found {len(result['analyses'])} analyses in history")
            
            if expected_count is not None:
                assert len(result['analyses']) == expected_count, f"Expected {expected_count} analyses, got {len(result['analyses'])}"
            
            # Validate structure of first analysis if available
            if result['analyses']:
                first_analysis = result['analyses'][0]
                assert "analysis_id" in first_analysis, "Analysis should contain analysis_id"
                assert "password_masked" in first_analysis, "Analysis should contain password_masked"
                assert "strength_score" in first_analysis, "Analysis should contain strength_score"
                assert "strength_level" in first_analysis, "Analysis should contain strength_level"
            
            print(f"✅ Analysis history test passed for session: {session_id}")
            return result
        else:
            print(f"❌ Analysis history test failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Analysis history test failed with exception: {e}")
        return None

def test_invalid_session_history():
    """Test the analysis history endpoint with an invalid session ID"""
    print_separator("Testing Invalid Session History")
    
    invalid_session = str(uuid.uuid4())
    try:
        response = requests.get(f"{API_BASE_URL}/analysis-history/{invalid_session}")
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            assert len(result['analyses']) == 0, "Should return empty analyses for invalid session"
            print("✅ Invalid session history test passed (empty result)")
            return True
        else:
            print(f"❌ Invalid session history test failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Invalid session history test failed with exception: {e}")
        return False

def test_empty_password():
    """Test the password analysis endpoint with an empty password"""
    print_separator("Testing Empty Password")
    
    try:
        payload = {
            "password": "",
            "session_id": TEST_SESSION_ID
        }
        
        response = requests.post(f"{API_BASE_URL}/analyze-password", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Should return 400 Bad Request for empty password
        assert response.status_code == 400, "Empty password should return 400 Bad Request"
        
        print("✅ Empty password test passed")
        return True
    except Exception as e:
        print(f"❌ Empty password test failed with exception: {e}")
        return False

def run_all_tests():
    """Run all tests"""
    print_separator("Starting Password Strength Intelligence API Tests")
    
    # Test health endpoint
    health_ok = test_health_endpoint()
    if not health_ok:
        print("❌ Health check failed, stopping tests")
        return False
    
    # Test password analysis with different strength levels
    print_separator("Testing Password Analysis - Weak Passwords")
    weak_results = []
    for password in TEST_PASSWORDS["weak"]:
        result = test_password_analysis(password, TEST_SESSION_ID, "weak")
        if result:
            weak_results.append(result)
    
    print_separator("Testing Password Analysis - Moderate Passwords")
    moderate_results = []
    for password in TEST_PASSWORDS["moderate"]:
        result = test_password_analysis(password, TEST_SESSION_ID, "moderate")
        if result:
            moderate_results.append(result)
    
    print_separator("Testing Password Analysis - Strong Passwords")
    strong_results = []
    for password in TEST_PASSWORDS["strong"]:
        result = test_password_analysis(password, TEST_SESSION_ID, "strong")
        if result:
            strong_results.append(result)
    
    # Test edge cases
    print_separator("Testing Password Analysis - Edge Cases")
    for case_name, password in EDGE_CASES.items():
        if case_name == "empty":
            test_empty_password()
        else:
            print(f"\nTesting edge case: {case_name}")
            test_password_analysis(password, TEST_SESSION_ID)
    
    # Test analysis history
    print_separator("Testing Analysis History")
    expected_count = len(weak_results) + len(moderate_results) + len(strong_results) + len(EDGE_CASES) - 1  # -1 for empty password
    history_result = test_analysis_history(TEST_SESSION_ID, expected_count)
    
    # Test invalid session history
    test_invalid_session_history()
    
    # Test MongoDB data persistence by creating a new session and verifying it's empty
    print_separator("Testing MongoDB Data Persistence")
    new_session_id = str(uuid.uuid4())
    print(f"Testing new session: {new_session_id}")
    
    # First verify it's empty
    new_session_history = test_analysis_history(new_session_id, 0)
    
    # Then add a password analysis
    test_password = "TestingMongoDBPersistence!123"
    print(f"\nAdding password analysis to new session")
    test_password_analysis(test_password, new_session_id)
    
    # Verify it now has one entry
    updated_history = test_analysis_history(new_session_id, 1)
    
    print_separator("All Tests Completed")
    return True

if __name__ == "__main__":
    run_all_tests()