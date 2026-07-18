
"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Fingerprint, Smartphone, History, Lock, Key, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore, useDoc } from '@/firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n/context';
import { registerBiometrics, encryptLocalData } from '@/lib/webauthn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function SecurityPage() {
  const { user } = useUser();
  const auth = useAuth();
  const { t } = useI18n();
  const db = useFirestore();
  const userDocRef = useMemo(() => user ? doc(db, 'users', user.uid) : null, [db, user]);
  const { data: userData } = useDoc(userDocRef);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [bioPasswordOpen, setBioPasswordOpen] = useState(false);
  const [bioPassword, setBioPassword] = useState('');

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: t.security.err_weak_pass 
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        toast({ title: t.security.success_pass });
        setNewPassword('');
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: t.common.error, 
        description: t.security.err_reauth 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleBiometrics = async (checked: boolean) => {
    if (!user) return;
    
    if (checked) {
      // Turn ON biometrics requires password confirmation first
      setBioPasswordOpen(true);
      return;
    }

    // Turn OFF biometrics
    setIsBioLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        biometricsEnabled: false,
        biometricCredentialId: null
      });
      localStorage.removeItem('AeonBank_BioAuth');
      toast({ title: "Biometría Desactivada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error, description: error.message });
    } finally {
      setIsBioLoading(false);
    }
  };

  const handleToggleSms = async (checked: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { smsAuthEnabled: checked });
      toast({ title: t.common.success, description: "Preferencia de SMS actualizada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error, description: error.message });
    }
  };

  const handleToggleAuthApp = async (checked: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { authAppEnabled: checked });
      toast({ title: t.common.success, description: "Preferencia de Auth App actualizada" });
    } catch (error: any) {
      toast({ variant: "destructive", title: t.common.error, description: error.message });
    }
  };

  const handleConfirmBioPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    
    setIsBioLoading(true);
    try {
      // 1. Verify password is correct by re-authenticating
      await signInWithEmailAndPassword(auth, user.email, bioPassword);
      
      // 2. Register WebAuthn passkey
      const credentialId = await registerBiometrics(user.uid, user.email);
      
      // 3. Update Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        biometricsEnabled: true,
        biometricCredentialId: credentialId
      });

      // 4. Store encrypted credential locally
      const encryptedPassword = encryptLocalData(bioPassword);
      localStorage.setItem('AeonBank_BioAuth', JSON.stringify({
        email: user.email,
        enc: encryptedPassword,
        id: credentialId
      }));

      toast({ title: "Biometría Activada", description: "Tu dispositivo ha sido enlazado exitosamente." });
      setBioPasswordOpen(false);
      setBioPassword('');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error de Verificación",
        description: "Contraseña incorrecta o registro biométrico cancelado."
      });
    } finally {
      setIsBioLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-headline font-bold">{t.security.title}</h1>
        <p className="text-muted-foreground">{t.security.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="text-primary" size={20} />
                <CardTitle className="text-xl font-headline font-bold">{t.security.change_password}</CardTitle>
              </div>
              <CardDescription>{t.security.change_password_desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">{t.security.new_password}</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="new-pass" 
                    type="password" 
                    placeholder={t.security.new_password_ph} 
                    className="pl-10 bg-white/5 border-white/10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                className="w-full glow-indigo" 
                onClick={handleUpdatePassword}
                disabled={isUpdating}
              >
                {isUpdating ? t.security.updating : t.security.update_password}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="text-accent" size={20} />
                <CardTitle className="text-xl font-headline font-bold">{t.security.tfa}</CardTitle>
              </div>
              <CardDescription>{t.security.tfa_desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t.security.sms}</Label>
                  <p className="text-xs text-muted-foreground">{t.security.sms_desc}</p>
                </div>
                <Switch 
                  checked={!!userData?.smsAuthEnabled}
                  onCheckedChange={handleToggleSms}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t.security.auth_app}</Label>
                  <p className="text-xs text-muted-foreground">{t.security.auth_app_desc}</p>
                </div>
                <Switch 
                  checked={!!userData?.authAppEnabled}
                  onCheckedChange={handleToggleAuthApp}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint className="text-primary" size={20} />
                <CardTitle className="text-xl font-headline font-bold">{t.security.biometrics}</CardTitle>
              </div>
              <CardDescription>{t.security.biometrics_desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">{t.security.enable_biometrics}</Label>
                  <p className="text-xs text-muted-foreground">{t.security.enable_biometrics_desc}</p>
                </div>
                <Switch 
                  checked={!!userData?.biometricsEnabled}
                  onCheckedChange={handleToggleBiometrics}
                  disabled={isBioLoading}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <History className="text-muted-foreground" size={20} />
                <CardTitle className="text-xl font-headline font-bold">{t.security.recent}</CardTitle>
              </div>
              <CardDescription>{t.security.recent_desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { device: 'MacBook Pro (Chrome)', location: 'Madrid, ES', time: t.security.just_now, status: 'Success' },
                  { device: 'iPhone 15 (Safari)', location: 'Madrid, ES', time: t.security.hours_ago, status: 'Success' },
                  { device: t.security.unknown_device, location: t.security.unknown_loc, time: t.security.yesterday, status: 'Failed' },
                ].map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{session.device}</span>
                      <span className="text-[10px] text-muted-foreground">{session.location} • {session.time}</span>
                    </div>
                    <Badge variant={session.status === 'Success' ? "secondary" : "destructive"} className="text-[10px] h-4">
                      {session.status === 'Success' ? t.security.success : t.security.failed}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={bioPasswordOpen} onOpenChange={setBioPasswordOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Identidad</DialogTitle>
            <DialogDescription>
              Por seguridad, ingresa tu contraseña actual para habilitar el acceso con huella o rostro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmBioPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input 
                type="password" 
                value={bioPassword} 
                onChange={e => setBioPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBioPasswordOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isBioLoading} className="glow-indigo">
                {isBioLoading ? "Verificando..." : "Confirmar y Activar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
