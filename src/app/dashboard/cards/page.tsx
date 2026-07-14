
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
import { useI18n } from '@/lib/i18n/context';


export default function CardsPage() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [limit, setLimit] = useState([1500]);

  const cardsQuery = useMemo(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'virtualCards');
  }, [db, user]);

  const { data: cards, loading: cardsLoading } = useCollection(cardsQuery);

  const handleCreateCard = async () => {
    if (!user) return;
    setIsCreating(true);

    try {
      const randomCard = "4255" + Math.floor(100000000000 + Math.random() * 900000000000).toString().substring(0, 12);
      const randomCvv = Math.floor(100 + Math.random() * 900).toString().substring(0, 3);
      
      await addDoc(collection(db, 'users', user.uid, 'virtualCards'), {
        userId: user.uid,
        cardHolder: (user.displayName || "VALUED CUSTOMER").toUpperCase(),
        cardNumber: randomCard,
        expiryDate: "12/28",
        cvv: randomCvv,
        isFrozen: false,
        type: "standard",
        createdAt: new Date().toISOString()
      });

      toast({
        title: t.cards.success_create,
        description: t.cards.success_create_desc,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const toggleFreeze = async (card: any) => {
    if (!user) return;
    try {
      const cardRef = doc(db, 'users', user.uid, 'virtualCards', card.id);
      await updateDoc(cardRef, { isFrozen: !card.isFrozen });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    }
  };

  const deleteCard = async (cardId: string) => {
    if (!user) return;
    try {
      const cardRef = doc(db, 'users', user.uid, 'virtualCards', cardId);
      await deleteDoc(cardRef);
      toast({ title: t.cards.success_delete });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    }
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
          <h1 className="text-3xl font-headline font-bold">{t.cards.title}</h1>
          <p className="text-muted-foreground">{t.cards.subtitle}</p>
        </div>
        <Button 
          className="gap-2 glow-indigo" 
          onClick={handleCreateCard} 
          disabled={isCreating}
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
          {t.cards.create_card}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border/50">
              <TabsTrigger value="all">{t.cards.main_cards} ({standardCards.length})</TabsTrigger>
              <TabsTrigger value="disposable">{t.cards.disposable} ({disposableCards.length})</TabsTrigger>
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
                        <Power size={14} /> {card.isFrozen ? t.cards.unfreeze : t.cards.freeze}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 text-destructive" onClick={() => deleteCard(card.id)}>
                        <Trash2 size={14} /> {t.common.delete}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-2xl border-white/5">
                  <p className="text-muted-foreground">{t.cards.no_cards}</p>
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
                  <p className="text-muted-foreground">{t.cards.no_disp_cards}</p>
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
                <CardTitle className="text-xl font-headline font-bold">{t.cards.management}</CardTitle>
              </div>
              <CardDescription>{t.cards.management_desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <Label className="text-base">{t.cards.monthly_limit}</Label>
                    <p className="text-sm text-muted-foreground">{t.cards.limit_desc}</p>
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
                    <Label className="text-base">{t.cards.contactless}</Label>
                    <p className="text-sm text-muted-foreground">{t.cards.contactless_desc}</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t.cards.international}</Label>
                    <p className="text-sm text-muted-foreground">{t.cards.international_desc}</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <Button className="w-full glow-indigo mt-4">{t.cards.save_config}</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
