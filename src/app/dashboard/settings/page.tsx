
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, 
  Settings, 
  Bell, 
  Globe, 
  Mail, 
  Loader2, 
  Check, 
  Palette,
  Eye
} from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData, loading } = useDoc(userRef);

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData) setName(userData.fullName || '');
  }, [userData]);

  const handleUpdateProfile = async () => {
    if (!user || !name) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: name
      });
      toast({ title: "Profile updated", description: "Your information has been saved." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not update profile." });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-headline font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your profile, notifications, and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/30 border border-white/5 p-1">
          <TabsTrigger value="profile" className="gap-2"><User size={14} /> Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell size={14} /> Notifications</TabsTrigger>
          <TabsTrigger value="regional" className="gap-2"><Globe size={14} /> Regional</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette size={14} /> Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 glass border-primary/5">
              <CardHeader className="text-center">
                <Avatar className="h-24 w-24 mx-auto border-4 border-primary/20 mb-4">
                  <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200/200`} />
                  <AvatarFallback>{name.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <CardTitle className="font-headline">{name}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Client Since</span>
                  <span className="text-sm font-medium">
                    {userData?.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'Dec 2024'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Account ID</span>
                  <span className="text-xs font-code opacity-50 truncate">{user?.uid}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass border-primary/5">
              <CardHeader>
                <CardTitle className="text-xl font-headline font-bold">Profile Details</CardTitle>
                <CardDescription>Basic information that will be visible in receipts and statements.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full-name">Full Legal Name</Label>
                  <Input 
                    id="full-name" 
                    className="bg-white/5 border-white/10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address (Read-only)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      className="pl-10 bg-white/5 border-white/10 opacity-50" 
                      value={user?.email || ''} 
                      disabled 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    placeholder="+34 600 000 000" 
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-white/5 pt-6 mt-4">
                <Button className="ml-auto glow-indigo" onClick={handleUpdateProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
                  Save Profile
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-8">
          <Card className="glass border-primary/5">
            <CardHeader>
              <CardTitle className="text-xl font-headline font-bold">Push & Email Notifications</CardTitle>
              <CardDescription>Stay informed about your balance and security events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { title: 'New Transaction Alerts', desc: 'Notify me when I receive or spend funds.', checked: true },
                { title: 'Security Alerts', desc: 'Notify me about new login attempts or password changes.', checked: true },
                { title: 'Marketing Emails', desc: 'Information about new Aeon products and features.', checked: false },
                { title: 'Weekly Statements', desc: 'Receive a summary of your financial activity every Monday.', checked: true }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{item.title}</Label>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={item.checked} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regional" className="mt-8">
          <Card className="glass border-primary/5">
            <CardHeader>
              <CardTitle className="text-xl font-headline font-bold">Language & Region</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Primary Language</Label>
                  <Input value="English (Global)" className="bg-white/5 border-white/10" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Currency Display</Label>
                  <Input value="USD ($)" className="bg-white/5 border-white/10" readOnly />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="mt-8">
          <Card className="glass border-primary/5">
            <CardHeader>
              <CardTitle className="text-xl font-headline font-bold">Interface Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Always use the high-precision dark interface.</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Eye size={16} className="text-accent" />
                    Incognito Mode by Default
                  </Label>
                  <p className="text-sm text-muted-foreground">Hide balances and transaction amounts automatically upon login.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
