import os
import uuid
import base64
import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Body, Response
from pydantic import BaseModel
from datetime import datetime
from dotenv import load_dotenv
import requests
from huggingface_hub import InferenceClient
from sarvamai import SarvamAI
from database import get_database
from models.chat import ChatSession, ChatMessage
import google.generativeai as genai
import io
import re

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- Groq High-Speed Inference Configuration ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print(f"[GROQ] Initialized Groq client with model: {GROQ_MODEL}")
    except Exception as e:
        print(f"[GROQ] Warning initializing Groq: {e}")

router = APIRouter(
    prefix="/chat",
    tags=["Unified Chatbot"]
)

# --- Configuration ---
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("⚠️ WARNING: HF_TOKEN not found in .env. AI features will fail.")

# Models
LOGIC_MODEL = "Qwen/Qwen2.5-7B-Instruct"
IMAGE_MODEL = "black-forest-labs/FLUX.1-schnell"   # Free HF Inference API model — no local loading
STT_MODEL = "openai/whisper-large-v3-turbo"
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "")

# Clients
client = InferenceClient(api_key=HF_TOKEN)
audio_client = InferenceClient(api_key=HF_TOKEN, headers={"Content-Type": "audio/webm"})

# --- Database ---
db = get_database()
chat_collection = db["chat_sessions"]

# --- Schemas ---
class CreateSessionRequest(BaseModel):
    user_id: str = "default_user"

class MessageRequest(BaseModel):
    session_id: str
    message: str
    image: Optional[str] = None  # Base64 encoded image
    language: str = "English"
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class SessionSummary(BaseModel):
    session_id: str
    title: str
    last_updated: str

class HistoryResponse(BaseModel):
    session_id: str
    messages: List[dict]

class SynthesizeRequest(BaseModel):
    text: str
    target_language_code: Optional[str] = None
    language_code: Optional[str] = "hi-IN"

def clean_text_for_speech(text: str) -> str:
    # Remove image generated tags
    text = re.sub(r'\[IMAGE_GENERATED:[^\]]+\]', '', text)
    # Remove markdown links [text](url) -> text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove urls
    text = re.sub(r'http\S+|www\.\S+', '', text)
    # Remove markdown bold/italics/headings/bullet points/special symbols
    text = re.sub(r'[*#_~`>-]', ' ', text)
    # Remove extra spaces/newlines
    text = re.sub(r'\s+', ' ', text).strip()
    return text


# ---------------------------------------------------------------------------
# Helper: detect image-generation intent (English + Hindi + Hinglish)
# ---------------------------------------------------------------------------
IMAGE_KEYWORDS_EN = [
    "generate an image", "generate image", "create an image", "create image",
    "draw a", "draw an", "show me a picture", "show me an image",
    "make an image", "make a picture", "make a photo",
    "produce an image", "produce a picture", "generate photo", "create photo",
    "photo bana", "image bana", "tasveer bana", "chitra bana", "photo generate", "image generate",
    "generate picture", "draw picture"
]
IMAGE_KEYWORDS_HI = [
    "चित्र बनाओ", "चित्र जनरेट", "चित्र दिखाओ", "चित्र बना", "चित्र",
    "तस्वीर बनाओ", "तस्वीर जनरेट", "तस्वीर दिखाओ", "तस्वीर बना",
    "फोटो बनाओ", "फोटो जनरेट", "इमेज बनाओ", "इमेज जनरेट", "इमेज बना", "फोटो बना",
    "नया चित्र", "नया फोटो", "एक चित्र", "एक तस्वीर", "इमेज", "फोटो"
]

