"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/lib/config";
import {
  MoveRight,
  Bot,
  Sprout,
  MapPin,
  Gavel,
  Users,
  ArrowLeft,
  Sparkles,
  GraduationCap,
  Store,
  X,
  Search,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GetStarted() {
  const router = useRouter();
  const [showKendraModal, setShowKendraModal] = useState(false);
  const [city, setCity] = useState("");
  const [kendraResult, setKendraResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const features = [
    {
      title: "Hugging Face AI",
      subtitle: "AI Studio",
      desc: "Leaf diagnosis, illustration gen, speech & RAG.",
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />,
      size: "col-span-1 row-span-1",
      color: "rgba(16, 185, 129, 0.1)",
      link: "/huggingface-ai"
    },
    {
      title: "AI Chatbot",
      subtitle: "Krishi Sathi",
      desc: "Instant answers for crops & soil.",
      icon: <Bot className="w-5 h-5 text-blue-400" />,
      size: "col-span-1 row-span-1",
      color: "rgba(59, 130, 246, 0.1)",
      link: "/chatbot"
    },
    {
      title: "Krishi Vidya",
      subtitle: "Learning Hub",
      desc: "Master modern farming with expert-led video lessons.",
      icon: <GraduationCap className="w-5 h-5 text-yellow-400" />,
      size: "col-span-1 row-span-1",
      color: "rgba(234, 179, 8, 0.1)",
      link: "/academy"
    },

    {
      title: "Kisan Seva Kendra",
      subtitle: "Centers",
      desc: "Find nearest physical support centers.",
      icon: <Store className="w-5 h-5 text-orange-400" />,
      size: "col-span-1 row-span-1",
      color: "rgba(249, 115, 22, 0.1)",
      link: "kendra-modal" // Trigger for modal
    },
    {
      title: "Govt Schemes",
      subtitle: "Benefits",
      desc: "Financial aid and subsidies tailored for you.",
      icon: <Gavel className="w-5 h-5 text-purple-400" />,
      size: "col-span-1 md:row-span-2",
      color: "rgba(168, 85, 247, 0.1)",
      link: "/schemes"
    },
    {
      title: "Women Farmers",
      subtitle: "Empowerment",
      desc: "Special resources and training modules.",
      icon: <Users className="w-5 h-5 text-rose-400" />,
      size: "md:col-span-2 col-span-1 row-span-1",
      color: "rgba(244, 63, 94, 0.1)",
      link: "/women-empowerment"
    },
  ];

  const handleFeatureClick = (link: string) => {
    if (link === "kendra-modal") {
      setShowKendraModal(true);
    } else if (link !== "#") {
      router.push(link);
    }
  };

  const findKendra = async () => {
    if (!city) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/kisan-kendra/find?city=${encodeURIComponent(city)}`);
      const data = await res.json();
      setKendraResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-slate-200 selection:bg-blue-500/30 overflow-x-hidden relative">

      {/* ... Background elements ... */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] left-[-5%] w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-emerald-600/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-24 pb-20 relative z-10">

        {/* Top Nav */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-12 md:mb-16"
        >
          <Link href="/" className="group flex items-center gap-2 text-slate-500 hover:text-white transition-all">
            <div className="p-2 rounded-full border border-white/5 bg-white/5 group-hover:border-white/20 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase">Portal Home</span>
          </Link>
          <div className="flex gap-2">
            <div className="h-1 w-8 md:w-12 bg-blue-600 rounded-full" />
            <div className="h-1 w-3 md:w-4 bg-white/10 rounded-full" />
          </div>
        </motion.div>

        {/* ... Hero Section ... */}
        <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-center mb-20 md:mb-32">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7 order-2 lg:order-1"
          >
            <div className="flex items-center gap-2 mb-4 md:mb-6 text-blue-400 font-mono text-xs md:text-sm tracking-tighter">
              <Sparkles className="w-4 h-4" />
              <span>Smarter Agriculture with AI</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-bold text-white tracking-tighter leading-[0.9] mb-6 md:mb-8">
              Kisan <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40">
                Revolution.
              </span>
            </h1>
            <p className="text-slate-400 text-base md:text-xl max-w-lg leading-relaxed mb-8 md:mb-10 border-l-2 border-blue-600 pl-4 md:pl-6">
              Step into the future of Indian farming. High-performance tools for the modern agriculturist.
            </p>
            <Button size="lg" className="w-full md:w-auto bg-white text-black hover:bg-slate-200 rounded-full px-10 h-14 font-bold transition-all hover:scale-105 active:scale-95">
              Welcome Back <MoveRight className="ml-2 w-5 h-5" />
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="lg:col-span-5 relative order-1 lg:order-2"
          >
            <div className="relative z-10 p-1.5 md:p-2 bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl">
              <Image
                src="/krishi.png"
                alt="Krishi Mitra"
                width={500}
                height={600}
                priority
                className="rounded-[2.2rem] md:rounded-[2.5rem] grayscale-[0.2] hover:grayscale-0 transition-all duration-700 w-full h-auto"
              />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-2 border-r-2 border-blue-600/30 rounded-br-[2.5rem] hidden md:block" />
          </motion.div>
        </div>

        {/* --- BENTO BOX FEATURES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 0.99 }}
              onClick={() => handleFeatureClick(item.link)}
              className={`${item.size} group relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] border border-white/5 bg-[#050505] p-6 md:p-8 hover:border-white/20 transition-all duration-500 min-h-[220px] md:min-h-0 cursor-pointer`}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${item.color} 0%, transparent 70%)` }}
              />

              <div className="flex flex-col h-full justify-between relative z-10">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white group-hover:text-black transition-all">
                    {item.icon}
                  </div>
                  <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">{item.subtitle}</h4>
                  <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-none">{item.title}</h3>
                </div>

                <div className="mt-6">
                  <p className="text-slate-500 text-sm leading-snug group-hover:text-slate-300 transition-colors">
                    {item.desc}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-white md:opacity-0 md:group-hover:opacity-100 md:-translate-x-2 md:group-hover:translate-x-0 transition-all">
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {item.link === "kendra-modal" ? "Use Finder" : "Go to Tool"}
                    </span>
                    <MoveRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-20 md:mt-32 flex flex-col md:flex-row justify-between items-center border-t border-white/5 pt-12 text-slate-600 gap-6">
          <div className="flex gap-6">
            <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase">Architecture v2.0</span>
            <span className="text-[9px] md:text-[10px] font-bold tracking-[0.4em] uppercase">IIIT Bhagalpur</span>
          </div>
          <p className="text-[9px] md:text-[10px] max-w-xs text-center md:text-right">Designed for high-impact agricultural operations using Neural Networks.</p>
        </div>
      </div>

      {/* --- KISAN KENDRA MODAL --- */}
      <AnimatePresence>
        {showKendraModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowKendraModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 m-auto z-50 w-full max-w-lg h-fit bg-[#0a0a0a] border border-white/10 rounded-3xl p-8"
            >
              <button onClick={() => setShowKendraModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>

              <div className="mb-6">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4">
                  <Store className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">Find Kisan Seva Kendra</h2>
                <p className="text-slate-400">Enter your city to find the nearest physical support center.</p>
              </div>

              <div className="flex gap-2 mb-6">
                <Input
                  placeholder="Enter City (e.g. Bhagalpur, Patna)"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && findKendra()}
                  className="bg-black border-white/10 text-white"
                />
                <Button onClick={findKendra} className="bg-orange-600 hover:bg-orange-700 font-bold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </div>

              {kendraResult && (
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                  <h3 className="font-bold text-lg text-white mb-1">{kendraResult.name}</h3>
                  <div className="flex items-start gap-2 text-slate-400 text-sm mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    {kendraResult.address}
                  </div>

                  <div className="space-y-2 mb-4">
                    {kendraResult.services.map((s: string, i: number) => (
                      <span key={i} className="inline-block px-2 py-1 bg-white/5 rounded text-[10px] uppercase font-bold text-slate-500 mr-2 border border-white/5">
                        {s}
                      </span>
                    ))}
                  </div>

                  <Button className="w-full bg-white text-black hover:bg-slate-200 font-bold rounded-xl">
                    Navigate to Center
                  </Button>
                </div>
              )}

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}