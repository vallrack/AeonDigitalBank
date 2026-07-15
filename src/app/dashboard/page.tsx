
"use client"

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BalanceWidget } from '@/components/banking/balance-widget';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useI18n } from '@/lib/i18n/context';
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
  const { t, language } = useI18n();
  const db = useFirestore();

  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  
  const allTransactionsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [db, user]);

  const { data: userData, loading: profileLoading } = useDoc(userRef);
  const { data: allTransactions, loading: txLoading } = useCollection(allTransactionsQuery);

  const recentTransactions = allTransactions.slice(0, 5);

  const totals = useMemo(() => {
    return allTransactions.reduce((acc, tx) => {
      const amount = Number(tx.amount || 0);
      if (tx.type === 'income') acc.income += amount;
      else if (tx.type === 'expense') acc.expenses += amount;
      return acc;
    }, { income: 0, expenses: 0 });
  }, [allTransactions]);

  const checkingBalance = useMemo(() => {
    return Number(userData?.checkingBalance ?? userData?.balance ?? 0);
  }, [userData]);

  const savingsBalance = useMemo(() => {
    return Number(userData?.savingsBalance ?? 0);
  }, [userData]);

  const activityData = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dataMap: Record<string, { day: string, income: number, expense: number, order: number }> = {};
    
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayLabel = days[d.getDay()];
      dataMap[dayLabel] = { day: dayLabel, income: 0, expense: 0, order: 6 - i };
    }

    allTransactions.forEach(tx => {
      const txDate = new Date(tx.date);
      const dayLabel = days[txDate.getDay()];
      if (dataMap[dayLabel]) {
        if (tx.type === 'income') dataMap[dayLabel].income += Number(tx.amount);
        else dataMap[dayLabel].expense += Number(tx.amount);
      }
    });

    return Object.values(dataMap).sort((a, b) => a.order - b.order);
  }, [allTransactions]);

  if (userLoading || profileLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64 bg-muted" />
            <Skeleton className="h-4 w-48 bg-muted" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 bg-muted" />
            <Skeleton className="h-9 w-32 bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl bg-muted" />
          <Skeleton className="h-64 rounded-xl bg-muted md:col-span-2" />
        </div>
        <Skeleton className="h-96 rounded-xl bg-muted w-full" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">{t.common.welcome}, {userData?.fullName?.split(' ')[0] || 'User'}</h1>
          <p className="text-muted-foreground">{t.dashboard.status}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} />
            {t.dashboard.export}
          </Button>
          <Button size="sm" className="gap-2 glow-indigo" asChild>
            <Link href="/dashboard/transfers">
              <Plus size={14} />
              {t.dashboard.new_transfer}
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="flex flex-col gap-4">
          <BalanceWidget 
            title="Cheques"
            accountNumber="...8234"
            balance={checkingBalance} 
            income={totals.income}
            expenses={totals.expenses}
          />
          <BalanceWidget 
            title="Ahorros"
            accountNumber="...9102"
            balance={savingsBalance} 
          />
        </div>
        
        <Card className="md:col-span-2 xl:col-span-3 glass border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-headline font-medium">{t.dashboard.weekly_activity}</CardTitle>
              <CardDescription className="text-xs">{t.dashboard.weekly_desc}</CardDescription>
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
                  tick={{ fill: '#888', fontSize: 10 }}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0E1016', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="income" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} barSize={10} />
                <Bar dataKey="expense" fill="hsl(var(--accent))" radius={[2, 2, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6">
        <Card className="glass border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-headline font-bold">{t.dashboard.recent_tx}</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-accent font-medium gap-1" asChild>
              <Link href="/dashboard/activity">
                {t.dashboard.view_all} <ChevronRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-32 bg-muted" />
                      <Skeleton className="h-3 w-20 bg-muted" />
                    </div>
                    <Skeleton className="h-6 w-16 bg-muted rounded-full" />
                    <Skeleton className="h-5 w-24 bg-muted" />
                  </div>
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">{t.dashboard.no_tx}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[500px]">
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-xs uppercase tracking-wider font-semibold">{t.dashboard.concept_recipient}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold">{t.dashboard.category}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">{t.dashboard.amount}</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold">{t.dashboard.status_col}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx: any) => (
                      <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">{tx.merchant}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[9px] font-normal py-0">
                            {tx.category}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-headline font-semibold",
                          tx.type === 'expense' ? "text-rose-400" : "text-emerald-400"
                        )}>
                          <PrivacyMask>
                            {tx.type === 'expense' ? '-' : '+'}${ (Number(Math.abs(tx.amount)) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
                          </PrivacyMask>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              tx.status === 'Completed' ? "bg-emerald-400" : "bg-amber-400"
                            )} />
                            <span className="text-[10px] uppercase font-bold">
                              {tx.status === 'Completed' ? (language === 'es' ? 'Completada' : 'Completed') : (language === 'es' ? 'Pendiente' : 'Pending')}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
