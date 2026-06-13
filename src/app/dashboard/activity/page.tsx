"use client"

import React, { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, DocumentData } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { PrivacyMask } from '@/components/incognito-context';
import { cn } from '@/lib/utils';

export default function ActivityPage() {
  const { user } = useUser();
  const db = useFirestore();
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
    tx.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Transaction Activity</h1>
          <p className="text-muted-foreground">Full history of your financial movements.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Volume</CardDescription>
            <CardTitle className="text-2xl font-headline">${transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0).toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Transactions</CardDescription>
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
                placeholder="Search by merchant or category..." 
                className="pl-10 bg-muted/30 border-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={14} />
              Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center p-20 text-muted-foreground">
              No transactions found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-[150px]">Date</TableHead>
                  <TableHead>Merchant / Recipient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center",
                          tx.type === 'expense' ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {tx.type === 'expense' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        </div>
                        {tx.merchant}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {tx.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {tx.reference || '-'}
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
  );
}