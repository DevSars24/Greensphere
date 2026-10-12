import os
import io
import json
import base64
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, status
from huggingface_hub import InferenceClient
from huggingface_hub.utils import HfHubHTTPError, RepositoryNotFoundError
from PIL import Image
import math

from database import get_database
from models.hf_schemas import (
    LeafPredictionItem,
    LeafDiseaseResponse,
    TextToImageRequest,
    TextToImageResponse,
    SpeechToTextResponse,
    TranslateRequest,
    TranslateResponse,
    TextToSpeechRequest,
    TextToSpeechResponse,
    RagCitation,
    RagQueryRequest,
    RagQueryResponse,
    RagIngestResponse,
    HfStatusResponse
)

router = APIRouter(
    prefix="/hf",
    tags=["Hugging Face AI Features"]
)

# ==========================================
# Configuration & Client Initialization
# ==========================================
HF_TOKEN = os.getenv("HF_TOKEN")

# Model configuration with verified defaults
HF_LEAF_MODEL = os.getenv("HF_LEAF_MODEL", "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification")
HF_T2I_MODEL = os.getenv("HF_T2I_MODEL", "black-forest-labs/FLUX.1-schnell")
HF_ASR_MODEL = os.getenv("HF_ASR_MODEL", "openai/whisper-large-v3-turbo")
HF_TRANSLATE_EN_HI_MODEL = os.getenv("HF_TRANSLATE_EN_HI_MODEL", "Helsinki-NLP/opus-mt-en-hi")
HF_TRANSLATE_HI_EN_MODEL = os.getenv("HF_TRANSLATE_HI_EN_MODEL", "Helsinki-NLP/opus-mt-hi-en")
HF_TTS_ENG_MODEL = os.getenv("HF_TTS_ENG_MODEL", "facebook/mms-tts-eng")
HF_TTS_HIN_MODEL = os.getenv("HF_TTS_HIN_MODEL", "facebook/mms-tts-hin")
HF_EMBED_MODEL = os.getenv("HF_EMBED_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
HF_EMBED_DIM = 384  # 384 for all-MiniLM-L6-v2, 1024 for BAAI/bge-m3

SUPPORTED_CROPS = [
    "Apple", "Blueberry", "Cherry", "Corn (Maize)", "Grape",
    "Orange", "Peach", "Pepper (Bell)", "Potato", "Raspberry",
    "Soybean", "Squash", "Strawberry", "Tomato"
]

SUPPORTED_LANGUAGES = [
    "English (en)",
    "Hindi (hi)"
]

def get_hf_client(timeout: float = 20.0) -> InferenceClient:
    token = os.getenv("HF_TOKEN") or HF_TOKEN
    if not token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Hugging Face authentication error: HF_TOKEN is not configured in backend/.env."
        )
    return InferenceClient(api_key=token, timeout=timeout)

def handle_hf_error(e: Exception, model_name: str):
    """Translates Hugging Face SDK exceptions into clean HTTP exceptions with diagnostic context."""
    err_str = str(e)
    # Check for 402 Payment Required (Exhausted credits on router.huggingface.co)
    if "402" in err_str or "Payment Required" in err_str or "no remaining credits" in err_str.lower():
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "Hugging Face Inference Credits Exhausted",
                "message": f"The Hugging Face Inference Provider returned 402 Payment Required for model '{model_name}'. Free tier serverless credits have been exhausted on this account.",
                "model": model_name,
                "action": "Add pre-paid inference credits on your Hugging Face account settings to enable live execution for this model."
            }
        )
    elif "429" in err_str or "rate limit" in err_str.lower():
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate Limit Exceeded",
                "message": f"Hugging Face rate limit reached for model '{model_name}'. Please wait before retrying.",
                "model": model_name
            }
        )
    elif "503" in err_str or "loading" in err_str.lower():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "error": "Model Loading / Service Unavailable",
                "message": f"Model '{model_name}' is currently loading in Hugging Face infrastructure. Estimated time to ready.",
                "model": model_name
            }
        )
    elif isinstance(e, RepositoryNotFoundError) or "404" in err_str:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Model Repository Not Found",
                "message": f"Model '{model_name}' was not found on the Hugging Face Hub or is a private/gated repository.",
                "model": model_name
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "Hugging Face Upstream Error",
                "message": f"Upstream error while calling model '{model_name}': {err_str}",
                "model": model_name
            }
        )

