"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  Mic,
  MicOff,
  Languages,
  BookOpen,
  Volume2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Search,
  ExternalLink,
  ShieldCheck,
  Send,
  RefreshCw,
  FileAudio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/config";

// --- Tab Types ---
type TabKey = "leaf" | "image-gen" | "asr" | "translation" | "rag";

interface LeafPrediction {
  label: string;
  score: number;
}

interface LeafAnalysisResult {
  top_prediction?: LeafPrediction;
  all_predictions?: LeafPrediction[];
  confidence: number;
  low_confidence: boolean;
  warning?: string;
  supported_crops: string[];
  disclaimer: string;
  model_used: string;
}

interface TextToImageResult {
  image_base64: string;
  model_used: string;
  prompt: string;
  disclaimer: string;
}

interface SpeechToTextResult {
  text: string;
  model_used: string;
}

interface TranslateResult {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  model_used: string;
}

interface TextToSpeechResult {
  audio_base64: string;
  model_used: string;
}

interface RagCitation {
  scheme_title: string;
  ministry: string;
  source_url: string;
  section: string;
  relevance_score: number;
  excerpt: string;
}

interface RagResult {
  answer: string;
  sufficient_evidence: boolean;
  confidence: number;
  sources: RagCitation[];
  model_used: string;
}

interface ApiErrorDetail {
  error?: string;
  message?: string;
  action?: string;
  model?: string;
}

