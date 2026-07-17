
"use client"

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  Eye,
  ShieldCheck,
  Camera
} from 'lucide-react';
import { useUser, useFirestore, useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/lib/i18n/context';

export default function SettingsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData, loading } = useDoc(userRef);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setName(userData.fullName || '');
      setPhone(userData.phoneNumber || '');
      setProfilePicture(userData.profilePicture || '');
    }
  }, [userData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) { // 500KB max to avoid Firestore 1MB doc limit
      toast({ variant: "destructive", title: t.common.error, description: "La imagen debe pesar menos de 500KB" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setProfilePicture(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async () => {
    if (!user || !name) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: name,
        phoneNumber: phone,
        profilePicture: profilePicture
      });
      toast({ title: t.settings.success_profile, description: t.settings.success_profile_desc });
    } catch (error) {
      toast({ variant: "destructive", title: t.common.error, description: t.settings.err_profile });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-headline font-bold">{t.settings.title}</h1>
        <p className="text-muted-foreground">{t.settings.subtitle}</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="bg-muted/30 border border-white/5 p-1">
          <TabsTrigger value="profile" className="gap-2"><User size={14} /> {t.settings.profile_tab}</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell size={14} /> {t.settings.notif_tab}</TabsTrigger>
          <TabsTrigger value="regional" className="gap-2"><Globe size={14} /> {t.settings.regional_tab}</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette size={14} /> {t.settings.appear_tab}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-1 glass border-primary/5">
              <CardHeader className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-4 group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    <AvatarImage src={profilePicture || `https://picsum.photos/seed/${user?.uid}/200/200`} className="object-cover" />
                    <AvatarFallback>{name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={20} className="text-white mb-1" />
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">Cambiar</span>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
                <CardTitle className="font-headline">{name}</CardTitle>
                <CardDescription>{user?.email}</CardDescription>
                <div className="mt-4 flex justify-center">
                  <Badge variant={userData?.role === 'admin' ? "default" : "secondary"} className="gap-1 px-3">
                    <ShieldCheck size={12} />
                    {userData?.role === 'admin' ? t.settings.admin : t.settings.client}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{t.settings.client_since}</span>
                  <span className="text-sm font-medium">
                    {userData?.createdAt?.toDate ? userData.createdAt.toDate().toLocaleDateString() : 'Dec 2024'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{t.settings.acc_id}</span>
                  <span className="text-xs font-code opacity-50 truncate">{user?.uid}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 glass border-primary/5">
              <CardHeader>
                <CardTitle className="text-xl font-headline font-bold">{t.settings.profile_details}</CardTitle>
                <CardDescription>{t.settings.profile_desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full-name">{t.settings.full_name}</Label>
                  <Input 
                    id="full-name" 
                    className="bg-white/5 border-white/10"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t.settings.email_read}</Label>
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
                  <Label htmlFor="phone">{t.settings.phone} <span className="text-muted-foreground text-xs">(Obligatorio código de país, ej: +57)</span></Label>
                  <Input 
                    id="phone" 
                    placeholder="+57 300 000 0000" 
                    className="bg-white/5 border-white/10"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t border-white/5 pt-6 mt-4">
                <Button className="ml-auto glow-indigo" onClick={handleUpdateProfile} disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Check size={16} className="mr-2" />}
                  {t.settings.save_profile}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-8">
          {/* Resto de contenidos... */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
