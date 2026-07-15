"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft, ShieldCheck, AlertTriangle, Loader2, CheckCircle2, Search, User, CreditCard, Sparkles, RefreshCw } from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, collection, query, where, getDocs, writeBatch, increment } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

export default function TransfersPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData } = useDoc(userRef);
  
  const checkingBalance = Number(userData?.checkingBalance ?? userData?.balance ?? 0);
  const savingsBalance = Number(userData?.savingsBalance ?? 0);

  // Zelle State
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientUser, setRecipientUser] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [aiCategory, setAiCategory] = useState('Transfer');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [sourceAccount, setSourceAccount] = useState<'checking' | 'savings'>('checking');

  // Internal Transfer State
  const [internalAmount, setInternalAmount] = useState('');
  const [internalSource, setInternalSource] = useState<'checking' | 'savings'>('checking');
  const [internalDest, setInternalDest] = useState<'checking' | 'savings'>('savings');
  const [internalProcessing, setInternalProcessing] = useState(false);

  const availableBalance = sourceAccount === 'checking' ? checkingBalance : savingsBalance;
  const internalAvailable = internalSource === 'checking' ? checkingBalance : savingsBalance;

  const findRecipient = async () => {
    if (!searchQuery) return;
    setIsProcessing(true);
    try {
      const cleanQuery = searchQuery.trim().toLowerCase();
      let foundUser: any = null;

      if (cleanQuery.includes("@")) {
        const q = query(collection(db, 'users'), where('email', '==', cleanQuery));
        const snap = await getDocs(q);
        if (!snap.empty) {
          foundUser = snap.docs[0].data();
        }
      } else {
        toast({ variant: "destructive", title: t.common.error, description: "Please search by email." });
        setIsProcessing(false);
        return;
      }

      if (!foundUser) throw new Error("Not found");

      if (foundUser.uid === user?.uid) {
        toast({ 
          variant: "destructive", 
          title: t.common.error, 
          description: t.transfers.search_err_self 
        });
      } else {
        setRecipientUser({ uid: foundUser.uid, fullName: foundUser.fullName });
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

  const handleTransferInit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({ variant: "destructive", title: t.common.error, description: t.transfers.err_amount_req });
      return;
    }

    if (parseFloat(amount) > availableBalance) {
      toast({ variant: "destructive", title: t.common.error, description: t.transfers.err_insufficient });
      return;
    }

    setIsProcessing(true);
    // Mock fraud verification
    setTimeout(() => {
        setFraudResult({ isSuspicious: false, alertLevel: 'Low', reason: 'Verified' });
        setStep(3);
        setIsProcessing(false);
    }, 800);
  };

  const confirmTransfer = async () => {
    if (!user || !userData || !recipientUser) return;
    setIsProcessing(true);

    const numAmount = parseFloat(amount);

    try {
      const batch = writeBatch(db);
      
      const senderRef = doc(db, 'users', user.uid);
      const recipientRef = doc(db, 'users', recipientUser.uid);
      
      const senderTxRef = doc(collection(db, 'users', user.uid, 'transactions'));
      const recipientTxRef = doc(collection(db, 'users', recipientUser.uid, 'transactions'));

      const senderField = sourceAccount === 'checking' ? 'checkingBalance' : 'savingsBalance';
      const destField = 'checkingBalance';

      batch.update(senderRef, { [senderField]: increment(-numAmount) });
      batch.update(recipientRef, { [destField]: increment(numAmount) });

      batch.set(senderTxRef, {
        userId: user.uid,
        merchant: `Transferencia a ${recipientUser.fullName}`,
        amount: numAmount,
        category: aiCategory || "Transfer",
        status: "Completed",
        date: new Date().toISOString(),
        type: "expense",
        reference: reference || "",
        recipientId: recipientUser.uid,
        account: sourceAccount,
        network: "AEON_INTERNAL"
      });

      batch.set(recipientTxRef, {
        userId: recipientUser.uid,
        merchant: `Transferencia de ${userData.fullName}`,
        amount: numAmount,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income",
        reference: reference || "",
        senderId: user.uid,
        account: "checking",
        network: "AEON_INTERNAL"
      });

      await batch.commit();

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

  const handleInternalTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (internalSource === internalDest) {
        toast({ variant: "destructive", title: t.common.error, description: "Debe seleccionar cuentas diferentes." });
        return;
    }
    const num = parseFloat(internalAmount);
    if (!num || num <= 0) {
        toast({ variant: "destructive", title: t.common.error, description: t.transfers.err_amount_req });
        return;
    }
    if (num > internalAvailable) {
        toast({ variant: "destructive", title: t.common.error, description: t.transfers.err_insufficient });
        return;
    }

    setInternalProcessing(true);
    try {
        const batch = writeBatch(db);
        const userRefDoc = doc(db, 'users', user.uid);
        
        const sourceField = internalSource === 'checking' ? 'checkingBalance' : 'savingsBalance';
        const destField = internalDest === 'checking' ? 'checkingBalance' : 'savingsBalance';
        
        batch.update(userRefDoc, { 
            [sourceField]: increment(-num),
            [destField]: increment(num)
        });

        // Registrar Expense
        const txOutRef = doc(collection(db, 'users', user.uid, 'transactions'));
        batch.set(txOutRef, {
            userId: user.uid,
            merchant: `Traspaso a ${internalDest === 'checking' ? 'Cheques' : 'Ahorros'}`,
            amount: num,
            category: "Transfer",
            status: "Completed",
            date: new Date().toISOString(),
            type: "expense",
            reference: "Transferencia entre mis cuentas",
            account: internalSource,
            network: "INTERNAL"
        });

        // Registrar Income
        const txInRef = doc(collection(db, 'users', user.uid, 'transactions'));
        batch.set(txInRef, {
            userId: user.uid,
            merchant: `Traspaso desde ${internalSource === 'checking' ? 'Cheques' : 'Ahorros'}`,
            amount: num,
            category: "Transfer",
            status: "Completed",
            date: new Date().toISOString(),
            type: "income",
            reference: "Transferencia entre mis cuentas",
            account: internalDest,
            network: "INTERNAL"
        });

        await batch.commit();
        toast({ title: t.common.success, description: "Transferencia interna completada." });
        setInternalAmount('');
    } catch (e: any) {
        toast({ variant: "destructive", title: t.common.error, description: e.message });
    } finally {
        setInternalProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">{t.transfers.title}</h1>
        <p className="text-muted-foreground">{t.transfers.subtitle}</p>
      </div>

      <Tabs defaultValue="zelle" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/20">
          <TabsTrigger value="zelle">Transferencias (Zelle)</TabsTrigger>
          <TabsTrigger value="internal">Cuentas Propias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="zelle">
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
                      <Label>Desde mi cuenta</Label>
                      <Select value={sourceAccount} onValueChange={(val: 'checking' | 'savings') => setSourceAccount(val)}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                          <SelectItem value="checking">Cheques (Disponible: ${checkingBalance.toLocaleString()})</SelectItem>
                          <SelectItem value="savings">Ahorros (Disponible: ${savingsBalance.toLocaleString()})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reference">{t.transfers.ref_label}</Label>
                      <Textarea 
                        id="reference" 
                        placeholder={t.transfers.ref_ph} 
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                      />
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
        </TabsContent>

        <TabsContent value="internal">
           <Card className="glass border-primary/10">
             <CardHeader>
               <CardTitle className="text-xl flex items-center gap-2">
                 <RefreshCw className="text-primary" size={20} />
                 Traspaso Interno
               </CardTitle>
               <CardDescription>Transfiere dinero entre tus propias cuentas.</CardDescription>
             </CardHeader>
             <form onSubmit={handleInternalTransfer}>
               <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Cuenta Origen</Label>
                        <Select value={internalSource} onValueChange={(val: 'checking' | 'savings') => setInternalSource(val)}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass">
                            <SelectItem value="checking">Cheques (${checkingBalance.toLocaleString()})</SelectItem>
                            <SelectItem value="savings">Ahorros (${savingsBalance.toLocaleString()})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Cuenta Destino</Label>
                        <Select value={internalDest} onValueChange={(val: 'checking' | 'savings') => setInternalDest(val)}>
                          <SelectTrigger className="bg-background/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="glass">
                            <SelectItem value="checking">Cheques (${checkingBalance.toLocaleString()})</SelectItem>
                            <SelectItem value="savings">Ahorros (${savingsBalance.toLocaleString()})</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="internalAmount">Monto a Transferir</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                      <Input 
                        id="internalAmount" 
                        type="number" 
                        className="pl-7 text-xl font-headline" 
                        placeholder="0.00" 
                        value={internalAmount}
                        onChange={(e) => setInternalAmount(e.target.value)}
                        required
                      />
                    </div>
                  </div>
               </CardContent>
               <CardFooter>
                 <Button type="submit" className="w-full glow-indigo" disabled={internalProcessing || (internalSource === internalDest) || !internalAmount}>
                   {internalProcessing ? <Loader2 className="animate-spin mr-2" /> : "Transferir Ahora"}
                 </Button>
               </CardFooter>
             </form>
           </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
