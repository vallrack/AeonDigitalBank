
"use client"

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Globe, ArrowRight, ChevronDown, Languages } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function LandingPage() {
  const { t, language, setLanguage } = useI18n();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <nav className="h-20 flex items-center justify-between px-4 md:px-12 fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center glow-indigo">
            <span className="text-primary font-headline font-bold text-xl">B</span>
          </div>
          <span className="font-headline font-bold text-2xl tracking-tight hidden sm:inline">
            Bank of <span className="text-accent">Americans</span>
          </span>
        </div>
        
        <div className="hidden lg:flex items-center gap-8">
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">{t.nav.personal}</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">{t.nav.business}</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">{t.nav.solutions}</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">{t.nav.pricing}</Link>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Languages size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-white/10">
              <DropdownMenuItem onClick={() => setLanguage('es')} className={language === 'es' ? 'bg-primary/20' : ''}>
                Español 🇪🇸
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-primary/20' : ''}>
                English 🇺🇸
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" asChild className="text-sm sm:text-base px-3 sm:px-4">
            <Link href="/login">{t.common.log_in}</Link>
          </Button>
          <Button className="glow-indigo rounded-full px-4 sm:px-6 text-sm sm:text-base" asChild>
            <Link href="/register">{t.common.get_started}</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-40 pb-20 px-6 md:px-12 flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] sm:w-[800px] h-[300px] sm:h-[400px] bg-primary/20 blur-[80px] sm:blur-[120px] rounded-full -z-10 animate-pulse" />
        
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 bg-accent rounded-full animate-ping" />
          <span className="text-[10px] sm:text-xs font-headline font-medium tracking-wider uppercase text-accent">
            {t.landing.hero_badge}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-8xl font-headline font-bold tracking-tight mb-6 max-w-5xl leading-[1.1]">
          {t.landing.hero_title} <br />
          <span className="bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-gradient text-transparent bg-clip-text">
            {t.landing.hero_subtitle}
          </span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed px-4">
          {t.landing.hero_desc}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-6">
          <Button size="lg" className="glow-indigo h-14 px-10 rounded-full text-lg font-headline font-semibold group" asChild>
            <Link href="/register">
              {t.landing.cta_open} <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Link>
          </Button>
          <Button size="lg" variant="outline" className="h-14 px-10 rounded-full text-lg font-headline font-semibold border-white/10 hover:bg-white/5">
            {t.landing.cta_plans}
          </Button>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-16 sm:mt-24 animate-bounce text-muted-foreground flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.4em] mb-2 font-headline">{t.landing.discover}</span>
          <ChevronDown size={20} />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: Shield,
            title: t.landing.feat_security_title,
            desc: t.landing.feat_security_desc
          },
          {
            icon: Zap,
            title: t.landing.feat_speed_title,
            desc: t.landing.feat_speed_desc
          },
          {
            icon: Globe,
            title: t.landing.feat_global_title,
            desc: t.landing.feat_global_desc
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary font-headline font-bold text-xs">B</span>
            </div>
            <span className="font-headline font-bold text-lg tracking-tight">BANK OF AMERICANS</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">{t.landing.footer_privacy}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.landing.footer_terms}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.landing.footer_cookies}</Link>
            <Link href="#" className="hover:text-primary transition-colors">{t.landing.footer_status}</Link>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2024 Bank of Americans. {t.landing.footer_rights}
          </p>
        </div>
      </footer>
    </div>
  );
}
