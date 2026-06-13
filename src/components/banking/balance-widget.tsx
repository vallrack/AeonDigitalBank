
"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrivacyMask } from '@/components/incognito-context';
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
  return (
    <Card className="glass overflow-hidden relative border-primary/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Wallet size={16} className="text-primary" />
          Total Balance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-headline font-bold flex items-baseline gap-1">
            <span className="text-accent">$</span>
            <PrivacyMask className="text-4xl">{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</PrivacyMask>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
              <TrendingUp size={12} />
              Live
            </span>
            <span className="text-muted-foreground">Account Status: Active</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-border/50">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1">
              <ArrowDownRight size={10} className="text-emerald-400" />
              Total Income
            </div>
            <div className="text-lg font-headline font-semibold">
              <PrivacyMask>${income.toLocaleString()}</PrivacyMask>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest flex items-center gap-1 mb-1">
              <ArrowUpRight size={10} className="text-rose-400" />
              Total Expenses
            </div>
            <div className="text-lg font-headline font-semibold">
              <PrivacyMask>${expenses.toLocaleString()}</PrivacyMask>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
