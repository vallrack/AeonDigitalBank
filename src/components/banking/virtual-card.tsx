"use client"

import React, { useState, useEffect } from 'react';
import { CreditCard, Shield, Zap, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface VirtualCardProps {
  cardHolder: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  isFrozen?: boolean;
  type?: 'disposable' | 'standard';
}

export function VirtualCard({ 
  cardHolder, 
  cardNumber, 
  expiryDate, 
  cvv, 
  isFrozen = false,
  type = 'standard'
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

  return (
    <div className="group perspective-1000 w-full max-w-sm h-56">
      <div 
        className={cn(
          "relative w-full h-full transition-all duration-700 preserve-3d cursor-pointer text-white",
          isFlipped && "rotate-y-180"
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front */}
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col justify-between overflow-hidden shadow-xl",
          type === 'disposable' 
            ? "bg-gradient-to-br from-[#012169] to-[#001440]" 
            : "bg-gradient-to-br from-[#E31837] to-[#8A0015]",
          isFrozen && "grayscale opacity-80"
        )}>
          {/* Wave Pattern Background */}
          <div className="absolute top-0 right-0 w-[150%] h-[150%] -translate-y-[40%] translate-x-[20%] rotate-12 opacity-10 pointer-events-none">
            <div className="w-full h-16 bg-white rounded-full blur-xl absolute top-0" />
            <div className="w-full h-24 bg-white rounded-full blur-2xl absolute top-32" />
            <div className="w-full h-32 bg-white rounded-full blur-3xl absolute top-64" />
          </div>
          
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col gap-3">
              {/* Fake EMV Chip */}
              <div className="w-10 h-8 bg-gradient-to-br from-[#d4af37] to-[#aa7c11] rounded-md opacity-90 border border-yellow-800/30 flex items-center justify-center overflow-hidden">
                <div className="w-full h-full border border-yellow-800/20 grid grid-cols-3 grid-rows-3 gap-[1px]">
                  {[...Array(9)].map((_, i) => <div key={i} className="bg-yellow-800/10" />)}
                </div>
              </div>
              
              {/* BofA Style Logo */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 mb-1 opacity-90">
                  <div className="flex flex-col gap-[2px]">
                    <div className="flex gap-[2px]">
                      <div className="w-3 h-[2px] bg-white -skew-x-12" />
                      <div className="w-3 h-[2px] bg-white -skew-x-12" />
                      <div className="w-3 h-[2px] bg-white -skew-x-12" />
                    </div>
                    <div className="flex gap-[2px]">
                      <div className="w-3 h-[2px] bg-white -skew-x-12" />
                      <div className="w-3 h-[2px] bg-white -skew-x-12" />
                      <div className="w-3 h-[2px] bg-white -skew-x-12" />
                    </div>
                  </div>
                </div>
                <span className="font-headline font-bold uppercase text-[10px] tracking-tight leading-none">Bank of Americans</span>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] font-headline tracking-widest opacity-70">
                {type === 'disposable' ? 'TRAVEL REWARDS' : 'CASH REWARDS'}
              </span>
              <Shield size={20} className="text-white opacity-50 mt-2" />
            </div>
          </div>

          <div className="z-10 mt-auto">
            <div className="font-code text-xl tracking-[0.2em] mb-2 drop-shadow-md">
              {cardNumber.match(/.{1,4}/g)?.join(' ')}
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="font-headline text-sm uppercase drop-shadow-sm">{cardHolder}</span>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex gap-2 items-center">
                  <span className="text-[8px] opacity-70 uppercase tracking-tighter leading-none">VALID<br/>THRU</span>
                  <span className="font-code text-sm">{expiryDate}</span>
                </div>
                {/* Fake Visa Logo */}
                <div className="text-xl font-bold italic tracking-tighter drop-shadow-sm">VISA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-6 bg-slate-100 text-slate-800 flex flex-col justify-between overflow-hidden shadow-xl border border-slate-300",
          isFrozen && "grayscale opacity-80"
        )}>
          <div className="w-[120%] h-10 bg-slate-800 -mx-6 mt-2" />
          
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-slate-300 rounded p-2 flex justify-between items-center shadow-inner">
              <span className="text-[10px] opacity-70 font-semibold">DYNAMIC CVV</span>
              <div className="flex items-center gap-2">
                <span className="font-code text-lg font-bold tracking-widest text-slate-900">{cvv}</span>
                <div className="text-[10px] text-red-600 flex items-center gap-1 font-semibold">
                  <Zap size={10} />
                  <span>{formatTime(timer)}</span>
                </div>
              </div>
            </div>
            <p className="text-[7px] opacity-60 leading-tight">
              Authorized Signature - Not Valid Unless Signed. This card is issued by Bank of Americans pursuant to a license from Visa U.S.A. Inc. Use of this card is subject to the terms and conditions of the cardholder agreement.
            </p>
          </div>

          <div className="flex justify-center">
             <span className="text-[10px] font-headline font-bold text-slate-400">BANK OF AMERICANS SECURITY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
