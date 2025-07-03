from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import os
from datetime import datetime
import uuid
import asyncio
from dotenv import load_dotenv
from google import genai

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

# Gemini API configuration
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')

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
        
        print(f"Gemini response: {response}")
        print(f"Response text: {response.text}")
        
        # Parse the JSON response
        import json
        try:
            # Extract text from response
            response_text = response.text
            analysis_data = json.loads(response_text)
            return analysis_data
        except json.JSONDecodeError as je:
            print(f"JSON decode error: {je}")
            print(f"Raw response text: {response_text}")
            # Fallback if JSON parsing fails
            return {
                "strength_score": 50,
                "strength_level": "moderate",
                "weaknesses": ["Unable to parse detailed analysis"],
                "crack_time": {
                    "brute_force": "Unknown",
                    "dictionary_attack": "Unknown",
                    "rainbow_table": "Unknown"
                },
                "suggestions": ["Consider using a longer password with mixed characters"],
                "explanation": "Analysis completed with limited details due to parsing error."
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
    
    # Store in database
    password_analyses.insert_one({
        "analysis_id": analysis_id,
        "session_id": request.session_id,
        "password_masked": password_masked,
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
    """Get password analysis history for a session"""
    try:
        analyses = list(password_analyses.find(
            {"session_id": session_id},
            {"_id": 0}  # Exclude MongoDB _id field
        ).sort("timestamp", -1))
        
        return {"analyses": analyses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching history: {str(e)}")

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