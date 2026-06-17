
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
  // Formateador de moneda consistente (Formato: $5.000,00)
  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <Card className="glass overflow-hidden relative border-primary/10">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Wallet size={16} className="text-primary" />
          Balance Total
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <div className="text-3xl font-headline font-bold flex items-baseline gap-1">
            <span className="text-accent">$</span>
            <PrivacyMask className="text-4xl">
              {formatCurrency(balance)}
            </PrivacyMask>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-emerald-400 flex items-center gap-0.5 font-medium">
              <TrendingUp size={12} />
              En Vivo
            </span>
            <span className="text-muted-foreground">Estado: Activa</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-8 pt-6 border-t border-border/50">
          <div className="flex flex-col gap-1">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowDownRight size={10} className="text-emerald-400" />
              Ingresos Totales
            </div>
            <div className="text-base font-headline font-semibold text-emerald-400">
              <PrivacyMask>${formatCurrency(income)}</PrivacyMask>
            </div>
          </div>
          <div className="flex flex-col gap-1 border-l border-border/50 pl-4">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ArrowUpRight size={10} className="text-rose-400" />
              Gastos Totales
            </div>
            <div className="text-base font-headline font-semibold text-rose-400">
              <PrivacyMask>${formatCurrency(expenses)}</PrivacyMask>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
