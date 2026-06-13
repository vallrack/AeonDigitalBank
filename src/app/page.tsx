"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Globe, ArrowRight, CreditCard, ChevronDown } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0E1016]">
      {/* Navbar */}
      <nav className="h-20 flex items-center justify-between px-6 md:px-12 fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center glow-indigo">
            <span className="text-white font-headline font-bold text-xl">A</span>
          </div>
          <span className="font-headline font-bold text-2xl tracking-tight">
            AEON <span className="text-accent">BANK</span>
          </span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Personal</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Business</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Solutions</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login">Log In</Link>
          </Button>
          <Button className="glow-indigo rounded-full px-6" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 md:px-12 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
        
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 bg-accent rounded-full animate-ping" />
          <span className="text-xs font-headline font-medium tracking-wider uppercase text-accent">Next Generation Banking is here</span>
        </div>

        <h1 className="text-5xl md:text-8xl font-headline font-bold tracking-tight mb-6 max-w-5xl leading-[1.1]">
          Precision Finance for <br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient text-transparent bg-clip-text">Digital Pioneers.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
          Experience ultra-secure neobanking with dynamic virtual cards, AI-powered fraud monitoring, and frictionless global transfers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="glow-indigo h-14 px-10 rounded-full text-lg font-headline font-semibold group" asChild>
            <Link href="/register">
              Open Account <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg font-headline font-semibold border-white/10 hover:bg-white/5">
            Compare Plans
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-24 animate-bounce text-muted-foreground flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.4em] mb-2 font-headline">Discover Aeon</span>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: Shield,
            title: "Military-Grade Security",
            desc: "Your assets are protected by end-to-end encryption and real-time AI fraud analysis."
          },
          {
            icon: Zap,
            title: "Frictionless Speed",
            desc: "Instant internal transfers and real-time settlements via modern global payment networks."
          },
          {
            icon: Globe,
            title: "Borderless Economy",
            desc: "Hold, send, and spend in 50+ currencies with institutional-grade exchange rates."
          }
        ].map((feat, i) => (
          <div key={i} className="glass p-8 rounded-3xl border-white/5 group hover:border-primary/50 transition-all duration-500">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors duration-500">
              <feat.icon size={28} className="text-primary group-hover:text-white" />
            </div>
            <h3 className="text-2xl font-headline font-bold mb-4">{feat.title}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {feat.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="mt-auto py-12 px-6 md:px-12 border-t border-white/5 bg-background">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-headline font-bold text-xs">A</span>
            </div>
            <span className="font-headline font-bold text-lg tracking-tight">AEON BANK</span>
          </div>
          
          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="#" className="hover:text-white transition-colors">Status</Link>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2024 Aeon Digital Bank. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
