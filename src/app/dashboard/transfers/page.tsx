
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, ShieldCheck, AlertTriangle, Loader2, CheckCircle2, Search, User, CreditCard, Sparkles } from 'lucide-react';
import { useUser, useFirestore, useDoc, useFunctions } from '@/firebase';
import { doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { predictiveFraudMonitoring } from '@/ai/flows/predictive-fraud-monitoring';
import { intelligentExpenseCategorization } from '@/ai/flows/intelligent-expense-categorization';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useI18n } from '@/lib/i18n/context';

export default function TransfersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData } = useDoc(userRef);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientUser, setRecipientUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [aiCategory, setAiCategory] = useState('Transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [step, setStep] = useState(1);

  const functions = useFunctions();

  const findRecipient = async () => {
    if (!searchQuery) return;
    setIsProcessing(true);
    try {
      const searchFn = httpsCallable(functions, 'searchRecipient');
      const result = await searchFn({ query: searchQuery });
      const foundUser = result.data as { uid: string, fullName: string };

      if (foundUser.uid === user?.uid) {
        toast({ 
          variant: "destructive", 
          title: t.common.error, 
          description: t.transfers.search_err_self 
        });
      } else {
        setRecipientUser(foundUser);
        setStep(2);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.transfers.search_err_not_found
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefBlur = async () => {
    if (!reference || reference.length < 3) return;
    setIsAiLoading(true);
    try {
      const result = await intelligentExpenseCategorization({
        merchant: recipientUser?.fullName || 'Internal Transfer',
        description: reference,
        amount: parseFloat(amount) || 0
      });
      setAiCategory(result.category);
    } catch (e) {
      setAiCategory('Transfer');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleTransferInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: t.common.error, description: t.transfers.err_amount_req });
      return;
    }

    if (parseFloat(amount) > (userData?.balance || 0)) {
      toast({ variant: "destructive", title: t.common.error, description: t.transfers.err_insufficient });
      return;
    }

    setIsProcessing(true);
    try {
      const analysis = await predictiveFraudMonitoring({
        currentTransaction: {
          transactionId: Math.random().toString(36).substring(7),
          userId: user?.uid || 'anon',
          amount: parseFloat(amount),
          currency: 'USD',
          timestamp: new Date().toISOString(),
          merchant: recipientUser.fullName,
          location: 'Bank of Americans Secure Node'
        },
        userContext: {
          transactionHistory: [], 
          knownLocations: ['Bank of Americans Digital'],
          averageTransactionAmount: 200,
          dailySpendLimit: 5000
        }
      });

      setFraudResult(analysis);
      setStep(3);
    } catch (error) {
      setStep(3); // Continuar incluso si falla la IA (fallback)
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTransfer = async () => {
    if (!user || !userData || !recipientUser) return;
    setIsProcessing(true);

    const numAmount = parseFloat(amount);

    try {
      const processTransferFn = httpsCallable(functions, 'processTransfer');
      await processTransferFn({
        recipientId: recipientUser.uid,
        amount: numAmount,
        reference: reference,
        aiCategory: aiCategory
      });

      setStep(4);
      toast({ title: t.transfers.success_title });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: error.message || t.transfers.err_general
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">{t.transfers.title}</h1>
        <p className="text-muted-foreground">{t.transfers.subtitle}</p>
      </div>

      {step === 1 && (
        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="text-primary" size={20} />
              {t.transfers.search_title}
            </CardTitle>
            <CardDescription>{t.transfers.search_desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">{t.transfers.search_label}</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search" 
                  placeholder={t.transfers.search_ph} 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && findRecipient()}
                />
              </div>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">{t.transfers.search_note_title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t.transfers.search_note_desc}
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full glow-indigo" onClick={findRecipient} disabled={isProcessing || !searchQuery}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : t.transfers.search_btn}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass border-primary/10 animate-in slide-in-from-right-4">
          <CardHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="text-primary" size={24} />
              </div>
              <div>
                <CardTitle className="text-lg">{recipientUser?.fullName}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <ShieldCheck size={12} className="text-emerald-400" />
                  {t.transfers.trusted_network}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleTransferInit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">{t.transfers.amount_label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    id="amount" 
                    type="number" 
                    className="pl-7 text-xl font-headline" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{t.transfers.amount_balance} ${(userData?.balance || 0).toLocaleString()}</span>
                  <span>{t.transfers.amount_no_fees}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">{t.transfers.ref_label}</Label>
                <Textarea 
                  id="reference" 
                  placeholder={t.transfers.ref_ph} 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  onBlur={handleRefBlur}
                />
                <div className="flex items-center gap-2 mt-2">
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                    isAiLoading ? "bg-muted animate-pulse" : "bg-accent/20 text-accent"
                  )}>
                    {isAiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    {t.transfers.ai_category} {aiCategory}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setStep(1)}>{t.common.back}</Button>
              <Button type="submit" className="flex-1 glow-indigo" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : t.transfers.review_btn}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
          <Card className={cn(
            "border-2",
            fraudResult?.isSuspicious ? "border-amber-500 bg-amber-500/5" : "border-emerald-500 bg-emerald-500/5"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {fraudResult?.isSuspicious ? <AlertTriangle className="text-amber-500" /> : <ShieldCheck className="text-emerald-500" />}
                  {t.transfers.validation_title}
                </CardTitle>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  fraudResult?.alertLevel === 'High' ? "bg-rose-500" : 
                  fraudResult?.alertLevel === 'Medium' ? "bg-amber-500" : "bg-emerald-500"
                )}>
                  {t.transfers.risk_level} {fraudResult?.alertLevel || 'Nulo'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{fraudResult?.reason || "Operación verificada dentro de los parámetros de Bank of Americans."}</p>
              <div className="bg-background/50 p-6 rounded-xl space-y-3 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Destinatario:</span>
                  <span className="font-bold">{recipientUser?.fullName}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-muted-foreground text-xs">{t.transfers.net_amount}</span>
                  <span className="font-headline font-bold text-2xl text-accent">${parseFloat(amount).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>{t.common.edit}</Button>
              <Button 
                className={cn("flex-1", fraudResult?.isSuspicious ? "bg-amber-500 hover:bg-amber-600" : "glow-indigo")} 
                onClick={confirmTransfer}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : t.transfers.confirm_btn}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 4 && (
        <Card className="text-center p-12 animate-in zoom-in-95 duration-700">
          <CardContent className="space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-emerald-500" size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-bold">{t.transfers.success_title}</h2>
              <p className="text-muted-foreground">
                Se han enviado ${parseFloat(amount).toFixed(2)} a {recipientUser?.fullName}. {t.transfers.success_desc}
              </p>
            </div>
            <Button className="w-full glow-indigo" onClick={() => {
              setStep(1);
              setAmount('');
              setSearchQuery('');
              setRecipientUser(null);
              setReference('');
              setAiCategory('Transfer');
            }}>
              {t.transfers.another_transfer}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
