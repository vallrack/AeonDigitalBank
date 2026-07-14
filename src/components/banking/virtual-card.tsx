"use client"

import React, { useState, useEffect } from 'react';
import { Shield, Zap, Recycle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CardStyleType = 'customized-cash' | 'unlimited-cash' | 'travel-rewards' | 'bankamericard' | 'disposable' | 'standard';

interface VirtualCardProps {
  cardHolder: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  isFrozen?: boolean;
  type?: CardStyleType;
  className?: string;
  interactive?: boolean;
}

export function VirtualCard({ 
  cardHolder, 
  cardNumber, 
  expiryDate, 
  cvv, 
  isFrozen = false,
  type = 'customized-cash',
  className,
  interactive = true
}: VirtualCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes

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

  // Determine card styles based on type
  let bgClass = "bg-[#d92635]"; // Default solid red
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
  }

  // Format card number
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
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-xl overflow-hidden shadow-xl border border-black/10",
          bgClass,
          isFrozen && "grayscale opacity-80"
        )}>
          
          {/* Background Ribbons */}
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[100%] bg-white transform -rotate-12" style={{ backgroundColor: ribbonColor }}></div>
             <div className="absolute top-[20%] left-[-20%] w-[150%] h-[60%] bg-white transform rotate-45" style={{ backgroundColor: ribbonColor }}></div>
             <div className="absolute top-[60%] left-[-20%] w-[150%] h-[80%] bg-white transform -rotate-45" style={{ backgroundColor: ribbonColor }}></div>
          </div>

          {/* Top Left NUEVA OFERTA Banner (White Card) */}
          {showNuevaOferta && (
            <div className="absolute top-0 left-0 bg-[#1b365d] text-white font-bold text-[10px] px-3 py-1 z-20" style={{ clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)' }}>
              NUEVA OFERTA
            </div>
          )}

          <div className="absolute inset-0 p-4 flex flex-col z-10">
            
            {/* Top Row: Contactless */}
            <div className="flex justify-end w-full mb-2">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={cn("w-5 h-5", type === 'bankamericard' || type === 'unlimited-cash' ? "text-[#64748b]" : "text-white opacity-80")}><path d="M8.5 4c2.3 3.1 2.3 8.9 0 12"/><path d="M12.5 3c3.4 4.3 3.4 11.7 0 16"/><path d="M16.5 2c4.7 5.4 4.7 14.6 0 20"/></svg>
            </div>

            {/* Center Area: Chip + Huge Logo */}
            <div className="flex items-center justify-center gap-4 mt-2">
               {/* EMV Chip */}
               <div className="w-9 h-7 bg-gradient-to-br from-[#f1f5f9] to-[#cbd5e1] rounded-sm opacity-90 border border-black/20 flex items-center justify-center overflow-hidden shadow-sm relative shrink-0">
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-[1px]">
                     {[...Array(9)].map((_, i) => <div key={i} className="border border-black/20" />)}
                  </div>
                  <div className="absolute w-3 h-4 border border-black/20 rounded-full"></div>
               </div>

               {/* Huge BofA Logo */}
               <div className="flex flex-col gap-[3px] ml-2">
                  <div className="flex gap-[3px]">
                     <div className={`w-6 h-[4px] ${logoColor} -skew-x-12`} />
                     <div className={`w-6 h-[4px] ${logoColor} -skew-x-12`} />
                     <div className={`w-6 h-[4px] ${logoColor} -skew-x-12`} />
                  </div>
                  <div className="flex gap-[3px]">
                     <div className={`w-6 h-[4px] ${logoColor} -skew-x-12`} />
                     <div className={`w-6 h-[4px] ${logoColor} -skew-x-12`} />
                     <div className={`w-6 h-[4px] ${logoColor} -skew-x-12`} />
                  </div>
               </div>
            </div>

            {/* Bank of America Text */}
            <div className="flex justify-center mt-3">
               <span className={cn("font-sans font-bold uppercase text-[10px] tracking-[0.1em]", bankOfAmericaTextColor)}>
                 Bank of America
               </span>
            </div>

            {/* Bottom Row */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
               
               {/* Bottom Left Icons */}
               <div className="flex-1">
                 {showRecycle && (
                    <Recycle size={18} className={cn("mb-1", type === 'bankamericard' ? "text-[#64748b]" : "text-white opacity-90")} />
                 )}
               </div>
               
               {/* Bottom Right Network Logo */}
               <div className="flex flex-col items-end">
                  {logoType === 'mastercard' ? (
                     <div className="flex items-center">
                       <div className="w-9 h-9 rounded-full bg-[#eb001b] opacity-90 -mr-4 relative z-10 mix-blend-multiply"></div>
                       <div className="w-9 h-9 rounded-full bg-[#f79e1b] opacity-90 relative z-0 mix-blend-multiply"></div>
                     </div>
                  ) : (
                     <div className="flex flex-col items-end text-white">
                        <div className="font-bold italic tracking-tighter drop-shadow-sm text-3xl leading-none">VISA</div>
                        <span className="text-[10px] italic font-serif tracking-widest mt-0.5">Signature</span>
                     </div>
                  )}
               </div>
            </div>

            {/* FIFA Banner overlay for Red & Silver */}
            {showFifaBanner && (
              <>
                <div className="absolute bottom-0 left-[22%] right-0 h-[50px] bg-[#233563] z-20" style={{ clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)' }}>
                  <div className="flex h-full items-center pl-8 text-white">
                     <div className="flex flex-col leading-none">
                        <span className="text-[11px] font-bold">Nuevo diseño de tarjeta</span>
                        <span className="text-[11px] font-bold">ahora disponible</span>
                     </div>
                  </div>
                </div>
                <div className="absolute bottom-1 left-2 w-14 h-16 z-30 flex items-end">
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
            {/* Card Number on back */}
            <div className="font-mono text-lg font-bold tracking-widest text-slate-900 text-center border-b border-[#cbd5e1] pb-2">
               {formattedCardNumber}
            </div>
            
            <div className="flex justify-between items-center text-xs font-mono font-bold text-slate-700">
               <span>EXP: {expiryDate}</span>
               <span>{cardHolder}</span>
            </div>

            <div className="bg-white border border-[#cbd5e1] rounded p-2 flex justify-between items-center shadow-inner mt-1">
              <span className="text-[10px] opacity-70 font-semibold">DYNAMIC CVV</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold tracking-widest text-slate-900">{cvv}</span>
                {interactive && (
                   <div className="text-[10px] text-[#E31837] flex items-center gap-1 font-semibold">
                     <Zap size={12} />
                     <span>{formatTime(timer)}</span>
                   </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-2">
             <span className="text-[8px] font-sans font-bold text-[#94a3b8]">BANK OF AMERICA SECURITY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
