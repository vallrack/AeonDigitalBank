
"use client"

import React, { useState, useMemo } from 'react';
import { VirtualCard } from '@/components/banking/virtual-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Power, ShieldAlert, Sliders, Trash2, Zap, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function CardsPage() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const [isCreating, setIsCreating] = useState(false);
  const [limit, setLimit] = useState([1500]);

  const cardsQuery = useMemo(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'virtualCards');
  }, [db, user]);

  const { data: cards, loading: cardsLoading } = useCollection(cardsQuery);

  const handleCreateCard = () => {
    if (!user) return;
    setIsCreating(true);

    const newCard = {
      userId: user.uid,
      cardHolder: user.displayName || user.email?.split('@')[0].toUpperCase() || 'VALUED CUSTOMER',
      cardNumber: Array.from({ length: 4 }, () => Math.floor(1000 + Math.random() * 9000)).join(''),
      expiryDate: '12/28',
      cvv: Math.floor(100 + Math.random() * 899).toString(),
      isFrozen: false,
      type: 'standard',
      createdAt: new Date().toISOString()
    };

    addDoc(collection(db, 'users', user.uid, 'virtualCards'), newCard)
      .then(() => {
        toast({
          title: "Card Created",
          description: "Your new virtual card is ready to use.",
        });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: `users/${user.uid}/virtualCards`,
          operation: 'create',
          requestResourceData: newCard
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsCreating(false));
  };

  const toggleFreeze = (card: any) => {
    if (!user) return;
    const cardRef = doc(db, 'users', user.uid, 'virtualCards', card.id);
    
    updateDoc(cardRef, { isFrozen: !card.isFrozen })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: cardRef.path,
          operation: 'update',
          requestResourceData: { isFrozen: !card.isFrozen }
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const deleteCard = (cardId: string) => {
    if (!user) return;
    const cardRef = doc(db, 'users', user.uid, 'virtualCards', cardId);
    
    deleteDoc(cardRef)
      .then(() => {
        toast({ title: "Card deleted" });
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: cardRef.path,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  if (userLoading || cardsLoading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;
  }

  const standardCards = cards.filter(c => c.type === 'standard');
  const disposableCards = cards.filter(c => c.type === 'disposable');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Virtual Cards</h1>
          <p className="text-muted-foreground">Secure your online purchases with dynamic virtual cards.</p>
        </div>
        <Button 
          className="gap-2 glow-indigo" 
          onClick={handleCreateCard} 
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          Create New Card
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border/50">
              <TabsTrigger value="all">Main Cards ({standardCards.length})</TabsTrigger>
              <TabsTrigger value="disposable">Disposable ({disposableCards.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6 space-y-8">
              {standardCards.length > 0 ? (
                standardCards.map(card => (
                  <div key={card.id} className="flex flex-col items-center gap-4">
                    <VirtualCard 
                      cardHolder={card.cardHolder}
                      cardNumber={card.cardNumber}
                      expiryDate={card.expiryDate}
                      cvv={card.cvv}
                      isFrozen={card.isFrozen}
                    />
                    <div className="flex gap-2 w-full max-w-sm">
                      <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => toggleFreeze(card)}>
                        <Power size={14} /> {card.isFrozen ? 'Unfreeze' : 'Freeze'}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 text-destructive" onClick={() => deleteCard(card.id)}>
                        <Trash2 size={14} /> Delete
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-2xl border-white/5">
                  <p className="text-muted-foreground">You don't have any virtual cards yet.</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="disposable" className="mt-6">
              {disposableCards.length > 0 ? (
                disposableCards.map(card => (
                  <VirtualCard 
                    key={card.id}
                    cardHolder={card.cardHolder}
                    cardNumber={card.cardNumber}
                    expiryDate={card.expiryDate}
                    cvv={card.cvv}
                    type="disposable"
                  />
                ))
              ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-2xl border-white/5">
                  <p className="text-muted-foreground">No disposable cards available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="text-primary" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Card Management</CardTitle>
              </div>
              <CardDescription>Configure spending limits and security policies.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <Label className="text-base">Monthly Spending Limit</Label>
                    <p className="text-sm text-muted-foreground">Transactions will be declined once limit is reached.</p>
                  </div>
                  <span className="text-2xl font-headline font-bold text-accent">${limit[0].toLocaleString()}</span>
                </div>
                <Slider 
                  value={limit} 
                  onValueChange={setLimit} 
                  max={5000} 
                  step={50} 
                  className="py-4"
                />
              </div>

              <div className="space-y-4 pt-6 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Contactless Payments</Label>
                    <p className="text-sm text-muted-foreground">Enable NFC payments via mobile wallet.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">International Transactions</Label>
                    <p className="text-sm text-muted-foreground">Allow transactions outside your home country.</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button className="w-full glow-indigo mt-4">Save Configuration</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
