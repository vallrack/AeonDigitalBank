"use client"

import React, { useState, useEffect } from 'react';
import { Shield, Zap } from 'lucide-react';
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
  let bgClass = "bg-gradient-to-br from-[#E31837] to-[#8A0015]"; // Red by default
  let textColor = "text-white";
  let logoColor = "bg-white";
  let logoType = "VISA";
  let logoClass = "font-bold italic tracking-tighter drop-shadow-sm text-xl";
  let showFlag = true;

  if (type === 'customized-cash' || type === 'standard') {
    bgClass = "bg-gradient-to-br from-[#d92635] to-[#a31a26]";
    textColor = "text-white";
    logoType = "VISA Signature";
  } else if (type === 'unlimited-cash') {
    bgClass = "bg-gradient-to-br from-[#e5e7eb] to-[#9ca3af]";
    textColor = "text-[#1e293b]";
    logoColor = "bg-[#1e293b]";
    logoType = "VISA Signature";
  } else if (type === 'travel-rewards' || type === 'disposable') {
    bgClass = "bg-gradient-to-br from-[#0f2d69] to-[#0a1f4a]";
    textColor = "text-white";
    logoType = "VISA Signature";
    showFlag = false;
  } else if (type === 'bankamericard') {
    bgClass = "bg-gradient-to-br from-[#ffffff] to-[#e2e8f0]";
    textColor = "text-[#1e293b]";
    logoColor = "bg-[#1e293b]";
    logoType = "mastercard";
    showFlag = false;
  }

  return (
    <div className={cn("group perspective-1000 w-full max-w-sm aspect-[1.586/1]", className)}>
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
          "absolute inset-0 backface-hidden rounded-xl p-5 flex flex-col justify-between overflow-hidden shadow-lg border border-black/10",
          bgClass,
          textColor,
          isFrozen && "grayscale opacity-80"
        )}>
          {/* Subtle Background Pattern */}
          <div className="absolute top-0 right-0 w-[150%] h-[150%] -translate-y-[20%] translate-x-[20%] rotate-12 opacity-10 pointer-events-none">
            <div className={`w-full h-16 ${logoColor} rounded-full blur-xl absolute top-0`} />
            <div className={`w-full h-24 ${logoColor} rounded-full blur-2xl absolute top-24`} />
          </div>
          
          <div className="flex justify-between items-start z-10 w-full relative">
            <div className="flex flex-col gap-2">
              {/* EMV Chip */}
              <div className="w-9 h-7 bg-gradient-to-br from-[#e8d595] to-[#c6a347] rounded-sm opacity-90 border border-black/10 flex items-center justify-center overflow-hidden shadow-sm">
                <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[1px]">
                  {[...Array(9)].map((_, i) => <div key={i} className="border border-black/5" />)}
                </div>
              </div>
              
              {/* BofA Logo Text */}
              <div className="flex flex-col mt-1">
                <div className="flex items-center gap-[2px] mb-1 opacity-90">
                  <div className="flex flex-col gap-[1px]">
                    <div className="flex gap-[1px]">
                       <div className={`w-2 h-[1.5px] ${logoColor} -skew-x-12`} />
                       <div className={`w-2 h-[1.5px] ${logoColor} -skew-x-12`} />
                       <div className={`w-2 h-[1.5px] ${logoColor} -skew-x-12`} />
                    </div>
                    <div className="flex gap-[1px]">
                       <div className={`w-2 h-[1.5px] ${logoColor} -skew-x-12`} />
                       <div className={`w-2 h-[1.5px] ${logoColor} -skew-x-12`} />
                       <div className={`w-2 h-[1.5px] ${logoColor} -skew-x-12`} />
                    </div>
                  </div>
                </div>
                <span className="font-sans font-bold uppercase text-[8px] tracking-tight leading-none">Bank of America</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
               {/* Contactless Icon */}
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 opacity-60"><path d="M8.5 4c2.3 3.1 2.3 8.9 0 12"/><path d="M12.5 3c3.4 4.3 3.4 11.7 0 16"/><path d="M16.5 2c4.7 5.4 4.7 14.6 0 20"/></svg>
            </div>
          </div>

          <div className="z-10 mt-auto">
            {/* Card details */}
            <div className="flex flex-col">
               <div className="font-mono text-base tracking-[0.15em] drop-shadow-sm mb-1 opacity-90">
                 {cardNumber.padEnd(16, '•').match(/.{1,4}/g)?.join(' ')}
               </div>
               
               <div className="flex justify-between items-end">
                 <div className="flex flex-col">
                   <div className="flex gap-2 items-center mb-1">
                     <span className="text-[6px] opacity-70 uppercase tracking-tighter leading-none">VALID<br/>THRU</span>
                     <span className="font-mono text-xs">{expiryDate}</span>
                   </div>
                   <span className="font-sans text-xs uppercase tracking-wide drop-shadow-sm truncate max-w-[150px]">{cardHolder}</span>
                 </div>
                 
                 <div className="flex flex-col items-end justify-end h-full">
                    {logoType === 'mastercard' ? (
                       <div className="flex mt-1">
                         <div className="w-6 h-6 rounded-full bg-[#eb001b] mix-blend-multiply opacity-90 -mr-2"></div>
                         <div className="w-6 h-6 rounded-full bg-[#f79e1b] mix-blend-multiply opacity-90"></div>
                       </div>
                    ) : (
                       <div className="flex flex-col items-end">
                          <div className={logoClass}>VISA</div>
                          {logoType === 'VISA Signature' && <span className="text-[7px] italic -mt-1 font-serif">Signature</span>}
                       </div>
                    )}
                 </div>
               </div>
            </div>
          </div>
          
          {/* Optional Flag */}
          {showFlag && (
             <div className="absolute bottom-4 right-16 w-8 h-10 bg-white/20 rounded flex items-center justify-center backdrop-blur-sm border border-white/20">
                <span className="text-[8px] opacity-80 text-center font-bold leading-tight">FIFA<br/>2026</span>
             </div>
          )}
        </div>

        {/* Back */}
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180 rounded-xl p-5 bg-[#e2e8f0] text-[#1e293b] flex flex-col justify-between overflow-hidden shadow-lg border border-[#cbd5e1]",
          isFrozen && "grayscale opacity-80"
        )}>
          <div className="w-[120%] h-10 bg-[#1e293b] -mx-5 mt-2" />
          
          <div className="flex flex-col gap-3">
            <div className="bg-white border border-[#cbd5e1] rounded p-2 flex justify-between items-center shadow-inner">
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
            <p className="text-[6px] opacity-60 leading-tight">
              Authorized Signature - Not Valid Unless Signed. This card is issued by Bank of America pursuant to a license from Visa U.S.A. Inc. Use of this card is subject to the terms and conditions of the cardholder agreement.
            </p>
          </div>

          <div className="flex justify-center">
             <span className="text-[8px] font-sans font-bold text-[#94a3b8]">BANK OF AMERICA SECURITY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