export default function HuggingFaceAIPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("leaf");

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 selection:bg-emerald-500/30 overflow-x-hidden relative">
      {/* Background Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/get-started"
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  Hugging Face AI Suite
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  Serverless Inference
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1 flex items-center gap-2">
                Krishi Mitra AI Studio <Sparkles className="w-6 h-6 text-amber-400" />
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/chatbot">
              <Button variant="outline" className="border-white/10 text-slate-300 hover:bg-white/5 text-xs">
                Back to Chatbot
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Tabs Bar */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-white/[0.03] border border-white/10 rounded-2xl mb-8 backdrop-blur-md">
          {[
            { key: "leaf", label: "Leaf Doctor", icon: Camera },
            { key: "image-gen", label: "Crop Illustrations", icon: ImageIcon },
            { key: "asr", label: "Speech-to-Text", icon: Mic },
            { key: "translation", label: "Translation & TTS", icon: Languages },
            { key: "rag", label: "Govt Schemes RAG", icon: BookOpen }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`flex-1 min-w-[150px] flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 relative ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-900/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <AnimatePresence mode="wait">
          {activeTab === "leaf" && <LeafDiseaseTab key="leaf" />}
          {activeTab === "image-gen" && <ImageGenTab key="image-gen" />}
          {activeTab === "asr" && <SpeechToTextTab key="asr" />}
          {activeTab === "translation" && <TranslationTab key="translation" />}
          {activeTab === "rag" && <GovtRagTab key="rag" />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ==========================================
// TAB 1: Leaf Disease Scanner
// ==========================================
function LeafDiseaseTab() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LeafAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<ApiErrorDetail | string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Camera access denied or unavailable: " + msg);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "camera_leaf_capture.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
          setPreviewUrl(canvas.toDataURL("image/jpeg"));
          stopCamera();
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("File size exceeds 10 MB limit.");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  const analyzeImage = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/hf/leaf-disease`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "Failed to analyze image.");
      } else {
        setResult(data as LeafAnalysisResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error connecting to backend: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Upload & Camera Column */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" /> Plant Pathology Scanner
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Upload or capture an affected leaf photo for hosted Vision Transformer classification.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              MobileNetV2 / ViT
            </span>
          </div>

          {/* Camera Viewfinder */}
          {isCameraActive && (
            <div className="relative rounded-2xl overflow-hidden bg-black border border-emerald-500/30 mb-4 aspect-video flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 z-10">
                <Button onClick={capturePhoto} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-6 shadow-lg">
                  Capture Snapshot
                </Button>
                <Button onClick={stopCamera} variant="outline" className="bg-black/60 text-white border-white/20 rounded-full px-4">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Image Preview Box */}
          {!isCameraActive && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                previewUrl
                  ? "border-emerald-500/40 bg-emerald-950/10"
                  : "border-white/15 hover:border-emerald-500/40 bg-white/[0.02] hover:bg-white/[0.04]"
              }`}
            >
              {previewUrl ? (
                <div className="relative w-full max-h-[260px] flex items-center justify-center overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Leaf preview" className="max-h-[250px] object-contain rounded-lg shadow-md" />
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-slate-400 group-hover:text-emerald-400 transition-colors">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Click to upload leaf photo</p>
                  <p className="text-xs text-slate-500 mt-1">JPEG, PNG, or WEBP (Max 10 MB)</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button
              onClick={startCamera}
              disabled={isCameraActive || loading}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-300 text-xs flex items-center gap-1.5"
            >
              <Camera className="w-4 h-4 text-emerald-400" /> {isCameraActive ? "Camera Active" : "Use Live Camera"}
            </Button>

            <Button
              onClick={analyzeImage}
              disabled={!selectedFile || loading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs py-5 rounded-xl shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Classifying via Hugging Face...
                </>
              ) : (
                "Diagnose Plant Health"
              )}
            </Button>
          </div>
        </div>

        {/* Supported Crops Card */}
        <div className="bg-[#0e131f] border border-white/10 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 14 Supported Crops in Dataset
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed">
            Apple, Blueberry, Cherry, Corn (Maize), Grape, Orange, Peach, Pepper (Bell), Potato, Raspberry, Soybean, Squash, Strawberry, Tomato.
          </p>
        </div>
      </div>

      {/* Results & Analysis Column */}
      <div className="lg:col-span-6 space-y-6">
        {/* Error Diagnostics Card */}
        {errorMsg && (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 text-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-300">
                  {typeof errorMsg === "object" ? errorMsg.error || "Inference Notice" : "Inference Error"}
                </h3>
                <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                  {typeof errorMsg === "object" ? errorMsg.message || JSON.stringify(errorMsg) : String(errorMsg)}
                </p>
                {typeof errorMsg === "object" && errorMsg.action && (
                  <p className="text-xs font-semibold text-amber-300 mt-2 bg-amber-950/40 p-2 rounded-lg border border-amber-500/20">
                    💡 Next Step: {errorMsg.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Successful Prediction Card */}
        {result && (
          <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Top Classification Result
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-1">
                  {result.top_prediction?.label?.replace(/___/g, " — ")?.replace(/_/g, " ") || "Unknown"}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-mono">Confidence</span>
                <p className="text-2xl font-black text-emerald-400">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Low Confidence Warning */}
            {result.low_confidence && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>{result.warning}</p>
              </div>
            )}

            {/* Probability Breakdown */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Class Probability Distribution
              </h4>
              <div className="space-y-2.5">
                {result.all_predictions?.map((item: LeafPrediction, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-300 truncate max-w-[280px]">
                        {item.label?.replace(/___/g, " — ")?.replace(/_/g, " ")}
                      </span>
                      <span className="text-slate-400">{(item.score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(2, item.score * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Non-Diagnostic Disclaimer */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex items-start gap-2.5 text-slate-400 text-[11px] leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <p>{result.disclaimer}</p>
            </div>
          </div>
        )}

        {/* Empty Placeholder */}
        {!result && !errorMsg && (
          <div className="h-full min-h-[300px] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-[#0e131f]/50">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
              <Sparkles className="w-7 h-7 text-emerald-500/50" />
            </div>
            <h3 className="text-base font-bold text-slate-200">Awaiting Leaf Capture</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Select or snap a photo of a crop leaf. The model will run computer vision inference to detect pathogen patterns.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// TAB 2: Text-to-Image Illustration Generator
// ==========================================
function ImageGenTab() {
  const [prompt, setPrompt] = useState("");
  const [stylePreset, setStylePreset] = useState("realistic_farming");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [loading, setLoading] = useState(false);
  const [imageData, setImageData] = useState<TextToImageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<ApiErrorDetail | string | null>(null);

  const samplePrompts = [
    "Drip irrigation installation in a lush Maharashtra tomato field",
    "Indian woman farmer examining golden wheat crop under sun",
    "Rainwater harvesting pond in organic farm, detailed agriculture",
    "Paddy field terrace farming in Uttarakhand hills at dawn"
  ];

  const handleGenerate = async () => {
    if (prompt.trim().length < 3) return;
    setLoading(true);
    setImageData(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/hf/text-to-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style_preset: stylePreset, aspect_ratio: aspectRatio })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "Failed to generate image.");
      } else {
        setImageData(data as TextToImageResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error connecting to backend: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Prompt Form Column */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-cyan-400" /> Agronomy Illustration Studio
            </h2>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              FLUX.1 / SDXL
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Prompt Description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the agricultural scene, crop technique, or farm landscape..."
              rows={4}
              className="w-full bg-white/[0.03] border border-white/15 focus:border-cyan-500/50 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Quick Sample Prompts */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">Sample Agronomy Prompts:</span>
            <div className="flex flex-wrap gap-1.5">
              {samplePrompts.map((sp, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(sp)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[11px] text-slate-300 transition-colors text-left"
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>

          {/* Style Presets */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Style Preset
              </label>
              <select
                value={stylePreset}
                onChange={(e) => setStylePreset(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/15 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="realistic_farming" className="bg-[#0e131f]">Realistic Photography</option>
                <option value="technical_diagram" className="bg-[#0e131f]">Technical Diagram</option>
                <option value="infographic_poster" className="bg-[#0e131f]">Extension Infographic</option>
                <option value="field_sketch" className="bg-[#0e131f]">Botanical Field Sketch</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/15 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="1:1" className="bg-[#0e131f]">Square (1:1)</option>
                <option value="16:9" className="bg-[#0e131f]">Widescreen (16:9)</option>
                <option value="4:3" className="bg-[#0e131f]">Standard (4:3)</option>
              </select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={prompt.trim().length < 3 || loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs py-5 rounded-xl shadow-md disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Rendering via Hugging Face Provider...
              </>
            ) : (
              "Generate Illustration"
            )}
          </Button>
        </div>
      </div>

      {/* Image Preview Column */}
      <div className="lg:col-span-6 space-y-6">
        {errorMsg && (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 text-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-300">
                  {typeof errorMsg === "object" ? errorMsg.error || "Generation Notice" : "Generation Error"}
                </h3>
                <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                  {typeof errorMsg === "object" ? errorMsg.message || JSON.stringify(errorMsg) : String(errorMsg)}
                </p>
                {typeof errorMsg === "object" && errorMsg.action && (
                  <p className="text-xs font-semibold text-amber-300 mt-2 bg-amber-950/40 p-2 rounded-lg border border-amber-500/20">
                    💡 Note: {errorMsg.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {imageData && (
          <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageData.image_base64} alt={imageData.prompt} className="w-full object-contain max-h-[400px]" />
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-cyan-300 border border-cyan-500/20">
                AI-Generated Illustration
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400 italic max-w-sm truncate">
                &ldquo;{imageData.prompt}&rdquo;
              </p>
              <a
                href={imageData.image_base64}
                download="krishi_mitra_illustration.jpg"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>

            <div className="text-[11px] text-slate-500 border-t border-white/5 pt-3">
              {imageData.disclaimer}
            </div>
          </div>
        )}

        {!imageData && !errorMsg && (
          <div className="h-full min-h-[300px] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-[#0e131f]/50">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4">
              <ImageIcon className="w-7 h-7 text-cyan-500/50" />
            </div>
            <h3 className="text-base font-bold text-slate-200">No Illustration Generated Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Provide an agronomy prompt and click generate to synthesize visual guides for farmer educational materials.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==========================================
// TAB 3: Speech-to-Text Studio
// ==========================================
function SpeechToTextTab() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<ApiErrorDetail | string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    setAudioBlob(null);
    setAudioUrl(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Microphone access failed: " + msg);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 25 * 1024 * 1024) {
        setErrorMsg("Audio file exceeds maximum 25 MB limit.");
        return;
      }
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", audioBlob, "farmer_speech.webm");

    try {
      const res = await fetch(`${API_BASE_URL}/hf/speech-to-text`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "Failed to transcribe audio.");
      } else {
        const asrResult = data as SpeechToTextResult;
        setTranscript(asrResult.text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error connecting to backend: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8"
    >
      {/* Audio Capture Column */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Mic className="w-5 h-5 text-indigo-400" /> Speech Recognition Studio
            </h2>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Whisper Turbo
            </span>
          </div>

          {/* Recording Visualizer Box */}
          <div className="border border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center bg-white/[0.02]">
            <div className="relative mb-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
                  isRecording
                    ? "bg-rose-600 text-white animate-pulse shadow-rose-900/50 scale-105"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30"
                }`}
              >
                {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-200">
              {isRecording ? `Recording voice: ${recordingSeconds}s` : "Click microphone to start voice query"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Speak your question clearly in Hindi or English</p>

            {/* Audio Player for Review */}
            {audioUrl && !isRecording && (
              <div className="w-full mt-6 pt-6 border-t border-white/10 flex flex-col items-center">
                <span className="text-[11px] font-mono text-slate-400 mb-2">Recorded Voice Clip:</span>
                <audio controls src={audioUrl} className="w-full h-10" />
              </div>
            )}
          </div>

          {/* File Upload Alternative */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-300 text-xs flex items-center gap-2"
            >
              <FileAudio className="w-4 h-4 text-indigo-400" /> Upload Audio File
            </Button>
            <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />

            <Button
              onClick={transcribeAudio}
              disabled={!audioBlob || loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs py-5 rounded-xl shadow-md disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Transcribing with Whisper...
                </>
              ) : (
                "Transcribe Spoken Voice"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Review & Edit Transcript Column */}
      <div className="lg:col-span-6 space-y-6">
        {errorMsg && (
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 text-rose-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-rose-300">
                  {typeof errorMsg === "object" ? errorMsg.error || "Transcription Notice" : "Transcription Error"}
                </h3>
                <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                  {typeof errorMsg === "object" ? errorMsg.message || JSON.stringify(errorMsg) : String(errorMsg)}
                </p>
                {typeof errorMsg === "object" && errorMsg.action && (
                  <p className="text-xs font-semibold text-amber-300 mt-2 bg-amber-950/40 p-2 rounded-lg border border-amber-500/20">
                    💡 Next Step: {errorMsg.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-bold text-white">Review & Edit Transcript</h3>
              <p className="text-xs text-slate-400">Verify and edit the transcribed query before sending to chatbot.</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 text-slate-400">
              Editable Field
            </span>
          </div>

          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Transcribed voice text will appear here. You can manually correct or expand your query before sending..."
            rows={7}
            className="w-full bg-white/[0.03] border border-white/15 focus:border-indigo-500/50 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all resize-none"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              {transcript.length > 0 ? `${transcript.length} characters` : "No text entered"}
            </span>

            <Button
              onClick={() => {
                if (transcript.trim()) {
                  router.push(`/chatbot?prompt=${encodeURIComponent(transcript.trim())}`);
                }
              }}
              disabled={!transcript.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 font-semibold disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> Send to Krishi Sathi Chatbot
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// TAB 4: Vernacular Translation & TTS Studio
// ==========================================
function TranslationTab() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("hi");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [loadingTranslate, setLoadingTranslate] = useState(false);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingTTS, setLoadingTTS] = useState(false);
  const [errorMsg, setErrorMsg] = useState<ApiErrorDetail | string | null>(null);

  const handleTranslate = async () => {
    if (!sourceText.trim()) return;
    setLoadingTranslate(true);
    setTranslatedText("");
    setAudioUrl(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/hf/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, source_lang: sourceLang, target_lang: targetLang })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "Translation error.");
      } else {
        const transResult = data as TranslateResult;
        setTranslatedText(transResult.translated_text);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error: " + msg);
    } finally {
      setLoadingTranslate(false);
    }
  };

  const handleSynthesizeSpeech = async (textToSpeak: string, lang: string) => {
    if (!textToSpeak.trim()) return;
    setLoadingTTS(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/hf/text-to-speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, language: lang })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "Text-to-speech error.");
      } else {
        const ttsResult = data as TextToSpeechResult;
        setAudioUrl(ttsResult.audio_base64);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error: " + msg);
    } finally {
      setLoadingTTS(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {errorMsg && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 text-rose-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-300">
                {typeof errorMsg === "object" ? errorMsg.error || "Linguistic Engine Notice" : "Linguistic Error"}
              </h3>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                {typeof errorMsg === "object" ? errorMsg.message || JSON.stringify(errorMsg) : String(errorMsg)}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Source Text Column */}
        <div className="lg:col-span-6 bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase">From:</span>
              <select
                value={sourceLang}
                onChange={(e) => {
                  const newSrc = e.target.value;
                  setSourceLang(newSrc);
                  setTargetLang(newSrc === "en" ? "hi" : "en");
                }}
                className="bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white"
              >
                <option value="en" className="bg-[#0e131f]">English (en)</option>
                <option value="hi" className="bg-[#0e131f]">Hindi (hi)</option>
              </select>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Helsinki-NLP Opus-MT</span>
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder={
              sourceLang === "en"
                ? "Enter farming advice, fertilizer guidance, or question in English..."
                : "किसान भाई अपनी फसल या खाद सम्बन्धी सवाल यहाँ लिखें..."
            }
            rows={6}
            className="w-full bg-white/[0.03] border border-white/15 focus:border-amber-500/50 rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all resize-none"
          />

          <Button
            onClick={handleTranslate}
            disabled={!sourceText.trim() || loadingTranslate}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs py-5 rounded-xl shadow-md disabled:opacity-50"
          >
            {loadingTranslate ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Translating via Opus-MT...
              </>
            ) : (
              "Translate Text"
            )}
          </Button>
        </div>

        {/* Translated Text & Audio Column */}
        <div className="lg:col-span-6 bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300 uppercase">To:</span>
              <span className="px-2.5 py-1 rounded-md bg-white/5 text-xs text-amber-300 font-semibold border border-white/10">
                {targetLang === "hi" ? "Hindi (hi)" : "English (en)"}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Facebook MMS-TTS</span>
          </div>

          <div className="w-full min-h-[148px] bg-white/[0.02] border border-white/10 rounded-2xl p-4 text-sm text-slate-200 leading-relaxed">
            {translatedText ? (
              translatedText
            ) : (
              <span className="text-slate-500 italic">Translated text will appear here...</span>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              onClick={() => handleSynthesizeSpeech(translatedText, targetLang)}
              disabled={!translatedText || loadingTTS}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-200 text-xs flex items-center gap-2"
            >
              {loadingTTS ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Synthesizing Audio...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400" /> Listen to Audio (MMS-TTS)
                </>
              )}
            </Button>

            {audioUrl && (
              <div className="flex-1 max-w-[200px] ml-4">
                <audio controls autoPlay src={audioUrl} className="w-full h-8" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ==========================================
// TAB 5: Government Schemes RAG Explorer
// ==========================================
function GovtRagTab() {
  const [query, setQuery] = useState("");
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [loadingIngest, setLoadingIngest] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [ragResult, setRagResult] = useState<RagResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<ApiErrorDetail | string | null>(null);

  const sampleQueries = [
    "What is the annual financial support under PM-Kisan?",
    "How to claim crop insurance for hailstorm damage under PMFBY?",
    "What subsidy is available for drip irrigation under PMKSY?",
    "What are the exclusion criteria for PM-KISAN beneficiaries?"
  ];

  const handleIngest = async () => {
    setLoadingIngest(true);
    setIngestStatus(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/hf/rag/ingest`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "Failed to ingest seed documents.");
      } else {
        setIngestStatus(`Success: ${data.message} (${data.dimensions}d vectors in MongoDB)`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error: " + msg);
    } finally {
      setLoadingIngest(false);
    }
  };

  const handleSearch = async (queryText?: string) => {
    const q = queryText || query;
    if (q.trim().length < 3) return;
    setLoadingQuery(true);
    setRagResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/hf/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, top_k: 3 })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || data.message || "RAG search failed.");
      } else {
        setRagResult(data as RagResult);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg("Network error: " + msg);
    } finally {
      setLoadingQuery(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Search Input Bar */}
      <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" /> Government Policy Semantic RAG
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verified document search powered by Hugging Face multilingual sentence embeddings + MongoDB.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleIngest}
              disabled={loadingIngest}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-slate-300 text-xs flex items-center gap-1.5"
            >
              {loadingIngest ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Ingesting...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Ingest Verified Schemes
                </>
              )}
            </Button>
          </div>
        </div>

        {ingestStatus && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {ingestStatus}
          </div>
        )}

        {/* Search Query Input */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Ask a policy question (e.g. PM-Kisan installment rules, PMFBY insurance claim window)..."
              className="w-full bg-white/[0.03] border border-white/15 focus:border-emerald-500/50 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all"
            />
          </div>
          <Button
            onClick={() => handleSearch()}
            disabled={query.trim().length < 3 || loadingQuery}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl text-xs font-semibold shadow-md disabled:opacity-50"
          >
            {loadingQuery ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search RAG"}
          </Button>
        </div>

        {/* Sample Queries */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">Verified Policy Questions:</span>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(sq);
                  handleSearch(sq);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-300 transition-colors text-left"
              >
                {sq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RAG Results & Citations */}
      {errorMsg && (
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-3xl p-6 text-rose-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-300">
                {typeof errorMsg === "object" ? errorMsg.error || "RAG Notice" : "RAG Error"}
              </h3>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                {typeof errorMsg === "object" ? errorMsg.message || JSON.stringify(errorMsg) : String(errorMsg)}
              </p>
            </div>
          </div>
        </div>
      )}

      {ragResult && (
        <div className="space-y-6">
          {/* Grounded Answer Card */}
          <div className="bg-[#0e131f] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  {ragResult.sufficient_evidence ? "Verified Grounded Answer" : "Insufficient Evidence Response"}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400">
                Similarity Score: <span className="text-emerald-400 font-bold">{(ragResult.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>

            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {ragResult.answer}
            </div>
          </div>

          {/* Citations Grid */}
          {ragResult.sources && ragResult.sources.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Official Source Citations ({ragResult.sources.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ragResult.sources.map((src: RagCitation, idx: number) => (
                  <div key={idx} className="bg-[#0e131f] border border-white/10 rounded-2xl p-5 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 uppercase">
                        Match: {(src.relevance_score * 100).toFixed(1)}%
                      </span>
                      <a
                        href={src.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-tight">{src.scheme_title}</h4>
                    <p className="text-[11px] text-slate-400">{src.ministry} — {src.section}</p>
                    <p className="text-xs text-slate-300 italic border-l-2 border-emerald-500/40 pl-2.5 line-clamp-3">
                      &ldquo;{src.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
