
"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Fingerprint, Smartphone, History, Lock, Key, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { updatePassword } from 'firebase/auth';

export default function SecurityPage() {
  const { user } = useUser();
  const auth = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({ 
        variant: "destructive", 
        title: "Weak password", 
        description: "Password must be at least 6 characters." 
      });
      return;
    }

    setIsUpdating(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        toast({ title: "Password updated successfully" });
        setNewPassword('');
      }
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Security Error", 
        description: "Please re-authenticate to change your password." 
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-headline font-bold">Security Center</h1>
        <p className="text-muted-foreground">Manage your account protection and authentication methods.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="text-primary" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Change Password</CardTitle>
              </div>
              <CardDescription>Update your login credentials regularly for better security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">New Password</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="new-pass" 
                    type="password" 
                    placeholder="Min. 6 characters" 
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
                {isUpdating ? "Updating..." : "Update Password"}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="text-accent" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Two-Factor Authentication</CardTitle>
              </div>
              <CardDescription>Add an extra layer of security to your account access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">SMS Verification</Label>
                  <p className="text-xs text-muted-foreground">Receive a code on your mobile phone.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Authenticator App</Label>
                  <p className="text-xs text-muted-foreground">Use Google or Microsoft Authenticator.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Fingerprint className="text-primary" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Biometric Access</CardTitle>
              </div>
              <CardDescription>Use FaceID or TouchID for quick and secure logins.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Biometrics</Label>
                  <p className="text-xs text-muted-foreground">Available on supported devices.</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/5">
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <History className="text-muted-foreground" size={20} />
                <CardTitle className="text-xl font-headline font-bold">Recent Activity</CardTitle>
              </div>
              <CardDescription>Monitor recent login attempts to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { device: 'MacBook Pro (Chrome)', location: 'Madrid, ES', time: 'Just now', status: 'Success' },
                  { device: 'iPhone 15 (Safari)', location: 'Madrid, ES', time: '2 hours ago', status: 'Success' },
                  { device: 'Unknown Device', location: 'Unknown', time: 'Yesterday', status: 'Failed' },
                ].map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{session.device}</span>
                      <span className="text-[10px] text-muted-foreground">{session.location} • {session.time}</span>
                    </div>
                    <Badge variant={session.status === 'Success' ? "secondary" : "destructive"} className="text-[10px] h-4">
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
