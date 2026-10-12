import io
import os
import sys
import unittest.mock
from unittest.mock import patch, MagicMock, AsyncMock

# Ensure backend folder is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from fastapi.testclient import TestClient
from PIL import Image

import main
from routers import hf_features

client = TestClient(main.app)

# ==========================================
# 1. Status & Health Check Test
# ==========================================
def test_hf_status_endpoint():
    res = client.get("/hf/status")
    assert res.status_code == 200
    data = res.json()
    assert "token_configured" in data
    assert "models" in data
    assert data["models"]["leaf_disease"] == hf_features.HF_LEAF_MODEL
    assert data["models"]["text_to_image"] == hf_features.HF_T2I_MODEL
    assert data["models"]["speech_to_text"] == hf_features.HF_ASR_MODEL

# ==========================================
# 2. Leaf Disease Validation & Flow Tests
# ==========================================
def test_leaf_disease_invalid_mime():
    file_bytes = b"This is a text file, not a leaf image."
    res = client.post(
        "/hf/leaf-disease",
        files={"file": ("notes.txt", file_bytes, "text/plain")}
    )
    assert res.status_code == 400
    assert "Unsupported file format" in res.json()["detail"]

def test_leaf_disease_corrupted_image():
    res = client.post(
        "/hf/leaf-disease",
        files={"file": ("fake.jpg", b"1234567890" * 20, "image/jpeg")}
    )
    assert res.status_code == 400
    assert "Invalid image content" in res.json()["detail"]