# ==========================================
# 0. Status & Configuration Endpoint
# ==========================================
@router.get("/status", response_model=HfStatusResponse)
async def get_hf_status():
    token = os.getenv("HF_TOKEN") or HF_TOKEN
    return HfStatusResponse(
        token_configured=bool(token),
        models={
            "leaf_disease": HF_LEAF_MODEL,
            "text_to_image": HF_T2I_MODEL,
            "speech_to_text": HF_ASR_MODEL,
            "translate_en_hi": HF_TRANSLATE_EN_HI_MODEL,
            "translate_hi_en": HF_TRANSLATE_HI_EN_MODEL,
            "tts_english": HF_TTS_ENG_MODEL,
            "tts_hindi": HF_TTS_HIN_MODEL,
            "embeddings": HF_EMBED_MODEL
        },
        router_endpoint="https://router.huggingface.co",
        note="All features use Hugging Face router inference with configurable models and graceful error handling."
    )

# ==========================================
# 1. Leaf Disease Image Analysis
# ==========================================
@router.post("/leaf-disease", response_model=LeafDiseaseResponse)
async def analyze_leaf_disease(
    file: UploadFile = File(..., description="Crop leaf photo (JPEG, PNG, WEBP, max 10MB)")
):
    if not file:
        raise HTTPException(status_code=400, detail="No image file provided.")

    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{file.content_type}'. Please upload JPEG, PNG, or WEBP."
        )

    # Read and validate size (10 MB limit)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image file exceeds maximum allowed size (10 MB).")

    if len(contents) < 100:
        raise HTTPException(status_code=400, detail="Corrupted or empty image file.")

    # Validate image decoding with PIL
    try:
        pil_img = Image.open(io.BytesIO(contents))
        pil_img.verify()
        pil_img = Image.open(io.BytesIO(contents)) # Reopen after verify
    except Exception as img_err:
        raise HTTPException(status_code=400, detail=f"Invalid image content: {str(img_err)}")

    client = get_hf_client(timeout=25.0)

    # Offload synchronous SDK call from asyncio event loop
    try:
        raw_preds = await asyncio.to_thread(
            client.image_classification,
            contents,
            model=HF_LEAF_MODEL
        )
    except Exception as e:
        handle_hf_error(e, HF_LEAF_MODEL)

    if not raw_preds:
        raise HTTPException(status_code=500, detail="Model returned an empty prediction list.")

    predictions = [
        LeafPredictionItem(label=p.label if hasattr(p, "label") else p.get("label", "Unknown"),
                           score=float(p.score if hasattr(p, "score") else p.get("score", 0.0)))
        for p in raw_preds
    ]

    top_pred = predictions[0] if predictions else None
    confidence = top_pred.score if top_pred else 0.0
    low_confidence = confidence < 0.60

    warning_msg = None
    if low_confidence:
        warning_msg = (
            f"Visual confidence is low ({confidence:.1%}). The photo may be blurry, poorly lit, "
            "or represent an unlisted crop/pathogen. Please capture a clear close-up of an individual affected leaf."
        )

    disclaimer = (
        "Disclaimer: This screening is generated by a computer vision model trained on plant pathology datasets. "
        "It does not provide agricultural certification or diagnostic certainty. Always inspect crops directly "
        "and consult local Krishi Vigyan Kendra (KVK) extension officers."
    )

    return LeafDiseaseResponse(
        top_prediction=top_pred,
        all_predictions=predictions[:5],
        confidence=confidence,
        low_confidence=low_confidence,
        warning=warning_msg,
        supported_crops=SUPPORTED_CROPS,
        disclaimer=disclaimer,
        model_used=HF_LEAF_MODEL,
        status="success"
    )

