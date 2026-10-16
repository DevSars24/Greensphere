"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  MoveRight,
  Github,
  Linkedin,
  Leaf,
  CloudSun,
  ScrollText,
  Menu,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const animatedTexts = [
  { main: "Smarter Farming", sub: "Better Decisions" },
  { main: "Smarter Farming", sub: "Better Tomorrow" },
  { main: "Smarter Farming", sub: "Better Yield" },
];

const features = [
  {
    number: "01",
    title: "Crop Health",
    description:
      "Get AI-assisted insights into potential crop diseases from photos and explore possible next steps for healthier crops.",
    icon: Leaf,
    color: "text-[#35490C]",
    iconBg: "bg-[#35490C]/10",
  },
  {
    number: "02",
    title: "Weather Alerts",
    description:
      "Use local weather information to plan fieldwork, irrigation, and harvests with greater confidence.",
    icon: CloudSun,
    color: "text-[#986118]",
    iconBg: "bg-[#986118]/10",
  },
  {
    number: "03",
    title: "Government Schemes",
    description:
      "Discover agricultural schemes, explore eligibility details, and find guidance for the application process.",
    icon: ScrollText,
    color: "text-[#513A1F]",
    iconBg: "bg-[#513A1F]/10",
  },
];

const steps = [
  {
    number: "01",
    emoji: "💬",
    title: "Ask your question",
    description:
      "Ask farming questions in your preferred language and upload crop photos when you need help understanding a possible issue.",
  },
  {
    number: "02",
    emoji: "🌱",
    title: "Explore AI insights",
    description:
      "Get relevant farming guidance based on your question and the information available to the platform.",
  },
  {
    number: "03",
    emoji: "🤝",
    title: "Plan your next step",
    description:
      "Explore possible actions, learn about agricultural schemes, and make more informed farming decisions.",
  },
];

