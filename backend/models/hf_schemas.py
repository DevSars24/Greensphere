from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

# ==========================================
# 1. Leaf Disease Schemas
# ==========================================
class LeafPredictionItem(BaseModel):
    label: str
    score: float

class LeafDiseaseResponse(BaseModel):
    top_prediction: Optional[LeafPredictionItem] = None
    all_predictions: List[LeafPredictionItem] = []
    confidence: float
    low_confidence: bool
    warning: Optional[str] = None
    supported_crops: List[str]
    disclaimer: str
    model_used: str
    status: str = "success"

# ==========================================
# 2. Text to Image Schemas
# ==========================================
class TextToImageRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=500, description="Agricultural illustration description")
    aspect_ratio: Optional[str] = Field("1:1", description="Aspect ratio: 1:1, 16:9, or 4:3")
    style_preset: Optional[str] = Field("realistic_farming", description="Style preset")

class TextToImageResponse(BaseModel):
    image_base64: str
    model_used: str
    prompt: str
    disclaimer: str = "AI-generated illustration for educational and conceptual representation only."
    status: str = "success"

# ==========================================
# 3. Speech to Text Schemas
# ==========================================
class SpeechToTextResponse(BaseModel):
    text: str
    model_used: str
    duration_seconds: Optional[float] = None
    status: str = "success"

# ==========================================
# 4. Translation & TTS Schemas
# ==========================================
class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)
    source_lang: str = Field("en", description="'en' or 'hi'")
    target_lang: str = Field("hi", description="'hi' or 'en'")

class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    model_used: str
    supported_languages: List[str]
    status: str = "success"

class TextToSpeechRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=500)
    language: str = Field("en", description="'en' or 'hi'")

class TextToSpeechResponse(BaseModel):
    audio_base64: str
    model_used: str
    mime_type: str = "audio/flac"
    status: str = "success"

# ==========================================
# 5. Government RAG Schemas
# ==========================================
class RagCitation(BaseModel):
    scheme_title: str
    ministry: str
    source_url: str
    section: str
    relevance_score: float
    excerpt: str

class RagQueryRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    top_k: Optional[int] = Field(3, ge=1, le=10)

class RagQueryResponse(BaseModel):
    answer: str
    sufficient_evidence: bool
    confidence: float
    sources: List[RagCitation]
    model_used: str
    status: str = "success"

class RagIngestResponse(BaseModel):
    inserted_count: int
    message: str
    collection: str
    embedding_model: str
    dimensions: int
    status: str = "success"

# ==========================================
# 6. Status Schema
# ==========================================
class HfStatusResponse(BaseModel):
    token_configured: bool
    models: Dict[str, str]
    router_endpoint: str
    note: str
