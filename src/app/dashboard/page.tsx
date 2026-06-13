
"use client"

import React, { useMemo } from 'react';
import { BalanceWidget } from '@/components/banking/balance-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { PrivacyMask } from '@/components/incognito-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Plus, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc } from 'firebase/firestore';

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();

  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  
  // Obtenemos todas las transacciones para los cálculos del dashboard
  const allTransactionsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [db, user]);

  const { data: userData, loading: profileLoading } = useDoc(userRef);
  const { data: allTransactions, loading: txLoading } = useCollection(allTransactionsQuery);

  // Transacciones recientes para la tabla (las últimas 5)
  const recentTransactions = allTransactions.slice(0, 5);

  // Cálculo de totales reales
  const totals = useMemo(() => {
    return allTransactions.reduce((acc, tx) => {
      const amount = Math.abs(tx.amount || 0);
      if (tx.type === 'income') acc.income += amount;
      else if (tx.type === 'expense') acc.expenses += amount;
      return acc;
    }, { income: 0, expenses: 0 });
  }, [allTransactions]);

  // Procesamiento de datos para el gráfico (últimos 7 días o genérico si no hay suficientes)
  const activityData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const currentDay = new Date().getDay();
    
    // Inicializamos los últimos 7 días con 0
    const dataMap: Record<string, { day: string, income: number, expense: number, order: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = days[d.getDay()];
      dataMap[dayLabel] = { day: dayLabel, income: 0, expense: 0, order: 6 - i };
    }

    // Llenamos con datos reales si existen
    allTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const dayLabel = days[txDate.getDay()];
      if (dataMap[dayLabel]) {
        if (tx.type === 'income') dataMap[dayLabel].income += tx.amount;
        else dataMap[dayLabel].expense += tx.amount;
      }
    });

    return Object.values(dataMap).sort((a, b) => a.order - b.order);
  }, [allTransactions]);

  if (userLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Welcome back, {userData?.fullName?.split(' ')[0] || 'User'}</h1>
          <p className="text-muted-foreground">Here's what's happening with your accounts today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} />
            Export Statement
          </Button>
          <Button size="sm" className="gap-2 glow-indigo" asChild>
            <Link href="/dashboard/transfers">
              <Plus size={14} />
              New Transfer
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BalanceWidget 
          balance={userData?.balance || 0} 
          income={totals.income}
          expenses={totals.expenses}
        />
        
        <Card className="md:col-span-2 glass border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-headline font-medium">Weekly Financial Activity</CardTitle>
              <CardDescription className="text-xs">Income and expenses over the last 7 days.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#888', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0E1016', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="expense" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="glass border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-headline font-bold">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-accent font-medium gap-1" asChild>
              <Link href="/dashboard/activity">
                View All <ChevronRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">No transactions found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">Merchant / Recipient</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">Category</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Amount</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx: any) => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{tx.merchant}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-normal py-0">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-headline font-semibold",
                        tx.type === 'expense' ? "text-rose-400" : "text-emerald-400"
                      )}>
                        <PrivacyMask>
                          {tx.type === 'expense' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                        </PrivacyMask>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            tx.status === 'Completed' ? "bg-emerald-400" : "bg-amber-400"
                          )} />
                          <span className="text-xs">{tx.status}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