# ==========================================
# 2. Text-to-Image Generation
# ==========================================
@router.post("/text-to-image", response_model=TextToImageResponse)
async def generate_crop_illustration(request: TextToImageRequest):
    prompt_clean = request.prompt.strip()
    if len(prompt_clean) < 3:
        raise HTTPException(status_code=400, detail="Prompt must be at least 3 characters long.")

    # Enhance prompt based on style preset
    style_modifiers = {
        "realistic_farming": "realistic detailed Indian agricultural photography, natural field lighting, high quality",
        "technical_diagram": "clear botanical diagram with annotations, clean educational schematic, agronomy illustration",
        "infographic_poster": "clean rural extension educational infographic poster, vibrant, minimalist",
        "field_sketch": "detailed botanical field sketch, watercolor agronomy art"
    }
    modifier = style_modifiers.get(request.style_preset, "realistic agricultural photography")
    full_prompt = f"{prompt_clean}, {modifier}"

    client = get_hf_client(timeout=30.0)

    try:
        pil_image = await asyncio.to_thread(
            client.text_to_image,
            full_prompt,
            model=HF_T2I_MODEL
        )
    except Exception as e:
        handle_hf_error(e, HF_T2I_MODEL)

    buffer = io.BytesIO()
    pil_image.save(buffer, format="JPEG", quality=85)
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

    return TextToImageResponse(
        image_base64=f"data:image/jpeg;base64,{b64_str}",
        model_used=HF_T2I_MODEL,
        prompt=prompt_clean,
        disclaimer="AI-generated illustration for educational and conceptual representation only.",
        status="success"
    )

# ==========================================
# 3. Speech-to-Text (ASR)
# ==========================================
@router.post("/speech-to-text", response_model=SpeechToTextResponse)
async def transcribe_audio_hf(
    file: UploadFile = File(..., description="Spoken voice audio (WebM, WAV, MP3, max 25MB)")
):
    if not file:
        raise HTTPException(status_code=400, detail="No audio file uploaded.")

    audio_bytes = await file.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file exceeds 25 MB limit.")

    if len(audio_bytes) < 100:
        raise HTTPException(status_code=400, detail="Audio file is empty or corrupted.")

    client = get_hf_client(timeout=30.0)

    try:
        transcription = await asyncio.to_thread(
            client.automatic_speech_recognition,
            audio_bytes,
            model=HF_ASR_MODEL
        )
    except Exception as e:
        handle_hf_error(e, HF_ASR_MODEL)

    text_output = ""
    if hasattr(transcription, "text"):
        text_output = transcription.text.strip()
    elif isinstance(transcription, dict) and "text" in transcription:
        text_output = transcription["text"].strip()
    elif isinstance(transcription, str):
        text_output = transcription.strip()

    return SpeechToTextResponse(
        text=text_output,
        model_used=HF_ASR_MODEL,
        status="success"
    )

