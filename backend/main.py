import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

# Import tools
from tools import (
    get_market_price, 
    get_government_schemes, 
    get_weather_forecast, 
    recommend_crop, 
    diagnose_crop_disease
)

# Import Database
from database import client

# Import Routers
from routers import women_empowerment, chat_service, community, kisan_kendra, mandi

# ===============================
# Load .env from backend folder
# ===============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH)

# ===============================
# Get Gemini API Key
# ===============================
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    # raise RuntimeError("❌ GEMINI_API_KEY not found. Check backend/.env")
    print("Warning: GEMINI_API_KEY not found. Agentic chat will not work.")

if api_key:
    genai.configure(api_key=api_key)

# ===============================
import sys

try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# ===============================
# Lifecycle Manager (MongoDB)
# ===============================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("[INIT] Connecting to MongoDB Atlas...")
    try:
        await client.admin.command('ping')
        print("[SUCCESS] MongoDB Connected successfully!")
    except Exception as e:
        print(f"[ERROR] MongoDB Connection Failed: {e}")
    
    yield
    
    # Shutdown
    print("[SHUTDOWN] Closing MongoDB Connection...")
    client.close()

# ===============================
# FastAPI App
# ===============================
app = FastAPI(lifespan=lifespan)

# ===============================
# CORS Configuration
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # frontend ke liye open
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# Include Routers
# ===============================
app.include_router(women_empowerment.router)
app.include_router(chat_service.router)
app.include_router(community.router)
app.include_router(kisan_kendra.router)
app.include_router(mandi.router)

# ===============================
# Groq High-Speed Agent Config
# ===============================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print(f"[GROQ] Main agent initialized with model: {GROQ_MODEL}")
    except Exception as e:
        print(f"[GROQ] Main agent warning: {e}")

groq_tools = [
    {
        "type": "function",
        "function": {
            "name": "get_market_price",
            "description": "Retrieves current market prices (Mandi Bhav) for a specific crop in a given location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "crop_name": {"type": "string", "description": "Name of crop (e.g. Wheat, Onion, Tomato)"},
                    "location": {"type": "string", "description": "District or state (e.g. Pune, Punjab)"}
                },
                "required": ["crop_name", "location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_government_schemes",
            "description": "Provides details on agricultural government schemes (PM-Kisan, PMFBY, etc.).",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "description": "Category like general, loan, irrigation"}
                },
                "required": ["category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather_forecast",
            "description": "Retrieves 3-day weather forecast and rain alerts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Location name"}
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_crop",
            "description": "Recommends best crops based on soil, season, and location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "soil_type": {"type": "string", "description": "Soil type (Black, Red, Loamy)"},
                    "season": {"type": "string", "description": "Season (Kharif, Rabi, Summer)"},
                    "location": {"type": "string", "description": "Region or state"}
                },
                "required": ["soil_type", "season", "location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "diagnose_crop_disease",
            "description": "Identifies potential crop diseases and suggests remedies based on symptoms.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symptoms": {"type": "string", "description": "Symptoms description like yellow leaves"}
                },
                "required": ["symptoms"]
            }
        }
    }
]

TOOL_MAPPING = {
    "get_market_price": get_market_price,
    "get_government_schemes": get_government_schemes,
    "get_weather_forecast": get_weather_forecast,
    "recommend_crop": recommend_crop,
    "diagnose_crop_disease": diagnose_crop_disease,
}

# ===============================
# Gemini Model Config (Agentic)
# ===============================
MODEL_NAME = "gemini-2.5-flash-lite"

# Define the list of tools
tools_list = [
    get_market_price, 
    get_government_schemes, 
    get_weather_forecast, 
    recommend_crop, 
    diagnose_crop_disease
]

# System Instruction for the Persona
SYSTEM_INSTRUCTION = """
You are 'Krishi Sathi', an expert AI agricultural advisor for Indian farmers.
Your mission is to help farmers increase their yield and income.

CORE BEHAVIORS:
1. **Multilingual**: Always detect the language of the user's query and respond in the SAME language (English, Hindi, Marathi, etc.).
2. **Empathetic**: Use respectful and encouraging language (e.g., "Namaste", "Kisan Bhai").
3. **Data-Driven & Anti-Hallucination**: NEVER make up market prices, weather conditions, or schemes. ALWAYS use your TOOLS to fetch real data.
   - If asked about prices -> use `get_market_price`
   - If asked about rain/weather -> use `get_weather_forecast`
   - If asked about schemes -> use `get_government_schemes`
   - If asked about crop recommendations -> use `recommend_crop`
   - If asked about crop disease or leaf problems -> use `diagnose_crop_disease`
4. **Actionable**: Give clear, practical, step-by-step advice.

If a tool fails or returns no data, apologize and provide general advice, but admit you don't have the live data.
"""

generation_config = {
    "temperature": 0.2, # Lower temperature for strictly factual responses
    "top_p": 0.95,
    "top_k": 64,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

# ===============================
# Request / Response Models
# ===============================
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

# ===============================
# Health Check
# ===============================
@app.get("/")
async def health_check():
    return {
        "status": "ok",
        "message": "Krishi Mitra Backend & High-Speed Groq / Gemini Agentic Chatbot running"
    }

# ===============================
# Chat Endpoint (Agentic)
# ===============================
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    import json
    # 1. Try Groq Agentic Chat with Function Calling (Fast, low-latency)
    if groq_client:
        try:
            messages = [
                {"role": "system", "content": SYSTEM_INSTRUCTION},
                {"role": "user", "content": request.message}
            ]
            res = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=groq_tools,
                temperature=0.2,
                max_tokens=1024
            )
            msg = res.choices[0].message
            if msg.tool_calls:
                messages.append(msg)
                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    if fn_name in TOOL_MAPPING:
                        args = json.loads(tc.function.arguments)
                        tool_result = TOOL_MAPPING[fn_name](**args)
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps(tool_result)
                        })
                final_res = groq_client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=messages,
                    temperature=0.2,
                    max_tokens=1024
                )
                if final_res.choices and final_res.choices[0].message.content:
                    return ChatResponse(response=final_res.choices[0].message.content.strip())
            elif msg.content:
                return ChatResponse(response=msg.content.strip())
        except Exception as groq_err:
            print(f"[GROQ MAIN CHAT NOTICE]: {groq_err}, falling back to Gemini")

    # 2. Fallback to Gemini
    try:
        if not api_key:
            return ChatResponse(response="API Key missing. Please configure backend/.env.")

        # Initialize model WITH tools and system instruction
        model = genai.GenerativeModel(
            model_name=MODEL_NAME,
            generation_config=generation_config,
            tools=tools_list,
            system_instruction=SYSTEM_INSTRUCTION
        )

        chat_session = model.start_chat(
            history=[],
            enable_automatic_function_calling=True
        )
        
        response = chat_session.send_message(request.message)
        return ChatResponse(response=response.text.strip())

    except Exception as e:
        print("Agent Error:", e)
        return ChatResponse(response="Maaf karein, abhi server mein kuch dikkat hai. Kripya thodi der baad prayas karein. (Sorry, server error, please try again later.)")

# ===============================
# Run Server
# ===============================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
