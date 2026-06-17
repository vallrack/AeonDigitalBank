
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrivacyMask } from '@/components/incognito-context';
import { useI18n } from '@/lib/i18n/context';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface BalanceWidgetProps {
  balance?: number;
  income?: number;
  expenses?: number;
}

export function BalanceWidget({ 
  balance = 0, 
  income = 0, 
  expenses = 0 
}: BalanceWidgetProps) {
  const { t } = useI18n();

  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const balanceString = formatCurrency(balance);
  const fontSize = balanceString.length > 12 ? "text-2xl" : balanceString.length > 9 ? "text-3xl" : "text-4xl";

  return (
    <Card className="glass overflow-hidden relative border-primary/10 h-full flex flex-col">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-tighter">
          <Wallet size={14} className="text-primary" />
          {t.dashboard.total_balance}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="flex flex-col gap-1 py-2">
          <div className={`font-headline font-bold flex items-baseline gap-1 tracking-tighter ${fontSize} transition-all duration-300`}>
            <span className="text-accent opacity-80">$</span>
            <PrivacyMask>
              {balanceString}
            </PrivacyMask>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-emerald-400 flex items-center gap-0.5 font-bold uppercase tracking-widest">
              <TrendingUp size={10} />
              Live
            </span>
            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="text-muted-foreground font-medium">AEON Digital Network</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1 mb-1">
              <ArrowDownRight size={10} className="text-emerald-400" />
              {t.dashboard.income}
            </div>
            <div className="text-sm font-headline font-bold text-emerald-400 truncate">
              <PrivacyMask>${formatCurrency(income)}</PrivacyMask>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-white/5 pl-4">
            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest flex items-center gap-1 mb-1">
              <ArrowUpRight size={10} className="text-rose-400" />
              {t.dashboard.expenses}
            </div>
            <div className="text-sm font-headline font-bold text-rose-400 truncate">
              <PrivacyMask>${formatCurrency(expenses)}</PrivacyMask>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
