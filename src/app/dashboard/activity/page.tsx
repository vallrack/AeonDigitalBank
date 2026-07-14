
"use client"

import React, { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Loader2, CreditCard } from 'lucide-react';
import { PrivacyMask } from '@/components/incognito-context';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

export default function ActivityPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { t, language } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');

  const transactionsQuery = useMemo(() => {
    if (!user) return null;
    return query(
      collection(db, 'users', user.uid, 'transactions'),
      orderBy('date', 'desc')
    );
  }, [db, user]);

  const { data: transactions, loading } = useCollection<DocumentData>(transactionsQuery);

  const filteredTransactions = transactions.filter(tx => 
    tx.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">{t.activity.title}</h1>
          <p className="text-muted-foreground">{t.activity.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">{t.activity.total_volume}</CardDescription>
            <CardTitle className="text-2xl font-headline">${transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase tracking-wider font-bold">{t.activity.transactions_count}</CardDescription>
            <CardTitle className="text-2xl font-headline">{transactions.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-primary/5">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t.activity.search_ph} 
                className="pl-10 bg-muted/30 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={14} />
              {t.activity.adv_filters}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center p-20 text-muted-foreground">
              {t.activity.no_results}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[150px] text-[10px] uppercase font-bold">{t.activity.col_date}</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">{t.activity.col_entity}</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">{t.activity.col_category}</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">{t.activity.col_ref}</TableHead>
                    <TableHead className="text-right text-[10px] uppercase font-bold">{t.activity.col_amount}</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">{t.activity.col_status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30">
                      <TableCell className="text-[10px] text-muted-foreground">
                        <div className="flex flex-col">
                          <span>{new Date(tx.date).toLocaleDateString()}</span>
                          <span className="opacity-50">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            tx.type === 'expense' ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                          )}>
                            {tx.type === 'expense' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm">{tx.merchant}</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <CreditCard size={10} /> {t.activity.aeon_network}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal text-[10px] py-0">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[180px] truncate italic">
                        {tx.reference || t.activity.no_ref}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-headline font-semibold",
                        tx.type === 'expense' ? "text-rose-400" : "text-emerald-400"
                      )}>
                        <PrivacyMask>
                          {tx.type === 'expense' ? '-' : '+'}${Math.abs(tx.amount || 0).toFixed(2)}
                        </PrivacyMask>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            tx.status === 'Completed' ? "bg-emerald-400" : "bg-amber-400"
                          )} />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">
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
    </div>
  );
}
