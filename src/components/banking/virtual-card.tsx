"use client"

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Recycle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardStyleType = 'customized-cash' | 'unlimited-cash' | 'travel-rewards' | 'bankamericard' | 'disposable' | 'standard' | 'custom';

interface VirtualCardProps {
  cardHolder: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  isFrozen?: boolean;
  type?: CardStyleType;
  variant?: 'standard' | 'fifa';
  showNumbersOnFront?: boolean;
  className?: string;
  interactive?: boolean;
  customColor?: string;
}

export function VirtualCard({ 
  cardHolder, 
  cardNumber, 
  expiryDate, 
  cvv, 
  isFrozen = false,
  type = 'customized-cash',
  variant = 'standard',
  showNumbersOnFront = true,
  className,
  interactive = true,
  customColor
}: VirtualCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [timer, setTimer] = useState(300);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => (prev <= 0 ? 300 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    if (interactive) {
      setIsFlipped(!isFlipped);
    }
  };

  let bgClass = "bg-[#d92635]"; 
  let ribbonColor = "rgba(0,0,0,0.08)";
  let logoColor = "bg-white";
  let textColor = "text-white";
  let logoType = "VISA Signature";
  let showFifaBanner = false;
  let showRecycle = false;
  let showNuevaOferta = false;
  let bankOfAmericaTextColor = "text-white";

  if (type === 'customized-cash' || type === 'standard') {
    bgClass = "bg-gradient-to-br from-[#c71f2c] to-[#a31520]";
    ribbonColor = "rgba(255,255,255,0.07)";
    logoType = "VISA Signature";
    showFifaBanner = true;
  } else if (type === 'unlimited-cash') {
    bgClass = "bg-gradient-to-br from-[#d1d5db] to-[#9ca3af]";
    ribbonColor = "rgba(255,255,255,0.4)";
    logoColor = "bg-[#475569]";
    bankOfAmericaTextColor = "text-[#475569]";
    logoType = "VISA Signature";
    showFifaBanner = true;
  } else if (type === 'travel-rewards' || type === 'disposable') {
    bgClass = "bg-gradient-to-br from-[#0f2442] to-[#0a182e]";
    ribbonColor = "rgba(255,255,255,0.05)";
    logoType = "VISA Signature";
    showRecycle = true;
  } else if (type === 'bankamericard') {
    bgClass = "bg-gradient-to-br from-[#ffffff] to-[#f8f9fa]";
    ribbonColor = "rgba(0,0,0,0.05)";
    logoColor = "bg-[#94a3b8]";
    bankOfAmericaTextColor = "text-[#64748b]";
    logoType = "mastercard";
    showRecycle = true;
    showNuevaOferta = true;
  } else if (type === 'custom') {
    bgClass = ""; // Usaremos style inline
    ribbonColor = "rgba(255,255,255,0.1)";
    logoType = "VISA Signature";
  }

  const cardStyle = type === 'custom' && customColor 
    ? { background: `linear-gradient(135deg, ${customColor} 0%, #1a1a1a 100%)` } 
    : {};

  const formattedCardNumber = cardNumber.padEnd(16, '•').match(/.{1,4}/g)?.join(' ') || cardNumber;

  return (
    <div className={cn("group perspective-1000 w-full max-w-[320px] aspect-[1.586/1] mx-auto", className)}>
      <div 
        className={cn(
          "relative w-full h-full transition-all duration-700 preserve-3d",
          interactive && "cursor-pointer",
          isFlipped && "rotate-y-180"
        )}
        onClick={handleClick}
      >
        {/* Front */}
        <div 
          className={cn(
            "absolute inset-0 backface-hidden rounded-xl overflow-hidden shadow-xl border border-black/10 flex flex-col",
            bgClass,
            isFrozen && "grayscale opacity-80"
          )}
          style={cardStyle}
        >
          
          {/* Background Ribbons */}
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[100%] bg-white transform -rotate-12" style={{ backgroundColor: ribbonColor }}></div>
             <div className="absolute top-[20%] left-[-20%] w-[150%] h-[60%] bg-white transform rotate-45" style={{ backgroundColor: ribbonColor }}></div>
             <div className="absolute top-[60%] left-[-20%] w-[150%] h-[80%] bg-white transform -rotate-45" style={{ backgroundColor: ribbonColor }}></div>
          </div>

          {/* Top Left NUEVA OFERTA Banner */}
          {showNuevaOferta && (
            <div className="absolute top-0 left-0 bg-[#1b365d] text-white font-bold text-[9px] px-3 py-1 z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}>
              NUEVA OFERTA
            </div>
          )}

          <div className="relative z-10 p-4 flex flex-col h-full">
            
            {/* Top Row: Contactless */}
            <div className="flex justify-end w-full mb-1">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("w-4 h-4", type === 'bankamericard' || type === 'unlimited-cash' ? "text-[#64748b]" : "text-white opacity-80")}><path d="M8.5 4c2.3 3.1 2.3 8.9 0 12"/><path d="M12.5 3c3.4 4.3 3.4 11.7 0 16"/><path d="M16.5 2c4.7 5.4 4.7 14.6 0 20"/></svg>
            </div>

            {/* Center Area */}
            {variant === 'fifa' ? (
              <div className="flex items-center gap-2 mt-0 relative z-20">
                 {/* EMV Chip */}
                 <div className="w-8 h-6 bg-gradient-to-br from-[#f1f5f9] to-[#cbd5e1] rounded-sm opacity-90 border border-black/20 flex items-center justify-center overflow-hidden shadow-sm relative shrink-0">
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[1px]">
                       {[...Array(9)].map((_, i) => <div key={i} className="border border-black/20" />)}
                    </div>
                    <div className="absolute w-2 h-3 border border-black/20 rounded-full"></div>
                 </div>
                 <div className="flex items-center gap-1">
                    <span className={cn("font-sans font-bold uppercase text-[5px] tracking-widest", bankOfAmericaTextColor)}>
                      Bank of America
                    </span>
                    <div className="flex gap-[2px] items-center">
                      <div className="flex gap-[1px]">
                        <div className={`w-[2px] h-[6px] ${logoColor} transform skew-x-[20deg]`} />
                        <div className={`w-[2px] h-[8px] ${logoColor} transform skew-x-[20deg] -translate-y-[1px]`} />
                        <div className={`w-[2px] h-[10px] ${logoColor} transform skew-x-[20deg] -translate-y-[2px]`} />
                      </div>
                      <div className="flex gap-[1px]">
                        <div className={`w-[2px] h-[10px] ${logoColor} transform skew-x-[20deg] -translate-y-[2px]`} />
                        <div className={`w-[2px] h-[8px] ${logoColor} transform skew-x-[20deg] -translate-y-[1px]`} />
                        <div className={`w-[2px] h-[6px] ${logoColor} transform skew-x-[20deg]`} />
                      </div>
                    </div>
                 </div>
              </div>
            ) : (
              <div className="flex flex-col flex-grow relative z-20">
                <div className="flex items-center justify-center gap-4 mt-2">
                   {/* EMV Chip */}
                   <div className="w-8 h-6 bg-gradient-to-br from-[#f1f5f9] to-[#cbd5e1] rounded-sm opacity-90 border border-black/20 flex items-center justify-center overflow-hidden shadow-sm relative shrink-0">
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[1px]">
                         {[...Array(9)].map((_, i) => <div key={i} className="border border-black/20" />)}
                      </div>
                      <div className="absolute w-2 h-3 border border-black/20 rounded-full"></div>
                   </div>

                   {/* Huge BofA Logo */}
                   <div className="flex gap-1.5 items-center ml-2 opacity-90">
                      <div className="flex gap-[2px]">
                        <div className={`w-[3px] h-4 ${logoColor} transform -skew-x-[20deg]`} />
                        <div className={`w-[3px] h-6 ${logoColor} transform -skew-x-[20deg] -translate-y-1`} />
                        <div className={`w-[3px] h-8 ${logoColor} transform -skew-x-[20deg] -translate-y-2`} />
                      </div>
                      <div className="flex gap-[2px]">
                        <div className={`w-[3px] h-8 ${logoColor} transform -skew-x-[20deg] -translate-y-2`} />
                        <div className={`w-[3px] h-6 ${logoColor} transform -skew-x-[20deg] -translate-y-1`} />
                        <div className={`w-[3px] h-4 ${logoColor} transform -skew-x-[20deg]`} />
                      </div>
                   </div>
                </div>

                {/* Bank of America Text */}
                <div className="flex justify-center mt-2">
                   <span className={cn("font-sans font-bold uppercase text-[9px] tracking-widest", bankOfAmericaTextColor)}>
                     Bank of America
                   </span>
                </div>
              </div>
            )}

            {/* FIFA Variant Trophy Center OR Custom Logo */}
            {(variant === 'fifa' || (type === 'custom' && customLogo)) && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="w-[150px] h-[150px] bg-gradient-radial from-white/40 to-transparent rounded-full blur-xl absolute opacity-70 mix-blend-overlay"></div>
                <div className="absolute w-[180px] h-[180px] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.2)_10deg,transparent_20deg,rgba(255,255,255,0.2)_30deg,transparent_40deg,rgba(255,255,255,0.2)_50deg,transparent_60deg,rgba(255,255,255,0.2)_70deg,transparent_80deg,rgba(255,255,255,0.2)_90deg,transparent_100deg,rgba(255,255,255,0.2)_110deg,transparent_120deg,rgba(255,255,255,0.2)_130deg,transparent_140deg,rgba(255,255,255,0.2)_150deg,transparent_160deg,rgba(255,255,255,0.2)_170deg,transparent_180deg,rgba(255,255,255,0.2)_190deg,transparent_200deg,rgba(255,255,255,0.2)_210deg,transparent_220deg,rgba(255,255,255,0.2)_230deg,transparent_240deg,rgba(255,255,255,0.2)_250deg,transparent_260deg,rgba(255,255,255,0.2)_270deg,transparent_280deg,rgba(255,255,255,0.2)_290deg,transparent_300deg,rgba(255,255,255,0.2)_310deg,transparent_320deg,rgba(255,255,255,0.2)_330deg,transparent_340deg,rgba(255,255,255,0.2)_350deg,transparent_360deg)] opacity-30 mix-blend-overlay animate-spin-slow"></div>
                {variant === 'fifa' ? (
                  <img 
                    src="https://assets.football-logos.cc/logos/tournaments/700x700/fifa-world-cup-2026--white.9ba8a004.png" 
                    alt="FIFA World Cup 2026" 
                    className="h-24 w-auto z-10 drop-shadow-2xl opacity-90"
                    style={{ filter: 'drop-shadow(0px 8px 10px rgba(0,0,0,0.4)) sepia(1) saturate(5) hue-rotate(15deg) brightness(1.2)' }}
                  />
                ) : (
                  <img 
                    src={customLogo} 
                    alt="Custom Logo" 
                    className="h-24 w-auto z-10 drop-shadow-2xl object-contain opacity-90"
                  />
                )}
              </div>
            )}

            {/* Bottom Area (Numbers & Logos) */}
            <div className="mt-auto flex flex-col justify-end w-full relative z-20">
               {/* Numbers on front if enabled */}
               {showNumbersOnFront && (
                 <div className="mb-1">
                   <div className={cn("font-mono text-[13px] sm:text-[15px] tracking-widest drop-shadow-md", bankOfAmericaTextColor)}>
                     {formattedCardNumber}
                   </div>
                   <div className="flex justify-between items-center mt-0.5 pr-8">
                     <div className={cn("flex items-center gap-2", bankOfAmericaTextColor)}>
                       <span className="text-[5px] uppercase tracking-tighter leading-none opacity-80">VALID<br/>THRU</span>
                       <span className="font-mono text-[10px]">{expiryDate}</span>
                     </div>
                     <span className={cn("font-sans text-[8px] uppercase tracking-wide truncate max-w-[120px]", bankOfAmericaTextColor)}>
                       {cardHolder}
                     </span>
                   </div>
                 </div>
               )}
               
               <div className="flex justify-between items-end w-full">
                 {/* Bottom Left Icons */}
                 <div className="flex-1 pb-1">
                   {showRecycle && (
                      <Recycle size={14} className={cn(type === 'bankamericard' ? "text-[#64748b]" : "text-white opacity-90")} />
                   )}
                 </div>
                 
                 {/* Bottom Right Network Logo */}
                 <div className="flex flex-col items-end pb-1">
                    {logoType === 'mastercard' ? (
                       <div className="flex items-center">
                         <div className="w-8 h-8 rounded-full bg-[#eb001b] opacity-90 -mr-3 relative z-10 mix-blend-multiply"></div>
                         <div className="w-8 h-8 rounded-full bg-[#f79e1b] opacity-90 relative z-0 mix-blend-multiply"></div>
                       </div>
                    ) : (
                       <div className={cn("flex flex-col items-end", textColor)}>
                          <div className="font-bold italic tracking-tighter drop-shadow-sm text-2xl leading-none">VISA</div>
                          <span className="text-[8px] italic font-serif tracking-widest mt-0.5">Signature</span>
                       </div>
                    )}
                 </div>
               </div>
            </div>

            {/* FIFA Banner overlay for Red & Silver (Only in Standard Variant if not showing numbers front, to match login page) */}
            {showFifaBanner && variant === 'standard' && !showNumbersOnFront && (
              <>
                <div className="absolute bottom-0 left-[20%] right-0 h-[45px] bg-[#1e2f5b] z-20" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)' }}>
                  <div className="flex h-full items-center pl-6 text-white">
                     <div className="flex flex-col leading-[1.1]">
                        <span className="text-[10px] font-bold">Nuevo diseño de tarjeta</span>
                        <span className="text-[10px] font-bold">ahora disponible</span>
                     </div>
                  </div>
                </div>
                <div className="absolute bottom-1 left-2 w-12 h-14 z-30 flex items-end">
                  <img 
                    src={type === 'unlimited-cash' 
                      ? "https://assets.football-logos.cc/logos/tournaments/700x700/fifa-world-cup-2026--white.9ba8a004.png"
                      : "https://assets.football-logos.cc/logos/tournaments/700x700/fifa-world-cup-2026--white.9ba8a004.png"} 
                    alt="FIFA World Cup 2026" 
                    className={cn("w-full object-contain drop-shadow-lg", type === 'unlimited-cash' ? 'invert opacity-80' : 'opacity-100')}
                  />
                </div>
              </>
            )}

          </div>
        </div>

        {/* Back (contains the numbers now) */}
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180 rounded-xl p-5 bg-[#e2e8f0] text-[#1e293b] flex flex-col justify-between overflow-hidden shadow-lg border border-[#cbd5e1]",
          isFrozen && "grayscale opacity-80"
        )}>
          <div className="w-[120%] h-10 bg-[#1e293b] -mx-5 mt-2 shadow-sm" />
          
          <div className="flex flex-col gap-2 mt-2 flex-grow">
            <div className="font-mono text-[15px] font-bold tracking-widest text-slate-900 text-center border-b border-[#cbd5e1] pb-2">
               {formattedCardNumber}
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-700">
               <span>EXP: {expiryDate}</span>
               <span className="truncate max-w-[120px] text-right">{cardHolder}</span>
            </div>

            <div className="bg-white border border-[#cbd5e1] rounded p-2 flex justify-between items-center shadow-inner mt-1">
              <span className="text-[9px] opacity-70 font-semibold">DYNAMIC CVV</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold tracking-widest text-slate-900">{cvv}</span>
                {interactive && (
                   <div className="text-[9px] text-[#E31837] flex items-center gap-1 font-semibold">
                     <Zap size={10} />
                     <span>{formatTime(timer)}</span>
                   </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-2">
             <span className="text-[7px] font-sans font-bold text-[#94a3b8]">BANK OF AMERICA SECURITY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
