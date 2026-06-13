"use client"

import React from 'react';
import { BalanceWidget } from '@/components/banking/balance-widget';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { PrivacyMask } from '@/components/incognito-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Plus, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const spendingData = [
  { name: 'Shopping', value: 450, color: '#4062FF' },
  { name: 'Food', value: 300, color: '#73CFFF' },
  { name: 'Rent', value: 1200, color: '#6366f1' },
  { name: 'Health', value: 200, color: '#a5f3fc' },
  { name: 'Others', value: 150, color: '#312e81' },
];

const activityData = [
  { day: 'Mon', income: 400, expense: 240 },
  { day: 'Tue', income: 300, expense: 139 },
  { day: 'Wed', income: 200, expense: 980 },
  { day: 'Thu', income: 278, expense: 390 },
  { day: 'Fri', income: 189, expense: 480 },
  { day: 'Sat', income: 239, expense: 380 },
  { day: 'Sun', income: 349, expense: 430 },
];

const recentTransactions = [
  { id: '1', merchant: 'Apple Store', date: '2023-11-20', amount: -999.00, category: 'Electronics', status: 'Completed' },
  { id: '2', merchant: 'Freelance Payout', date: '2023-11-19', amount: 2500.00, category: 'Income', status: 'Completed' },
  { id: '3', merchant: 'Starbucks', date: '2023-11-18', amount: -6.50, category: 'Food & Dining', status: 'Pending' },
  { id: '4', merchant: 'Netflix', date: '2023-11-15', amount: -15.99, category: 'Entertainment', status: 'Completed' },
  { id: '5', merchant: 'Rent payment', date: '2023-11-01', amount: -1200.00, category: 'Bills', status: 'Completed' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Welcome back, Adrian</h1>
          <p className="text-muted-foreground">Here's what's happening with your accounts today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} />
            Export Statement
          </Button>
          <Button size="sm" className="gap-2 glow-indigo">
            <Plus size={14} />
            New Transfer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BalanceWidget />
        
        <Card className="md:col-span-2 glass border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-headline font-medium">Financial Activity</CardTitle>
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
                <Bar dataKey="income" fill="#4062FF" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="expense" fill="#73CFFF" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 glass border-primary/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-headline font-bold">Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" className="text-primary hover:text-accent font-medium gap-1" asChild>
              <Link href="/dashboard/activity">
                View All <ChevronRight size={14} />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Merchant</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Category</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-border/30 hover:bg-muted/30">
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{tx.merchant}</span>
                        <span className="text-[10px] text-muted-foreground">{tx.date}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-normal py-0">
                        {tx.category}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-headline font-semibold",
                      tx.amount < 0 ? "text-rose-400" : "text-emerald-400"
                    )}>
                      <PrivacyMask>
                        {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
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
          </CardContent>
        </Card>

        <Card className="glass border-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-headline font-bold">Spending by Category</CardTitle>
            <CardDescription>Monthly overview of your expenses</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {spendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0E1016', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-3 mt-4">
              {spendingData.map((category) => (
                <div key={category.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-muted-foreground">{category.name}</span>
                  </div>
                  <span className="font-semibold">${category.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