export default function LandingPage() {
  const [textIndex, setTextIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setTextIndex((current) => (current + 1) % animatedTexts.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll(".reveal");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F6F6E7] text-[#0C0D03]">
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="animate-blob absolute -left-40 top-20 h-80 w-80 rounded-full bg-[#575610]/10 blur-[100px]" />
        <div className="animate-blob animation-delay-2000 absolute -right-40 top-52 h-96 w-96 rounded-full bg-[#986118]/10 blur-[110px]" />
        <div className="animate-blob animation-delay-4000 absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#35490C]/10 blur-[110px]" />
      </div>

      {/* Navbar */}
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-3 sm:px-6">
        <nav className="glass mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-5 py-3 sm:px-6">
          <Link
            href="/"
            className="text-lg font-black tracking-tight sm:text-xl">
            KRISHI <span className="text-[#35490C]">MITRA</span>
          </Link>

          <div className="hidden items-center gap-7 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-[#575610] transition hover:text-[#0C0D03]">
              Why Choose Us
            </Link>
            <Link
              href="#app-preview"
              className="text-sm font-medium text-[#575610] transition hover:text-[#0C0D03]">
              Platform
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-[#575610] transition hover:text-[#0C0D03]">
              How It Works
            </Link>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button className="rounded-xl bg-[#35490C] px-5 font-semibold text-white hover:bg-[#263708]">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <Link href="/get-started">
                <Button
                  variant="outline"
                  className="rounded-xl border-[#35490C]/25 bg-transparent text-[#35490C] hover:bg-[#35490C]/10">
                  Dashboard
                </Button>
              </Link>
              <UserButton />
            </SignedIn>
          </div>

          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-[#35490C] hover:bg-[#35490C]/10 md:hidden">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="glass mx-auto mt-2 max-w-7xl rounded-2xl p-4 shadow-lg md:hidden">
            <div className="flex flex-col gap-1">
              {[
                ["Why Choose Us", "#features"],
                ["Platform", "#app-preview"],
                ["How It Works", "#how-it-works"],
              ].map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-[#35490C] hover:bg-[#35490C]/10">
                  {label}
                </Link>
              ))}

              <SignedOut>
                <SignUpButton mode="modal">
                  <Button className="mt-2 rounded-xl bg-[#35490C] font-semibold text-white hover:bg-[#263708]">
                    Get Started
                  </Button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <Link href="/get-started" onClick={() => setMenuOpen(false)}>
                  <Button className="mt-2 w-full rounded-xl bg-[#35490C] text-white hover:bg-[#263708]">
                    Open Dashboard
                  </Button>
                </Link>
              </SignedIn>
            </div>
          </div>
        )}
      </header>

      {/* 1. HERO — smaller heading and less top spacing */}
      <section className="relative z-10 px-5 pb-12 pt-28 text-center sm:px-6 sm:pt-32 md:pt-36">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-5 inline-flex items-center gap-2 rounded-full border border-[#35490C]/15 bg-white/65 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-[#758C36]" />
            <span className="text-xs font-semibold text-[#575610] sm:text-sm">
              Built for Indian Farmers · Powered by AI
            </span>
          </div>

          <h1 className="reveal mx-auto mb-4 flex min-h-[112px] flex-col justify-center text-4xl font-black leading-[1.08] tracking-[-0.045em] sm:min-h-[140px] sm:text-6xl md:min-h-[155px] md:text-7xl lg:text-[5.5rem]">
            <AnimatePresence mode="wait">
              <motion.span
                key={textIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.45 }}
                className="flex flex-col">
                <span className="bg-gradient-to-b from-[#0C0D03] via-[#513A1F] to-[#35490C] bg-clip-text text-transparent">
                  {animatedTexts[textIndex].main}
                </span>
                <span className="mt-1 bg-gradient-to-r from-[#986118] via-[#986118] to-[#35490C] bg-clip-text text-transparent">
                  {animatedTexts[textIndex].sub}
                </span>
              </motion.span>
            </AnimatePresence>
          </h1>

          <p className="reveal mx-auto mb-6 max-w-2xl text-sm leading-7 text-[#575610] sm:text-base md:text-lg">
            Krishi Mitra helps farmers make better decisions using AI — from
            crop health and weather information to government schemes.
          </p>

          <div className="reveal mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignedOut>
              <SignUpButton mode="modal">
                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-[#35490C] px-6 font-bold text-white shadow-md shadow-[#35490C]/15 transition hover:-translate-y-0.5 hover:bg-[#263708]">
                  Start Using Krishi Mitra
                  <MoveRight className="ml-2 h-5 w-5" />
                </Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <Link href="/get-started">
                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-[#35490C] px-6 font-bold text-white hover:bg-[#263708]">
                  Go to Dashboard
                  <MoveRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </SignedIn>

            <Link href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-[#513A1F]/25 bg-white/60 px-6 font-semibold text-[#513A1F] hover:bg-white">
                See How It Works
                <ArrowDown className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="reveal mx-auto max-w-6xl">
            <div className="group relative">
              <div className="absolute -inset-2 rounded-[2rem] bg-[#35490C]/10 blur-2xl transition-opacity duration-700 group-hover:bg-[#35490C]/15" />

              <div className="relative overflow-hidden rounded-2xl border border-[#0C0D03]/10 bg-[#0C0D03] shadow-[0_25px_70px_-35px_rgba(12,13,3,0.4)] sm:rounded-[1.75rem]">
                <video
                  className="aspect-video max-h-[560px] w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/hero-field.jpg"
                  aria-label="Wheat moving gently in a field">
                  <source src="/videos/hero-wheat.mp4" type="video/mp4" />
                  Your browser does not support embedded video.
                </video>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0C0D03]/65 via-transparent to-transparent" />

                <div className="absolute bottom-4 left-4 right-4 text-left text-white sm:bottom-6 sm:left-6 sm:right-6">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75 sm:text-xs">
                    Rooted in the real world
                  </p>
                  <p className="text-base font-semibold sm:text-2xl">
                    Better insights. Stronger harvests.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[#575610] sm:text-sm">
            <span className="flex items-center gap-2">
              <Leaf size={15} className="text-[#35490C]" />
              Farmer-focused tools
            </span>
            <span className="flex items-center gap-2">
              <CloudSun size={15} className="text-[#986118]" />
              Practical insights
            </span>
            <span className="flex items-center gap-2">
              <ScrollText size={15} className="text-[#513A1F]" />
              Scheme guidance
            </span>
          </div>
        </div>
      </section>

      {/* 2. WHY CHOOSE US */}
      <section
        id="features"
        className="relative z-10 px-5 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-10 max-w-2xl md:mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#986118]">
              Why choose Krishi Mitra?
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Made for the realities of{" "}
              <span className="text-[#35490C]">farming.</span>
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-[#575610]">
              Useful tools for everyday questions — with a focus on making
              farming information easier to explore and understand.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.number}
                  className="reveal group relative overflow-hidden rounded-3xl border border-[#0C0D03]/[0.08] bg-white/75 p-7 transition duration-300 hover:-translate-y-1 hover:border-[#35490C]/25 hover:shadow-xl hover:shadow-[#0C0D03]/5 sm:p-8">
                  <div className="mb-8 flex items-start justify-between">
                    <div className={`rounded-2xl p-4 ${feature.iconBg}`}>
                      <Icon className={`h-7 w-7 ${feature.color}`} />
                    </div>
                    <span className="text-xs font-bold tracking-widest text-[#575610]/50">
                      {feature.number}
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl font-bold sm:text-2xl">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-7 text-[#575610] sm:text-base">
                    {feature.description}
                  </p>

                  <div className="mt-7 flex items-center gap-2 text-sm font-bold text-[#35490C]">
                    Explore the platform
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. KRISHI MITRA APP PREVIEW — your original image */}
      <section
        id="app-preview"
        className="relative z-10 px-5 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mx-auto mb-9 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#986118]">
              Meet your farming assistant
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              A closer look at{" "}
              <span className="text-[#35490C]">Krishi Mitra.</span>
            </h2>
            <p className="mt-4 leading-7 text-[#575610]">
              Explore the platform designed to bring helpful agricultural
              information together in one place.
            </p>
          </div>

          <div className="reveal group relative mx-auto max-w-6xl">
            <div className="absolute -inset-3 rounded-[2rem] bg-[#35490C]/10 blur-2xl transition-opacity duration-700 group-hover:bg-[#35490C]/15" />

            <div className="relative overflow-hidden rounded-2xl border border-[#0C0D03]/10 bg-white p-2 shadow-[0_25px_70px_-35px_rgba(12,13,3,0.3)] transition-transform duration-500 group-hover:-translate-y-1 sm:rounded-[1.75rem] sm:p-3">
              <Image
                src="/KrishiPage.png"
                alt="Krishi Mitra application preview"
                width={1200}
                height={675}
                priority={false}
                className="h-auto w-full rounded-xl object-cover sm:rounded-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section
        id="how-it-works"
        className="relative z-10 border-y border-[#35490C]/10 bg-[#F1F0E4] px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="reveal mb-12 text-center md:mb-16">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#986118]">
              Simple by design
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              How Krishi Mitra works
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-[#575610] sm:text-lg">
              Ask. Explore. Act. Get farming guidance in a simple, approachable
              way.
            </p>
          </div>

          <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-12">
            <div className="reveal lg:col-span-3">
              <div className="overflow-hidden rounded-3xl border border-[#35490C]/10 bg-[#F6F6E7] p-3 shadow-xl shadow-[#0C0D03]/5 sm:p-5">
                <div className="mb-3 flex items-center gap-2 px-2 pt-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#986118]/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#35490C]/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#575610]/25" />
                  <span className="ml-2 text-xs text-[#575610]">
                    Your farming assistant
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#35490C]/10 bg-white">
                  <Image
                    src="/how-it-works.png"
                    alt="How the Krishi Mitra chatbot works"
                    width={1000}
                    height={750}
                    className="h-auto w-full object-cover"
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-[#575610]">
                Explore farming questions and practical guidance in one place.
              </p>
            </div>

            <div className="space-y-4 lg:col-span-2">
              {steps.map((step) => (
                <article
                  key={step.number}
                  className="reveal rounded-2xl border border-[#35490C]/10 bg-white/80 p-5 transition hover:border-[#35490C]/25 hover:shadow-lg sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F0E4] text-2xl">
                      {step.emoji}
                    </div>
                    <div>
                      <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#986118]">
                        STEP {step.number}
                      </p>
                      <h3 className="mb-2 text-lg font-bold">{step.title}</h3>
                      <p className="text-sm leading-6 text-[#575610]">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="reveal mt-12 flex flex-col items-center justify-between gap-5 rounded-3xl border border-[#35490C]/15 bg-[#F6F6E7] p-6 sm:p-8 md:flex-row">
            <div>
              <h3 className="text-xl font-bold sm:text-2xl">
                Ready to explore Krishi Mitra?
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#575610] sm:text-base">
                Start with a farming question and explore the platform.
              </p>
            </div>

            <SignedOut>
              <SignUpButton mode="modal">
                <Button className="rounded-xl bg-[#35490C] px-6 font-bold text-white hover:bg-[#263708]">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <Link href="/get-started">
                <Button className="rounded-xl bg-[#35490C] px-6 font-bold text-white hover:bg-[#263708]">
                  Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* 5. DEVELOPERS */}
      <section id="team" className="relative z-10 px-5 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-7xl text-center">
          <div className="reveal mb-12">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#986118]">
              Behind the platform
            </p>
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
              Built by engineers who care
            </h2>
            <p className="mt-4 text-[#575610] sm:text-lg">
              Designed and engineered by Team IIIT Bhagalpur.
            </p>
          </div>

          <article className="reveal mx-auto max-w-xl rounded-3xl border border-[#35490C]/10 bg-white/80 p-8 text-center shadow-lg shadow-[#0C0D03]/5 transition hover:-translate-y-1 hover:shadow-xl sm:p-10">
            <Avatar className="mx-auto mb-5 h-24 w-24 border-4 border-[#F1F0E4]">
              <AvatarFallback className="bg-[#35490C] text-2xl font-black text-white">
                SS
              </AvatarFallback>
            </Avatar>

            <h3 className="mb-2 text-2xl font-bold">Saurabh Singh</h3>
            <Badge className="border border-[#35490C]/15 bg-[#F1F0E4] px-4 py-1 text-[#35490C] hover:bg-[#F1F0E4]">
              Lead Architect &amp; Full Stack
            </Badge>

            <p className="mx-auto mb-7 mt-5 max-w-sm leading-7 text-[#575610]">
              Backend-focused full-stack engineer passionate about AI agents,
              DevOps, and scalable systems.
            </p>

            <div className="flex justify-center gap-3">
              <Link
                href="https://github.com/DevSars24"
                target="_blank"
                rel="noreferrer"
                aria-label="Saurabh Singh on GitHub"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#35490C]/15 bg-[#F1F0E4] text-[#35490C] transition hover:bg-[#35490C] hover:text-white">
                <Github size={19} />
              </Link>

              <Link
                href="https://www.linkedin.com/in/saurabh-singh-25639a306"
                target="_blank"
                rel="noreferrer"
                aria-label="Saurabh Singh on LinkedIn"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#35490C]/15 bg-[#F1F0E4] text-[#35490C] transition hover:bg-[#35490C] hover:text-white">
                <Linkedin size={19} />
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="relative z-10 border-t border-[#35490C]/10 bg-[#F1F0E4] px-5 py-7 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <Link href="/" className="text-sm font-black tracking-tight">
            KRISHI <span className="text-[#35490C]">MITRA</span>
          </Link>

          <p className="text-xs leading-6 text-[#575610] sm:text-sm">
            © {new Date().getFullYear()} Krishi Mitra — Empowering Indian
            farmers with AI technology.
          </p>

          <Link
            href="#"
            className="text-xs font-semibold text-[#35490C] hover:text-[#986118]">
            Back to top ↑
          </Link>
        </div>
      </footer>
    </main>
  );
}