# ==========================================
# 4. Translation & Text-to-Speech
# ==========================================
@router.post("/translate", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    src = request.source_lang.lower().strip()
    tgt = request.target_lang.lower().strip()

    if (src, tgt) == ("en", "hi"):
        model = HF_TRANSLATE_EN_HI_MODEL
    elif (src, tgt) == ("hi", "en"):
        model = HF_TRANSLATE_HI_EN_MODEL
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language pair: '{src}' -> '{tgt}'. Only 'en' -> 'hi' and 'hi' -> 'en' are supported by the hosted model."
        )

    client = get_hf_client(timeout=20.0)

    try:
        result = await asyncio.to_thread(
            client.translation,
            request.text,
            model=model
        )
    except Exception as e:
        handle_hf_error(e, model)

    translated_text = ""
    if hasattr(result, "translation_text"):
        translated_text = result.translation_text.strip()
    elif isinstance(result, dict) and "translation_text" in result:
        translated_text = result["translation_text"].strip()
    elif isinstance(result, str):
        translated_text = result.strip()
    elif isinstance(result, list) and len(result) > 0:
        first = result[0]
        translated_text = first.get("translation_text", str(first)).strip() if isinstance(first, dict) else str(first)

    return TranslateResponse(
        translated_text=translated_text,
        source_lang=src,
        target_lang=tgt,
        model_used=model,
        supported_languages=SUPPORTED_LANGUAGES,
        status="success"
    )

@router.post("/text-to-speech", response_model=TextToSpeechResponse)
async def text_to_speech(request: TextToSpeechRequest):
    lang = request.language.lower().strip()
    if lang == "hi":
        model = HF_TTS_HIN_MODEL
    elif lang == "en":
        model = HF_TTS_ENG_MODEL
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{lang}'. Only 'en' and 'hi' are supported."
        )

    client = get_hf_client(timeout=25.0)

    try:
        audio_bytes = await asyncio.to_thread(
            client.text_to_speech,
            request.text,
            model=model
        )
    except Exception as e:
        handle_hf_error(e, model)

    b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
    return TextToSpeechResponse(
        audio_base64=f"data:audio/flac;base64,{b64_audio}",
        model_used=model,
        mime_type="audio/flac",
        status="success"
    )