def is_image_request(text: str) -> bool:
    lower = text.lower()
    for kw in IMAGE_KEYWORDS_EN:
        if kw in lower:
            return True
    for kw in IMAGE_KEYWORDS_HI:
        if kw in text:
            return True
    return False


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Image Generation — Resilient Fast Generation + Fallback
# ---------------------------------------------------------------------------
def generate_image_hf(prompt: str) -> Optional[str]:
    """
    Calls Pollinations AI or Hugging Face to generate an image.
    Returns base64-encoded JPEG string, or stock fallback on failure.
    """
    enhanced_prompt = f"{prompt}, high quality, realistic, detailed agricultural photography"
    
    # Attempt 1: Pollinations AI with short timeout (5 seconds max)
    try:
        import urllib.parse
        encoded = urllib.parse.quote(enhanced_prompt)
        poll_url = f"https://image.pollinations.ai/prompt/{encoded}?width=768&height=512&nologo=true&seed=42"
        resp = requests.get(poll_url, timeout=5)
        if resp.status_code == 200 and len(resp.content) > 1000:
            b64 = base64.b64encode(resp.content).decode("utf-8")
            print("[IMAGE] Pollinations generation successful.")
            return b64
    except Exception as e:
        print(f"[IMAGE] Pollinations error/timeout: {e}")

    # Attempt 2: Hugging Face Inference API with 5s timeout
    token = os.getenv("HF_TOKEN") or HF_TOKEN
    if token:
        try:
            print(f"[IMAGE] Attempting HF generation: {prompt[:60]}...")
            hf_client = InferenceClient(api_key=token, timeout=5)
            pil_image = hf_client.text_to_image(
                enhanced_prompt,
                model=IMAGE_MODEL,
            )
            buffered = io.BytesIO()
            pil_image.save(buffered, format="JPEG", quality=85)
            b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
            print("[IMAGE] HF Generation Successful.")
            return b64
        except Exception as e:
            print(f"[IMAGE] HF Generation failed: {e}")

    # Attempt 3: Stock agricultural fallback image
    try:
        fallback_url = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80"
        resp = requests.get(fallback_url, timeout=5)
        if resp.status_code == 200:
            b64 = base64.b64encode(resp.content).decode("utf-8")
            print("[IMAGE] Stock agricultural fallback image returned.")
            return b64
    except Exception as e:
        print(f"[IMAGE] Stock fallback error: {e}")

    return None


# ---------------------------------------------------------------------------
# Location & Weather helpers
# ---------------------------------------------------------------------------
def get_location_name(lat: float, lon: float) -> str:
    try:
        url = (
            f"https://api.bigdatacloud.net/data/reverse-geocode-client"
            f"?latitude={lat}&longitude={lon}&localityLanguage=en"
        )
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            data = res.json()
            city = data.get("city", "")
            locality = data.get("locality", "")
            return f"{locality}, {city}".strip(", ")
    except Exception as e:
        print(f"Location Error: {e}")
    return "Unknown Location"


def get_real_weather(lat: float, lon: float) -> str:
    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}&current_weather=true"
        )
        res = requests.get(url, timeout=3)
        if res.status_code == 200:
            current = res.json().get("current_weather", {})
            temp = current.get("temperature")
            wind = current.get("windspeed")
            return f"Temperature: {temp}°C, Wind: {wind} km/h"
    except Exception as e:
        print(f"Weather Error: {e}")
    return "Weather data unavailable"


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------
async def create_new_session(user_id: str):
    session_id = str(uuid.uuid4())
    new_session = ChatSession(
        session_id=session_id,
        user_id=user_id,
        title="New Chat",
        messages=[],
    )
    await chat_collection.insert_one(new_session.model_dump())
    return new_session


async def get_session(session_id: str):
    session_data = await chat_collection.find_one({"session_id": session_id})
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSession(**session_data)


async def update_session_messages(
    session_id: str,
    new_messages: List[ChatMessage],
    update_title: str = None,
):
    serialized_msgs = [msg.model_dump() for msg in new_messages]
    update_data = {
        "$push": {"messages": {"$each": serialized_msgs}},
        "$set": {"last_updated": datetime.utcnow()},
    }
    if update_title:
        update_data["$set"]["title"] = update_title
    await chat_collection.update_one({"session_id": session_id}, update_data)


