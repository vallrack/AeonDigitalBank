
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, ShieldCheck, AlertTriangle, Loader2, CheckCircle2, Search, User, CreditCard, Sparkles } from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, collection, writeBatch, increment, getDocs, query, where, limit } from 'firebase/firestore';
import { predictiveFraudMonitoring } from '@/ai/flows/predictive-fraud-monitoring';
import { intelligentExpenseCategorization } from '@/ai/flows/intelligent-expense-categorization';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function TransfersPage() {
  const { user } = useUser();
  const db = useFirestore();
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

  const findRecipient = async () => {
    if (!searchQuery) return;
    setIsProcessing(true);
    try {
      let foundUser = null;
      const cleanQuery = searchQuery.trim();

      // Buscar por Email
      if (cleanQuery.includes('@')) {
        const q = query(collection(db, 'users'), where('email', '==', cleanQuery.toLowerCase()), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) foundUser = snap.docs[0].data();
      } 
      // Buscar por Número de Tarjeta (Ecosistema interno)
      else if (cleanQuery.length >= 10) {
        const q = query(collectionGroup(db, 'virtualCards'), where('cardNumber', '==', cleanQuery), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const cardData = snap.docs[0].data();
          const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', cardData.userId), limit(1)));
          if (!userSnap.empty) foundUser = userSnap.docs[0].data();
        }
      }

      if (!foundUser) {
        toast({
          variant: "destructive",
          title: "Destinatario no encontrado",
          description: "Solo se permiten transferencias a clientes activos o tarjetas de la Red AEON."
        });
      } else if (foundUser.uid === user?.uid) {
        toast({ variant: "destructive", title: "Operación no válida", description: "No puedes transferirte a ti mismo." });
      } else {
        setRecipientUser(foundUser);
        setStep(2);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error de búsqueda", description: "Hubo un problema al validar el destinatario en la red AEON." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefBlur = async () => {
    if (!reference || reference.length < 3) return;
    setIsAiLoading(true);
    try {
      const result = await intelligentExpenseCategorization({
        merchant: recipientUser?.fullName || 'AEON Transfer',
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
      toast({ variant: "destructive", title: "Monto requerido" });
      return;
    }

    if (parseFloat(amount) > (userData?.balance || 0)) {
      toast({ variant: "destructive", title: "Saldo insuficiente" });
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
          location: 'AEON Secure Network'
        },
        userContext: {
          transactionHistory: [], 
          knownLocations: ['AEON Digital'],
          averageTransactionAmount: 200,
          dailySpendLimit: 5000
        }
      });

      setFraudResult(analysis);
      setStep(3);
    } catch (error) {
      setStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmTransfer = () => {
    if (!user || !userData || !recipientUser) return;
    setIsProcessing(true);

    const numAmount = parseFloat(amount);
    const batch = writeBatch(db);

    const senderTxRef = doc(collection(db, 'users', user.uid, 'transactions'));
    const recipientTxRef = doc(collection(db, 'users', recipientUser.uid, 'transactions'));
    const senderUserRef = doc(db, 'users', user.uid);
    const recipientUserRef = doc(db, 'users', recipientUser.uid);

    batch.set(senderTxRef, {
      userId: user.uid,
      merchant: `Transferencia a ${recipientUser.fullName}`,
      amount: numAmount,
      category: aiCategory,
      status: 'Completed',
      date: new Date().toISOString(),
      type: 'expense',
      reference: reference,
      recipientId: recipientUser.uid,
      network: 'AEON_INTERNAL'
    });

    batch.set(recipientTxRef, {
      userId: recipientUser.uid,
      merchant: `Transferencia de ${userData.fullName}`,
      amount: numAmount,
      category: 'Income',
      status: 'Completed',
      date: new Date().toISOString(),
      type: 'income',
      reference: reference,
      senderId: user.uid,
      network: 'AEON_INTERNAL'
    });

    batch.update(senderUserRef, { balance: increment(-numAmount) });
    batch.update(recipientUserRef, { balance: increment(numAmount) });

    batch.commit()
      .then(() => {
        setStep(4);
        toast({ title: "Transferencia Exitosa" });
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/transactions`,
          operation: 'write',
          requestResourceData: { amount: numAmount }
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsProcessing(false));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-headline font-bold">Transferencia de Fondos</h1>
        <p className="text-muted-foreground">Ecosistema cerrado de pagos AEON Network.</p>
      </div>

      {step === 1 && (
        <Card className="glass border-primary/10">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="text-primary" size={20} />
              Buscar Destinatario AEON
            </CardTitle>
            <CardDescription>Email verificado o número de tarjeta AEON.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Identificador del Cliente</Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="search" 
                  placeholder="Email o número de tarjeta AEON" 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && findRecipient()}
                />
              </div>
            </div>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Nota de Seguridad</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Solo se permiten transferencias entre cuentas y tarjetas activas dentro del sistema AEON Digital.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full glow-indigo" onClick={findRecipient} disabled={isProcessing || !searchQuery}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Validar Destinatario"}
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
                  Red de Confianza AEON
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handleTransferInit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Monto a Enviar (USD)</Label>
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
                  <span>Tu saldo: ${(userData?.balance || 0).toLocaleString()}</span>
                  <span>Sin comisiones bancarias externas</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Referencia / Concepto</Label>
                <Textarea 
                  id="reference" 
                  placeholder="Descripción de la transferencia" 
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
                    Categorización IA: {aiCategory}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Atrás</Button>
              <Button type="submit" className="flex-1 glow-indigo" disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Continuar"}
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
                  Validación de Seguridad
                </CardTitle>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  fraudResult?.alertLevel === 'High' ? "bg-rose-500" : 
                  fraudResult?.alertLevel === 'Medium' ? "bg-amber-500" : "bg-emerald-500"
                )}>
                  Riesgo: {fraudResult?.alertLevel || 'Nulo'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed">{fraudResult?.reason || "Operación verificada dentro de la Red AEON."}</p>
              <div className="bg-background/50 p-6 rounded-xl space-y-3 border border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Destinatario:</span>
                  <span className="font-bold">{recipientUser?.fullName}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-muted-foreground text-xs">Monto Neto:</span>
                  <span className="font-headline font-bold text-2xl text-accent">${parseFloat(amount).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Editar</Button>
              <Button 
                className={cn("flex-1", fraudResult?.isSuspicious ? "bg-amber-500 hover:bg-amber-600" : "glow-indigo")} 
                onClick={confirmTransfer}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Confirmar Envío"}
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
              <h2 className="text-2xl font-headline font-bold">Envío Confirmado</h2>
              <p className="text-muted-foreground">Se han transferido ${parseFloat(amount).toFixed(2)} exitosamente dentro de la Red AEON.</p>
            </div>
            <Button className="w-full glow-indigo" onClick={() => {
              setStep(1);
              setAmount('');
              setSearchQuery('');
              setRecipientUser(null);
              setReference('');
              setAiCategory('Transfer');
            }}>
              Nueva Operación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { collectionGroup } from 'firebase/firestore';
