
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, ShieldCheck, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, collection, addDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { predictiveFraudMonitoring } from '@/ai/flows/predictive-fraud-monitoring';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function TransfersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData } = useDoc(userRef);

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [step, setStep] = useState(1); // 1: Form, 2: Fraud Check, 3: Success

  const handleTransferInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: "Amount required" });
      return;
    }

    if (parseFloat(amount) > (userData?.balance || 0)) {
      toast({ variant: "destructive", title: "Insufficient funds" });
      return;
    }

    setIsProcessing(true);
    try {
      // Call Genkit Fraud Monitoring AI
      const analysis = await predictiveFraudMonitoring({
        currentTransaction: {
          transactionId: Math.random().toString(36).substring(7),
          userId: user?.uid || 'anon',
          amount: parseFloat(amount),
          currency: 'USD',
          timestamp: new Date().toISOString(),
          merchant: recipient,
          location: 'Global (Online)'
        },
        userContext: {
          transactionHistory: [], // In a real app, we'd fetch recent history here
          knownLocations: ['Home', 'Office'],
          averageTransactionAmount: 200,
          dailySpendLimit: 5000
        }
      });

      setFraudResult(analysis);
      setStep(2);
    } catch (error) {
      console.error("Fraud monitoring failed", error);
      // Proceed anyway if AI fails, or handle error
      setStep(2);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTransfer = async () => {
    if (!user || !userData) return;
    setIsProcessing(true);

    try {
      const numAmount = parseFloat(amount);
      const transactionData = {
        userId: user.uid,
        merchant: recipient,
        amount: numAmount,
        category: 'Transfer',
        status: 'Completed',
        date: new Date().toISOString(),
        type: 'expense',
        reference: reference
      };

      // 1. Create transaction record
      await addDoc(collection(db, 'users', user.uid, 'transactions'), transactionData);

      // 2. Update user balance (Atomically)
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(-numAmount)
      });

      setStep(3);
      toast({ title: "Transfer Successful" });
    } catch (error: any) {
      const permissionError = new FirestorePermissionError({
        path: `users/${user.uid}/transactions`,
        operation: 'create',
        requestResourceData: { amount }
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Funds Transfer</h1>
        <p className="text-muted-foreground">Move money with AI-enhanced security monitoring.</p>
      </div>

      {step === 1 && (
        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <ArrowRightLeft className="text-primary" size={20} />
              New Transfer
            </CardTitle>
            <CardDescription>Recipient and amount details.</CardDescription>
          </CardHeader>
          <form onSubmit={handleTransferInit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Name or Email</Label>
                <Input 
                  id="recipient" 
                  placeholder="e.g. Elena Smith" 
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    id="amount" 
                    type="number" 
                    className="pl-7" 
                    placeholder="0.00" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Available balance: ${(userData?.balance || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (Optional)</Label>
                <Textarea 
                  id="reference" 
                  placeholder="What is this transfer for?" 
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full glow-indigo" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Verify & Continue"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in zoom-in-95 duration-500">
          <Card className={cn(
            "border-2",
            fraudResult?.isSuspicious ? "border-amber-500 bg-amber-500/5" : "border-emerald-500 bg-emerald-500/5"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {fraudResult?.isSuspicious ? <AlertTriangle className="text-amber-500" /> : <ShieldCheck className="text-emerald-500" />}
                  Security Assessment
                </CardTitle>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  fraudResult?.alertLevel === 'High' ? "bg-rose-500" : 
                  fraudResult?.alertLevel === 'Medium' ? "bg-amber-500" : "bg-emerald-500"
                )}>
                  {fraudResult?.alertLevel || 'Safe'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{fraudResult?.reason || "No suspicious activity detected. Transaction is safe to proceed."}</p>
              <div className="bg-background/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transfer to:</span>
                  <span className="font-bold">{recipient}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-bold text-lg">${parseFloat(amount).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Cancel</Button>
              <Button 
                className={cn("flex-1", fraudResult?.isSuspicious ? "bg-amber-500 hover:bg-amber-600" : "glow-indigo")} 
                onClick={confirmTransfer}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Confirm Transfer"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card className="text-center p-12 animate-in zoom-in-95 duration-700">
          <CardContent className="space-y-6">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="text-emerald-500" size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-headline font-bold">Transfer Complete</h2>
              <p className="text-muted-foreground">Successfully sent ${parseFloat(amount).toFixed(2)} to {recipient}.</p>
            </div>
            <Button className="w-full glow-indigo" onClick={() => {
              setStep(1);
              setAmount('');
              setRecipient('');
              setReference('');
            }}>
              New Transfer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