# ---------------------------------------------------------------------------
# Main AI response function powered by Gemini 2.5 Flash Lite
# ---------------------------------------------------------------------------
def get_ai_response(
    history: List[ChatMessage],
    current_prompt: str,
    image_b64: Optional[str],
    lang: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
):
    # 1. Detect image-generation requests FIRST
    if is_image_request(current_prompt):
        img_b64 = generate_image_hf(current_prompt)
        if img_b64:
            return f"Here is the image you requested:\n\n[IMAGE_GENERATED:{img_b64}]"
        else:
            return (
                "माफ़ करें, अभी इमेज जनरेट नहीं हो सकी। "
                "कृपया थोड़ी देर बाद फिर कोशिश करें। "
                "(Sorry, image generation failed. Please try again later.)"
            )

    # 2. Build location/weather context
    context = ""
    if lat is not None and lon is not None:
        loc_name = get_location_name(lat, lon)
        weather = get_real_weather(lat, lon)
        context = (
            f"\n\n[Live Location & Weather Context]\n"
            f"Location: {loc_name}\nWeather: {weather}\n"
        )

    # 3. System Instruction for Factual, Empathetic Krishi Sathi
    system_instruction = (
        f"You are Krishi Sathi, an expert agricultural AI assistant dedicated to helping Indian farmers. "
        f"Respond strictly in the requested language: {lang}. "
        "Tone: Empathetic, respectful (use terms like Kisan Bhai, Namaste), practical, concise, and highly actionable. "
        "Core Rules: "
        "- Provide factual and verified farming advice, crop diseases, organic fertilizers, market price advice, weather precautions, and government schemes. "
        "- STRICTLY DO NOT HALLUCINATE: Never invent non-existent government portals, fake toll-free numbers, or fake crop prices. "
        "- If live data or weather context is provided below, rely strictly upon it. "
        f"{context}"
    )

    # 4. If image is provided, use Gemini Vision (multimodal leaf/crop diagnosis)
    if image_b64:
        try:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                system_instruction=system_instruction
            )
            import PIL.Image
            image_bytes = base64.b64decode(image_b64)
            img = PIL.Image.open(io.BytesIO(image_bytes))
            prompt_parts = [img, f"Analyze this image for crop health or issue and answer: {current_prompt}"]
            response = model.generate_content(prompt_parts)
            if response and response.text:
                return response.text.strip()
        except Exception as vision_err:
            print(f"[VISION ERROR]: {vision_err}")

    # 5. Fast Text Chat with Groq (Blazing fast inference, low latency, low temperature to prevent hallucination)
    if groq_client and not image_b64:
        try:
            groq_messages = [{"role": "system", "content": system_instruction}]
            recent_msgs = history[-8:] if len(history) > 8 else history
            for msg in recent_msgs:
                role = "user" if msg.role == "user" else "assistant"
                groq_messages.append({"role": role, "content": msg.content})
            groq_messages.append({"role": "user", "content": current_prompt})

            completion = groq_client.chat.completions.create(
                model=GROQ_MODEL,
                messages=groq_messages,
                temperature=0.2, # Low temperature ensures factual grounding & prevents hallucinations
                max_tokens=1024
            )
            if completion.choices and completion.choices[0].message.content:
                return completion.choices[0].message.content.strip()
        except Exception as groq_err:
            print(f"[GROQ CHAT NOTICE]: {groq_err}, falling back to Gemini")

    # 6. Fallback to Gemini Model
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            system_instruction=system_instruction
        )

        contents = []
        recent_msgs = history[-8:] if len(history) > 8 else history
        for msg in recent_msgs:
            role = "user" if msg.role == "user" else "model"
            contents.append({"role": role, "parts": [msg.content]})

        contents.append({"role": "user", "parts": [current_prompt]})
        response = model.generate_content(contents)
        if response and response.text:
            return response.text.strip()
        return "Namaste! Main aapki kheti sambandhi madad ke liye taiyar hoon. Kripya apna prashna dobara poochein."

    except Exception as e:
        print(f"Gemini Chat Error: {e}")
        return f"Maaf kijiye, abhi server se connect karne mein samasya aa rahi hai. ({str(e)})"


def generate_title(first_message: str):
    return first_message[:30] + "..." if len(first_message) > 30 else first_message


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/new", response_model=SessionSummary)
async def create_session(req: CreateSessionRequest):
    session = await create_new_session(req.user_id)
    return SessionSummary(
        session_id=session.session_id,
        title=session.title,
        last_updated=session.last_updated.isoformat(),
    )


@router.get("/sessions/{user_id}", response_model=List[SessionSummary])
async def list_sessions(user_id: str):
    try:
        cursor = chat_collection.find({"user_id": user_id}).sort("last_updated", -1)
        sessions = []
        async for doc in cursor:
            lu = doc.get("last_updated")
            if isinstance(lu, str):
                lu_iso = lu
            elif isinstance(lu, datetime):
                lu_iso = lu.isoformat()
            else:
                lu_iso = datetime.utcnow().isoformat()

            sess_id = doc.get("session_id") or str(doc["_id"])
            sessions.append(
                SessionSummary(
                    session_id=sess_id,
                    title=doc.get("title", "New Chat"),
                    last_updated=lu_iso,
                )
            )
        return sessions
    except Exception as e:
        print(f"ERROR in list_sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{session_id}", response_model=HistoryResponse)
async def get_history(session_id: str):
    session = await get_session(session_id)
    formatted_history = []
    for msg in session.messages:
        img_url = msg.image_url
        if img_url and not img_url.startswith("http") and not img_url.startswith("data:"):
            img_url = f"data:image/jpeg;base64,{img_url}"
        formatted_history.append(
            {
                "role": msg.role,
                "text": msg.content,
                "image": img_url,
                "timestamp": msg.timestamp.isoformat(),
            }
        )
    return HistoryResponse(session_id=session.session_id, messages=formatted_history)


