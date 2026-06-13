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
          "relative w-full h-full transition-all duration-700 preserve-3d cursor-pointer",
          isFlipped && "rotate-y-180"
        )}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front */}
        <div className={cn(
          "absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col justify-between overflow-hidden",
          type === 'disposable' ? "bg-gradient-to-br from-cyan-900 to-indigo-900" : "bg-gradient-to-br from-indigo-600 to-indigo-900",
          isFrozen && "grayscale opacity-80"
        )}>
          <div className="absolute top-0 right-0 p-8 opacity-10">
             <CreditCard size={120} />
          </div>
          
          <div className="flex justify-between items-start z-10">
            <div className="flex flex-col">
              <span className="text-xs font-headline tracking-widest opacity-70">AEON PLATINUM</span>
              {type === 'disposable' && (
                <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full w-fit mt-1">DISPOSABLE</span>
              )}
            </div>
            <Shield size={24} className="text-accent" />
          </div>

          <div className="z-10">
            <div className="font-code text-xl tracking-[0.2em] mb-4">
              {cardNumber.match(/.{1,4}/g)?.join(' ')}
            </div>
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] opacity-70 uppercase tracking-tighter">Card Holder</span>
                <span className="font-headline text-sm uppercase">{cardHolder}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] opacity-70 uppercase tracking-tighter">Expires</span>
                <span className="font-headline text-sm">{expiryDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className={cn(
          "absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-6 bg-slate-900 flex flex-col justify-between overflow-hidden",
          isFrozen && "grayscale opacity-80"
        )}>
          <div className="w-full h-10 bg-black -mx-6 mt-2" />
          
          <div className="flex flex-col gap-4">
            <div className="bg-slate-800 rounded p-2 flex justify-between items-center">
              <span className="text-[10px] opacity-70">DYNAMIC CVV</span>
              <div className="flex items-center gap-2">
                <span className="font-code text-lg font-bold tracking-widest text-accent">{cvv}</span>
                <div className="text-[10px] text-accent flex items-center gap-1">
                  <Zap size={10} />
                  <span>{formatTime(timer)}</span>
                </div>
              </div>
            </div>
            <p className="text-[8px] opacity-40 leading-tight">
              Authorized Signature - Not Valid Unless Signed. This card is issued by Aeon Digital Bank and is subject to the terms and conditions of use.
            </p>
          </div>

          <div className="flex justify-center">
             <span className="text-xs font-headline opacity-30">AEON BANK SECURITY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