def test_leaf_disease_mocked_success():
    # Create valid dummy PIL JPEG image
    img = Image.new("RGB", (200, 200), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    # Mock HF image_classification
    mock_item1 = MagicMock()
    mock_item1.label = "Tomato___Early_blight"
    mock_item1.score = 0.942

    mock_item2 = MagicMock()
    mock_item2.label = "Tomato___healthy"
    mock_item2.score = 0.045

    with patch.object(hf_features.InferenceClient, "image_classification", return_value=[mock_item1, mock_item2]):
        res = client.post(
            "/hf/leaf-disease",
            files={"file": ("tomato_leaf.jpg", img_bytes, "image/jpeg")}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["top_prediction"]["label"] == "Tomato___Early_blight"
        assert data["confidence"] == 0.942
        assert data["low_confidence"] is False
        assert "Disclaimer:" in data["disclaimer"]
        assert "Tomato" in data["supported_crops"]

def test_leaf_disease_low_confidence_warning():
    img = Image.new("RGB", (100, 100), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    mock_item1 = MagicMock()
    mock_item1.label = "Corn_(maize)___Common_rust"
    mock_item1.score = 0.42  # Below 0.60 threshold

    with patch.object(hf_features.InferenceClient, "image_classification", return_value=[mock_item1]):
        res = client.post(
            "/hf/leaf-disease",
            files={"file": ("corn_leaf.jpg", img_bytes, "image/jpeg")}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["low_confidence"] is True
        assert data["warning"] is not None
        assert "confidence is low" in data["warning"].lower()

# ==========================================
# 3. Text to Image Tests
# ==========================================
def test_text_to_image_validation_empty():
    res = client.post(
        "/hf/text-to-image",
        json={"prompt": "a"}
    )
    assert res.status_code == 422 # Pydantic min_length validation

def test_text_to_image_mocked_success():
    mock_img = Image.new("RGB", (256, 256), color=(200, 100, 50))
    with patch.object(hf_features.InferenceClient, "text_to_image", return_value=mock_img):
        res = client.post(
            "/hf/text-to-image",
            json={"prompt": "Organic wheat field at sunrise", "style_preset": "realistic_farming"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["image_base64"].startswith("data:image/jpeg;base64,")
        assert "AI-generated illustration" in data["disclaimer"]

# ==========================================
# 4. Speech to Text Tests
# ==========================================
def test_speech_to_text_mocked_success():
    audio_dummy = b"OggS\x00\x02\x00\x00\x00\x00\x00\x00" + b"\x00" * 200

    mock_trans = MagicMock()
    mock_trans.text = "Kisan bhai gehu ki fasal me kitna paani de"

    with patch.object(hf_features.InferenceClient, "automatic_speech_recognition", return_value=mock_trans):
        res = client.post(
            "/hf/speech-to-text",
            files={"file": ("audio.ogg", audio_dummy, "audio/ogg")}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["text"] == "Kisan bhai gehu ki fasal me kitna paani de"

# ==========================================
# 5. Translation & Text-to-Speech Tests
# ==========================================
def test_translate_unsupported_language_pair():
    res = client.post(
        "/hf/translate",
        json={"text": "Hello farmer", "source_lang": "en", "target_lang": "fr"}
    )
    assert res.status_code == 400
    assert "Unsupported language pair" in res.json()["detail"]

def test_translate_mocked_success():
    mock_res = MagicMock()
    mock_res.translation_text = "नमस्ते किसान"

    with patch.object(hf_features.InferenceClient, "translation", return_value=mock_res):
        res = client.post(
            "/hf/translate",
            json={"text": "Hello farmer", "source_lang": "en", "target_lang": "hi"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["translated_text"] == "नमस्ते किसान"
        assert "English (en)" in data["supported_languages"]

def test_text_to_speech_mocked_success():
    dummy_audio_bytes = b"RIFF\x24\x00\x00\x00WAVEfmt " + b"\x00" * 100
    with patch.object(hf_features.InferenceClient, "text_to_speech", return_value=dummy_audio_bytes):
        res = client.post(
            "/hf/text-to-speech",
            json={"text": "Namaste Kisan", "language": "hi"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["audio_base64"].startswith("data:audio/flac;base64,")

# ==========================================
# 6. RAG Insufficient Evidence & Grounding Tests
# ==========================================
def test_rag_query_insufficient_evidence():
    # If query is unrelated and vector similarity is near zero
    dummy_vec = [0.0] * 384
    with patch("routers.hf_features.get_database") as mock_get_db, \
         patch.object(hf_features.InferenceClient, "feature_extraction", return_value=dummy_vec):
        
        mock_col = MagicMock()
        # Mock 1 stored document with perpendicular embedding
        stored_doc = {
            "scheme_id": "test",
            "scheme_title": "PM Kisan",
            "ministry": "Agri",
            "source_url": "https://pmkisan.gov.in",
            "section": "Eligibility",
            "chunk_text": "Financial benefit of 6000",
            "embedding": [1.0] + [0.0] * 383
        }
        mock_cursor = MagicMock()
        mock_cursor.to_list = unittest.mock.AsyncMock(return_value=[stored_doc])
        mock_col.find.return_value = mock_cursor
        mock_get_db.return_value = {"gov_documents": mock_col}

        # Query vector has 0 similarity to stored doc
        res = client.post(
            "/hf/rag/query",
            json={"query": "Quantum physics and black holes in deep space"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["sufficient_evidence"] is False
        assert "Insufficient evidence" in data["answer"]
        assert len(data["sources"]) == 0

# ==========================================
# 7. Error Mapping Tests (402, 429, 503)
# ==========================================
def test_handle_hf_402_credits_exhausted():
    with patch.object(hf_features.InferenceClient, "image_classification", side_effect=Exception("Client error 402 Payment Required: You have no remaining credits")):
        img = Image.new("RGB", (100, 100), color=(50, 50, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        res = client.post(
            "/hf/leaf-disease",
            files={"file": ("leaf.jpg", buf.getvalue(), "image/jpeg")}
        )
        assert res.status_code == 402
        assert "Credits Exhausted" in res.json()["detail"]["error"]

def test_handle_hf_429_rate_limit():
    with patch.object(hf_features.InferenceClient, "image_classification", side_effect=Exception("429 Too Many Requests: Rate limit exceeded")):
        img = Image.new("RGB", (100, 100), color=(50, 50, 50))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        res = client.post(
            "/hf/leaf-disease",
            files={"file": ("leaf.jpg", buf.getvalue(), "image/jpeg")}
        )
        assert res.status_code == 429
        assert "Rate Limit Exceeded" in res.json()["detail"]["error"]

def test_speech_to_text_file_too_large():
    # Simulate a file exceeding 25MB (header + mocked large size)
    huge_bytes = b"0" * (25 * 1024 * 1024 + 1024)
    res = client.post(
        "/hf/speech-to-text",
        files={"file": ("huge_audio.mp3", huge_bytes, "audio/mpeg")}
    )
    assert res.status_code == 400
    assert "Audio file exceeds 25 MB limit" in res.json()["detail"]

def test_rag_ingest_mocked_success():
    dummy_vec = [0.1] * 384
    with patch("routers.hf_features.get_database") as mock_get_db, \
         patch.object(hf_features.InferenceClient, "feature_extraction", return_value=dummy_vec):
        
        mock_col = MagicMock()
        mock_col.update_one = unittest.mock.AsyncMock()
        mock_get_db.return_value = {"gov_documents": mock_col}

        res = client.post("/hf/rag/ingest")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert data["inserted_count"] > 0
        assert data["dimensions"] == 384