# ==========================================
# 5. Government Document RAG
# ==========================================
def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Computes cosine similarity between two vector embeddings using pure python math."""
    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm_a = math.sqrt(sum(a * a for a in vec1))
    norm_b = math.sqrt(sum(b * b for b in vec2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return float(dot / (norm_a * norm_b))

def extract_flat_embedding(raw: Any) -> List[float]:
    """Safely extracts a flat 1D list of floats from HF feature-extraction outputs."""
    if isinstance(raw, list):
        if len(raw) > 0 and isinstance(raw[0], list):
            return [float(x) for x in raw[0]]
        return [float(x) for x in raw]
    return []

@router.post("/rag/ingest", response_model=RagIngestResponse)
async def ingest_gov_documents():
    """Ingests verified Government of India agricultural policy chunks into MongoDB with HF embeddings."""
    seed_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "gov_schemes_verified.json")
    if not os.path.exists(seed_path):
        raise HTTPException(status_code=500, detail="Verified government seed file not found.")

    with open(seed_path, "r", encoding="utf-8") as f:
        docs = json.load(f)

    db = get_database()
    gov_col = db["gov_documents"]

    client = get_hf_client(timeout=30.0)

    inserted = 0
    for doc in docs:
        chunk_text = doc["chunk_text"]
        
        # Compute embedding via Hugging Face feature extraction
        try:
            emb_raw = await asyncio.to_thread(
                client.feature_extraction,
                chunk_text,
                model=HF_EMBED_MODEL
            )
            emb_vec = extract_flat_embedding(emb_raw)
        except Exception as e:
            handle_hf_error(e, HF_EMBED_MODEL)

        doc_record = {
            "scheme_id": doc["scheme_id"],
            "scheme_title": doc["scheme_title"],
            "ministry": doc["ministry"],
            "source_url": doc["source_url"],
            "section": doc["section"],
            "chunk_text": chunk_text,
            "embedding": emb_vec,
            "embedding_model": HF_EMBED_MODEL,
            "updated_at": datetime.now(timezone.utc)
        }

        await gov_col.update_one(
            {"scheme_id": doc["scheme_id"], "section": doc["section"]},
            {"$set": doc_record},
            upsert=True
        )
        inserted += 1

    return RagIngestResponse(
        inserted_count=inserted,
        message=f"Successfully ingested and embedded {inserted} verified government policy chunks.",
        collection="gov_documents",
        embedding_model=HF_EMBED_MODEL,
        dimensions=HF_EMBED_DIM,
        status="success"
    )

@router.post("/rag/query", response_model=RagQueryResponse)
async def query_gov_documents(request: RagQueryRequest):
    """
    RAG semantic search against verified government documents.
    Returns direct answers with verified scheme citations or an explicit
    insufficient-evidence response if relevance is below threshold.
    """
    db = get_database()
    gov_col = db["gov_documents"]

    # 1. Fetch available documents in MongoDB
    docs_cursor = gov_col.find({})
    stored_docs = await docs_cursor.to_list(length=100)

    if not stored_docs:
        # Knowledge base not yet ingested
        return RagQueryResponse(
            answer="No verified government documents have been ingested yet. Please trigger /hf/rag/ingest first.",
            sufficient_evidence=False,
            confidence=0.0,
            sources=[],
            model_used=HF_EMBED_MODEL,
            status="no_sources_ingested"
        )

    # 2. Embed user query using Hugging Face
    client = get_hf_client(timeout=25.0)
    try:
        query_emb_raw = await asyncio.to_thread(
            client.feature_extraction,
            request.query,
            model=HF_EMBED_MODEL
        )
        query_vec = extract_flat_embedding(query_emb_raw)
    except Exception as e:
        handle_hf_error(e, HF_EMBED_MODEL)

    # 3. Compute vector similarity across stored chunks
    scored_docs = []
    for doc in stored_docs:
        doc_emb = doc.get("embedding", [])
        if doc_emb and len(doc_emb) == len(query_vec):
            score = compute_cosine_similarity(query_vec, doc_emb)
            scored_docs.append((score, doc))

    # Sort descending by relevance score
    scored_docs.sort(key=lambda x: x[0], reverse=True)

    top_matches = scored_docs[:request.top_k]
    RELEVANCE_THRESHOLD = 0.35  # Minimum cosine similarity for meaningful grounding

    valid_citations: List[RagCitation] = []
    for score, doc in top_matches:
        if score >= RELEVANCE_THRESHOLD:
            valid_citations.append(
                RagCitation(
                    scheme_title=doc.get("scheme_title", "Government Scheme"),
                    ministry=doc.get("ministry", "Govt of India"),
                    source_url=doc.get("source_url", "https://agricoop.nic.in/"),
                    section=doc.get("section", "Guidelines"),
                    relevance_score=round(score, 3),
                    excerpt=doc.get("chunk_text", "")
                )
            )

    # 4. Strict Insufficient Evidence handling
    if not valid_citations:
        best_score = top_matches[0][0] if top_matches else 0.0
        return RagQueryResponse(
            answer="Insufficient evidence in verified government documents to answer this query. None of the official scheme guidelines met the verified relevance threshold.",
            sufficient_evidence=False,
            confidence=round(best_score, 3),
            sources=[],
            model_used=HF_EMBED_MODEL,
            status="insufficient_evidence"
        )

    # 5. Build grounded answer synthesizing verified sources
    primary = valid_citations[0]
    best_score = primary.relevance_score

    synthesis_lines = [
        f"Based strictly on official guidelines from **{primary.scheme_title}** ({primary.ministry}):",
        "",
        primary.excerpt,
        "",
        f"**Official Source Portal:** [{primary.source_url}]({primary.source_url})"
    ]

    if len(valid_citations) > 1:
        synthesis_lines.append("")
        synthesis_lines.append(f"**Related Reference:** {valid_citations[1].scheme_title} ({valid_citations[1].section})")

    grounded_answer = "\n".join(synthesis_lines)

    return RagQueryResponse(
        answer=grounded_answer,
        sufficient_evidence=True,
        confidence=best_score,
        sources=valid_citations,
        model_used=HF_EMBED_MODEL,
        status="success"
    )
