"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const pathname = usePathname();
  const isGetStarted = pathname.startsWith("/get-started");

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/40 border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">

        {/* LOGO */}
        <Link href="/">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            KRISHI MITRA
          </h1>
        </Link>

        {/* NAV LINKS */}
        <div className="hidden md:flex gap-6 text-sm text-slate-300">
          {isGetStarted ? (
            <>
              <Link href="/huggingface-ai" className="text-emerald-400 font-medium">HF AI Studio</Link>
              <Link href="#chatbot">Chatbot</Link>
              <Link href="#crop-doctor">Crop Doctor</Link>
              <Link href="#market">Market Prices</Link>
              <Link href="#schemes">Govt Schemes</Link>
              <Link href="#women">Women Farmers</Link>
            </>
          ) : (
            <>
              <Link href="/huggingface-ai" className="text-emerald-400 font-medium">HF AI Studio</Link>
              <Link href="#features">Features</Link>
              <Link href="#developers">Developers</Link>
              <Link href="#about">About</Link>
            </>
          )}
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          {isGetStarted ? (
            <Button className="bg-blue-600 hover:bg-blue-500">
              Open Dashboard
            </Button>
          ) : (
            <Link href="/get-started">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                Get Started
              </Button>
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}
