from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
import os
from datetime import datetime
import uuid
import asyncio
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

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
        # Create Gemini chat instance
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=session_id,
            system_message="""You are a cybersecurity expert specializing in password analysis. 
            Analyze passwords and provide detailed security assessments. Always respond in valid JSON format with the following structure:
            {
                "strength_score": <integer 0-100>,
                "strength_level": "<weak|moderate|strong>",
                "weaknesses": ["<weakness1>", "<weakness2>"],
                "crack_time": {
                    "brute_force": "<time estimate>",
                    "dictionary_attack": "<time estimate>",
                    "rainbow_table": "<time estimate>"
                },
                "suggestions": ["<suggestion1>", "<suggestion2>"],
                "explanation": "<detailed explanation of the analysis>"
            }"""
        ).with_model("gemini", "gemini-1.5-flash")

        # Create analysis prompt
        prompt = f"""Analyze this password for security strength: "{password}"

        Please provide a comprehensive security analysis including:
        1. Overall strength score (0-100)
        2. Strength level (weak/moderate/strong)
        3. Specific weaknesses found
        4. Estimated crack time for different attack methods
        5. Suggestions for improvement
        6. Detailed explanation of the analysis

        Consider factors like:
        - Length and complexity
        - Character variety (uppercase, lowercase, numbers, symbols)
        - Common patterns or dictionary words
        - Personal information patterns
        - Repeated characters or sequences

        Respond only in valid JSON format."""

        user_message = UserMessage(text=prompt)
        
        # Get response from Gemini
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        import json
        try:
            analysis_data = json.loads(response)
            return analysis_data
        except json.JSONDecodeError:
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