@router.post("/message")
async def send_message(req: MessageRequest):
    try:
        # 1. Retrieve session
        session = await get_session(req.session_id)

        # 2. Get AI response (non-blocking in threadpool)
        ai_text = await asyncio.to_thread(
            get_ai_response,
            session.messages,
            req.message,
            req.image,
            req.language,
            req.latitude,
            req.longitude,
        )

        # 3. Extract generated image if present
        bot_image_url = None
        if "[IMAGE_GENERATED:" in ai_text:
            parts = ai_text.split("[IMAGE_GENERATED:")
            bot_image_url = "data:image/jpeg;base64," + parts[1].split("]")[0]
            ai_text = parts[0].strip()

        # 4. Persist messages
        user_msg = ChatMessage(
            role="user",
            content=req.message,
            image_url=req.image if req.image else None,
        )
        bot_msg = ChatMessage(role="assistant", content=ai_text, image_url=bot_image_url)

        new_title = None
        if len(session.messages) == 0:
            new_title = generate_title(req.message)

        await update_session_messages(req.session_id, [user_msg, bot_msg], update_title=new_title)

        return {"role": "assistant", "content": ai_text, "image": bot_image_url}

    except Exception as e:
        print(f"[CHAT ERROR] send_message failed: {e}")
        return {
            "role": "assistant",
            "content": "माफ़ करें, सर्वर से संपर्क करने में समस्या आई है। कृपया पुनः प्रयास करें। (Sorry, server error. Please try again.)",
            "image": None
        }


@router.post("/transcribe")
async def transcribe_voice(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file uploaded")
    try:
        audio_bytes = await file.read()

        # 0. Groq Whisper (Ultra fast, highly accurate speech-to-text)
        if groq_client:
            try:
                filename = file.filename or "audio.webm"
                transcription = groq_client.audio.transcriptions.create(
                    file=(filename, audio_bytes),
                    model="whisper-large-v3-turbo"
                )
                if transcription and transcription.text and transcription.text.strip():
                    return {"text": transcription.text.strip()}
            except Exception as groq_stt_err:
                print(f"[TRANSCRIBE] Groq Whisper notice: {groq_stt_err}")

        # 1. Hugging Face Whisper Turbo (if HF_TOKEN configured)
        hf_token = os.getenv("HF_TOKEN") or HF_TOKEN
        if hf_token:
            try:
                hf_audio = InferenceClient(api_key=hf_token, headers={"Content-Type": file.content_type or "audio/webm"})
                output = hf_audio.automatic_speech_recognition(audio_bytes, model=STT_MODEL)
                if hasattr(output, "text") and output.text.strip():
                    return {"text": output.text.strip()}
            except Exception as hf_err:
                print(f"[TRANSCRIBE] HF Whisper notice: {hf_err}")

        # 2. Google Gemini Audio Transcription Fallback
        gemini_key = os.getenv("GEMINI_API_KEY") or GEMINI_API_KEY
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel("gemini-2.5-flash-lite")
                part = {"mime_type": file.content_type or "audio/webm", "data": audio_bytes}
                res = model.generate_content([
                    part,
                    "Transcribe the spoken audio verbatim in its original spoken language (Hindi, Marathi, English, Punjabi, etc.). Return ONLY the transcribed text without quotes or preamble."
                ])
                if res and res.text and res.text.strip():
                    return {"text": res.text.strip()}
            except Exception as gem_err:
                print(f"[TRANSCRIBE] Gemini Audio notice: {gem_err}")

        raise HTTPException(status_code=500, detail="Could not transcribe audio via available engines.")
    except Exception as e:
        print(f"[TRANSCRIBE ERROR]: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/synthesize")
async def synthesize_voice(req: SynthesizeRequest):
    clean_text = clean_text_for_speech(req.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="No text provided")

    # Trim to safe length for Sarvam API (max ~480 chars to prevent API rejection/timeouts)
    if len(clean_text) > 480:
        clean_text = clean_text[:480].rsplit('.', 1)[0] + "."
        if len(clean_text) < 40:
            clean_text = clean_text_for_speech(req.text)[:450]

    lang = req.language_code or req.target_language_code or "hi-IN"
    valid_sarvam_langs = ['bn-IN', 'en-IN', 'gu-IN', 'hi-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN']
    if lang not in valid_sarvam_langs:
        lang = "hi-IN"

    sarvam_key = os.getenv("SARVAM_API_KEY") or SARVAM_API_KEY
    if not sarvam_key:
        raise HTTPException(status_code=500, detail="SARVAM_API_KEY not configured")
    try:
        sarvam_client = SarvamAI(api_subscription_key=sarvam_key)
        # Note: keyword is 'language_code' in Sarvam AI Python SDK
        response = sarvam_client.text_to_speech.convert(
            model="bulbul:v3",
            text=clean_text,
            language_code=lang,
            speaker="shubh",
        )
        if response and response.audios and len(response.audios) > 0:
            audio_base64 = response.audios[0]
            audio_bytes = base64.b64decode(audio_base64)
            return Response(content=audio_bytes, media_type="audio/wav")
        else:
            raise HTTPException(status_code=500, detail="Failed to synthesize voice")
    except Exception as e:
        print(f"Synthesize Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
