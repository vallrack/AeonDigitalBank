
"use client"

import React, { useState, useMemo } from 'react';
import { VirtualCard, CardStyleType } from '@/components/banking/virtual-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Power, ShieldAlert, Sliders, Trash2, Zap, Loader2, ShoppingCart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useDoc } from '@/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n/context';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

export default function CardsPage() {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [limit, setLimit] = useState([1500]);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<CardStyleType>('customized-cash');
  const [selectedVariant, setSelectedVariant] = useState<'standard'|'fifa'>('standard');
  const [customColor, setCustomColor] = useState('#1d4ed8');
  const [customBgImage, setCustomBgImage] = useState('');
  const [customLogo, setCustomLogo] = useState('');

  const cardsQuery = useMemo(() => {
    if (!user) return null;
    return collection(db, 'users', user.uid, 'virtualCards');
  }, [db, user]);

  const { data: cards, loading: cardsLoading } = useCollection(cardsQuery);
  const { data: userData } = useDoc(user ? doc(db, 'users', user.uid) : null);

  const [purchaseMerchant, setPurchaseMerchant] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [purchaseCardId, setPurchaseCardId] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData || !purchaseMerchant || !purchaseAmount || !purchaseCardId) return;

    const amountNum = parseFloat(purchaseAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: t.common.error, description: "Monto inválido" });
      return;
    }

    const selectedCard = cards.find(c => c.id === purchaseCardId);
    if (!selectedCard) return;

    if (selectedCard.isFrozen) {
      toast({ variant: "destructive", title: "Transacción Rechazada", description: "La tarjeta seleccionada está bloqueada/congelada." });
      return;
    }

    const currentChecking = Number(userData.checkingBalance ?? userData.balance) || 0;
    if (currentChecking < amountNum) {
      toast({ variant: "destructive", title: "Transacción Rechazada", description: "Fondos insuficientes en la cuenta de Cheques." });
      return;
    }

    setIsPurchasing(true);
    try {
      // Motor Anti-Fraude
      const suspiciousKeywords = ['casino', 'crypto', 'binance', 'bet', 'apuesta', 'poker', 'loto'];
      const isSuspicious = suspiciousKeywords.some(kw => purchaseMerchant.toLowerCase().includes(kw));
      const isHighAmount = amountNum >= 1000;
      const isFlagged = isSuspicious || isHighAmount;

      // 1. Descontar saldo (el dinero queda retenido aunque sea fraude)
      await updateDoc(doc(db, 'users', user.uid), {
        checkingBalance: currentChecking - amountNum
      });

      // 2. Registrar Transacción
      await addDoc(collection(db, 'users', user.uid, 'transactions'), {
        amount: amountNum,
        type: 'debit',
        description: `Compra en ${purchaseMerchant}`,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: isFlagged ? 'pending' : 'completed',
        flagged: isFlagged,
        flagReason: isHighAmount ? 'High amount' : (isSuspicious ? 'Suspicious merchant' : null),
        account: 'checking',
        cardNumber: selectedCard.cardNumber.slice(-4),
        network: selectedCard.type === 'aeropay' ? 'AEROPAY' : 'VISA'
      });

      if (isFlagged) {
        toast({
          variant: "destructive",
          title: "Alerta de Seguridad",
          description: `La compra por $${amountNum.toFixed(2)} ha sido retenida por prevención de fraude y está bajo revisión.`
        });
      } else {
        toast({
          title: "¡Compra Aprobada!",
          description: `Se pagaron $${amountNum.toFixed(2)} en ${purchaseMerchant}.`
        });
      }
      
      setPurchaseMerchant('');
      setPurchaseAmount('');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCreateCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        type: selectedType,
        variant: (selectedType === 'customized-cash' || selectedType === 'unlimited-cash') ? selectedVariant : 'standard',
        customColor: selectedType === 'custom' ? customColor : null,
        customBgImage: selectedType === 'custom' ? customBgImage : null,
        customLogo: selectedType === 'custom' ? customLogo : null,
        createdAt: new Date().toISOString()
      });

      toast({
        title: t.cards.success_create,
        description: t.cards.success_create_desc,
      });
      setCreateOpen(false);
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
    if (!confirm(t.common.confirm + "?")) return;
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

  // Ahora mostraremos todas las tarjetas juntas
  const allCards = cards || [];

  // Comprobar si la promoción de la FIFA sigue activa (hasta 31 Julio 2026)
  const isFifaPromoActive = new Date() <= new Date('2026-07-31T23:59:59');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">{t.cards.title}</h1>
          <p className="text-muted-foreground">{t.cards.subtitle}</p>
        </div>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 glow-indigo">
              <Plus size={16} />
              {t.cards.create_card}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Crear Tarjeta Virtual</DialogTitle>
              <DialogDescription>Elige el modelo de tarjeta que prefieras.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
              
              <div className="space-y-2">
                <Label>Modelo de Tarjeta</Label>
                <Select 
                  value={selectedType} 
                  onValueChange={(val: CardStyleType) => {
                    setSelectedType(val);
                    if (val !== 'customized-cash' && val !== 'unlimited-cash') {
                      setSelectedVariant('standard');
                    }
                  }}
                >
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10">
                    <SelectItem value="customized-cash">Customized Cash Rewards (Roja)</SelectItem>
                    <SelectItem value="unlimited-cash">Unlimited Cash Rewards (Gris/Plata)</SelectItem>
                    <SelectItem value="travel-rewards">Travel Rewards (Azul oscuro)</SelectItem>
                    <SelectItem value="bankamericard">BankAmericard (Blanca)</SelectItem>
                    {userData?.role === 'admin' && (
                      <SelectItem value="custom">Diseño Personalizado (Custom)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedType === 'custom' && (
                <div className="space-y-4 mt-4 animate-in fade-in zoom-in duration-300">
                  <div className="space-y-2">
                    <Label>Color de Fondo (Hexadecimal o nombre)</Label>
                    <Input 
                      value={customColor} 
                      onChange={(e) => setCustomColor(e.target.value)} 
                      type="color"
                      className="h-10 w-full cursor-pointer bg-background/50 border-white/10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Imagen de Fondo (Opcional)</Label>
                    <Input 
                      placeholder="https://ejemplo.com/fondo.jpg" 
                      value={customBgImage} 
                      onChange={(e) => setCustomBgImage(e.target.value)} 
                      className="bg-background/50 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">Si pones una imagen, el color de fondo será ignorado.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>URL de Logo Central (Opcional)</Label>
                    <Input 
                      placeholder="https://ejemplo.com/logo.png" 
                      value={customLogo} 
                      onChange={(e) => setCustomLogo(e.target.value)} 
                      className="bg-background/50 border-white/10"
                    />
                    <p className="text-xs text-muted-foreground">Este logo aparecerá brillante en el centro de la tarjeta.</p>
                  </div>

                  <div className="mt-6 flex justify-center pointer-events-none">
                    <VirtualCard 
                      cardHolder={(user?.displayName || "VALUED CUSTOMER").toUpperCase()}
                      cardNumber="•••• •••• •••• 1234"
                      expiryDate="12/28"
                      cvv="***"
                      type="custom"
                      customColor={customColor}
                      customBgImage={customBgImage}
                      customLogo={customLogo}
                      interactive={false}
                    />
                  </div>
                </div>
              )}

              {/* Selector de variante (solo para rojo y gris) */}
              {(selectedType === 'customized-cash' || selectedType === 'unlimited-cash') ? (
                <div className="space-y-2 mt-4">
                  <Label>Seleccione el diseño de su tarjeta *</Label>
                  <div className={cn("grid grid-cols-1 gap-4 mt-2", isFifaPromoActive ? "md:grid-cols-2" : "md:grid-cols-1 max-w-sm mx-auto")}>
                     <div 
                       className={cn("border rounded-xl p-4 cursor-pointer flex flex-col gap-2 relative bg-white/5 hover:bg-white/10 transition-colors", selectedVariant === 'standard' ? "border-[#1d4ed8] ring-1 ring-[#1d4ed8]" : "border-white/10")}
                       onClick={() => setSelectedVariant('standard')}
                     >
                       <div className="flex items-center gap-3 mb-2">
                         <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", selectedVariant === 'standard' ? "border-[#1d4ed8]" : "border-gray-400")}>
                           {selectedVariant === 'standard' && <div className="w-2.5 h-2.5 bg-[#1d4ed8] rounded-full" />}
                         </div>
                         <span className="font-semibold text-sm">Bank of America®</span>
                       </div>
                       <VirtualCard 
                          cardHolder={(user?.displayName || "VALUED CUSTOMER").toUpperCase()}
                          cardNumber="•••• •••• •••• 1234"
                          expiryDate="12/28"
                          cvv="***"
                          type={selectedType}
                          variant="standard"
                          showNumbersOnFront={false}
                          interactive={false}
                          className="w-full pointer-events-none"
                       />
                     </div>

                     {isFifaPromoActive && (
                       <div 
                         className={cn("border rounded-xl p-4 cursor-pointer flex flex-col gap-2 relative bg-white/5 hover:bg-white/10 transition-colors", selectedVariant === 'fifa' ? "border-[#1d4ed8] ring-1 ring-[#1d4ed8]" : "border-white/10")}
                         onClick={() => setSelectedVariant('fifa')}
                       >
                         <div className="flex items-center gap-3 mb-2">
                           <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", selectedVariant === 'fifa' ? "border-[#1d4ed8]" : "border-gray-400")}>
                             {selectedVariant === 'fifa' && <div className="w-2.5 h-2.5 bg-[#1d4ed8] rounded-full" />}
                           </div>
                           <span className="font-semibold text-sm">Copa Mundial de la FIFA 2026™</span>
                         </div>
                         <VirtualCard 
                            cardHolder={(user?.displayName || "VALUED CUSTOMER").toUpperCase()}
                            cardNumber="•••• •••• •••• 1234"
                            expiryDate="12/28"
                            cvv="***"
                            type={selectedType}
                            variant="fifa"
                            showNumbersOnFront={false}
                            interactive={false}
                            className="w-full pointer-events-none"
                         />
                         <span className="text-xs text-muted-foreground text-center mt-2">Solo estará disponible hasta el 31 de julio de 2026</span>
                       </div>
                     )}
                  </div>
                </div>
              ) : (
                <div className="flex justify-center mt-4">
                  <VirtualCard 
                    cardHolder={(user?.displayName || "VALUED CUSTOMER").toUpperCase()}
                    cardNumber="•••• •••• •••• 1234"
                    expiryDate="12/28"
                    cvv="***"
                    type={selectedType}
                    variant="standard"
                    showNumbersOnFront={false}
                    interactive={false}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleCreateCard} className="w-full glow-indigo" disabled={isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Generar Tarjeta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-6 space-y-6">
           <div className="space-y-8 mt-4">
              {allCards.length > 0 ? (
                allCards.map(card => (
                  <div key={card.id} className="flex flex-col items-center gap-4 relative group">
                    <VirtualCard 
                      cardHolder={card.cardHolder}
                      cardNumber={card.cardNumber}
                      expiryDate={card.expiryDate}
                      cvv={card.cvv}
                      isFrozen={card.isFrozen}
                      type={card.type as any}
                      variant={card.variant as any}
                      customColor={card.customColor}
                      customBgImage={card.customBgImage}
                      customLogo={card.customLogo}
                      showNumbersOnFront={true}
                    />
                    <div className="flex gap-2 w-full max-w-sm mt-4">
                      <Button variant="outline" size="sm" className="flex-1 gap-2 border-white/10 hover:bg-white/5" onClick={() => toggleFreeze(card)}>
                        <Power size={14} className={card.isFrozen ? "text-emerald-400" : "text-amber-400"} /> 
                        {card.isFrozen ? t.cards.unfreeze : t.cards.freeze}
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300" onClick={() => deleteCard(card.id)}>
                        <Trash2 size={14} /> {t.common.delete}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-2xl border-white/5 bg-white/5">
                  <p className="text-muted-foreground">{t.cards.no_cards}</p>
                </div>
              )}
           </div>
        </div>

        <div className="lg:col-span-6 space-y-6">
          <Card className="glass border-primary/5 sticky top-8">
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

          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <ShoppingCart className="text-emerald-400" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Simulador de Compras</CardTitle>
              </div>
              <CardDescription>Prueba tus tarjetas realizando una compra virtual simulada.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePurchase} className="space-y-4">
                <div className="space-y-2">
                  <Label>Comercio / Tienda</Label>
                  <Input 
                    placeholder="Ej. Netflix, Amazon, Apple Store..." 
                    value={purchaseMerchant}
                    onChange={e => setPurchaseMerchant(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto a Pagar ($)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={purchaseAmount}
                    onChange={e => setPurchaseAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seleccionar Tarjeta</Label>
                  <Select value={purchaseCardId} onValueChange={setPurchaseCardId}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Selecciona una tarjeta" />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.type.toUpperCase()} •••• {c.cardNumber.slice(-4)} {c.isFrozen ? '(Bloqueada)' : ''}
                        </SelectItem>
                      ))}
                      {cards.length === 0 && (
                        <SelectItem value="none" disabled>No tienes tarjetas virtuales</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  type="submit" 
                  disabled={isPurchasing || cards.length === 0 || !purchaseCardId}
                  className="w-full glow-indigo bg-emerald-500 hover:bg-emerald-600 text-white border-none mt-2"
                >
                  {isPurchasing ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                  Procesar Pago
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
