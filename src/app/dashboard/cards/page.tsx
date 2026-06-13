"use client"

import React, { useState } from 'react';
import { VirtualCard } from '@/components/banking/virtual-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Power, ShieldAlert, Sliders, Trash2, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function CardsPage() {
  const [isFrozen, setIsFrozen] = useState(false);
  const [limit, setLimit] = useState([1500]);

  const handleFreezeToggle = () => {
    setIsFrozen(!isFrozen);
    toast({
      title: isFrozen ? "Card Unfrozen" : "Card Frozen",
      description: isFrozen ? "Your card is now active for transactions." : "Your card has been disabled temporarily.",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold">Virtual Cards</h1>
          <p className="text-muted-foreground">Secure your online purchases with dynamic virtual cards.</p>
        </div>
        <Button className="gap-2 glow-indigo">
          <Plus size={16} />
          Create New Card
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 border border-border/50">
              <TabsTrigger value="all">Main Cards</TabsTrigger>
              <TabsTrigger value="disposable">Disposable</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <div className="flex justify-center mb-8">
                <VirtualCard 
                  cardHolder="ADRIAN DE LEON"
                  cardNumber="4255883299014456"
                  expiryDate="11/28"
                  cvv="482"
                  isFrozen={isFrozen}
                />
              </div>
            </TabsContent>
            <TabsContent value="disposable" className="mt-6">
              <div className="flex justify-center mb-8">
                <VirtualCard 
                  cardHolder="ONE TIME USE"
                  cardNumber="5512773188203312"
                  expiryDate="12/23"
                  cvv="911"
                  type="disposable"
                />
              </div>
            </TabsContent>
          </Tabs>

          <Card className="glass border-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-headline uppercase tracking-widest text-muted-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button 
                variant={isFrozen ? "default" : "outline"} 
                className={cn("flex-col h-20 gap-2", isFrozen && "bg-emerald-600 hover:bg-emerald-500")}
                onClick={handleFreezeToggle}
              >
                <Power size={20} />
                {isFrozen ? "Unfreeze" : "Freeze Card"}
              </Button>
              <Button variant="outline" className="flex-col h-20 gap-2">
                <ShieldAlert size={20} />
                Report Lost
              </Button>
              <Button variant="outline" className="flex-col h-20 gap-2">
                <Zap size={20} />
                Renew CVV
              </Button>
              <Button variant="outline" className="flex-col h-20 gap-2 text-destructive hover:text-destructive">
                <Trash2 size={20} />
                Delete Card
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Sliders className="text-primary" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Card Management</CardTitle>
              </div>
              <CardDescription>Configure spending limits and security policies for this card.</CardDescription>
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
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">ATM Withdrawals</Label>
                    <p className="text-sm text-muted-foreground">Allow cash withdrawals from physical ATMs.</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Button className="w-full glow-indigo mt-4">Save Configuration</Button>
            </CardContent>
          </Card>

          <Card className="glass border-primary/5 overflow-hidden">
            <div className="bg-primary/5 p-4 flex items-center justify-between border-b border-primary/10">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-accent" />
                <span className="text-sm font-bold font-headline">Smart Security Tip</span>
              </div>
            </div>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your virtual card generates a <span className="text-accent font-semibold">Dynamic CVV</span> every 5 minutes. This prevents card-not-present fraud, as hackers cannot reuse your CVV for future unauthorized charges.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
