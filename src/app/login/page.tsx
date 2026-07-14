
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n/context';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const auth = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.auth.login_err_incomplete,
      });
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: t.auth.login_success,
        description: t.auth.login_success_desc,
      });
      router.push('/dashboard');
    } catch (error: any) {
      let msg = t.auth.login_err_invalid;
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        msg = t.auth.login_err_not_found;
      } else if (error.code === 'auth/wrong-password') {
        msg = t.auth.login_err_wrong_pwd;
      } else if (error.code === 'auth/invalid-email') {
        msg = t.auth.login_err_invalid_email;
      }

      setErrorMessage(msg);
      toast({
        variant: "destructive",
        title: t.common.error,
        description: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      {/* Botón de Regresar */}
      <div className="absolute top-8 left-8">
        <Button variant="ghost" asChild className="gap-2 text-muted-foreground hover:text-primary transition-colors">
          <Link href="/">
            <ArrowLeft size={18} />
            {t.common.back}
          </Link>
        </Button>
      </div>

      <div className="mb-8 flex flex-col items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center glow-indigo">
             <span className="text-primary font-headline font-bold text-2xl">A</span>
          </div>
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-headline font-bold">{t.auth.login_title}</h1>
          <p className="text-muted-foreground">{t.auth.login_subtitle}</p>
        </div>
      </div>

      <Card className="w-full max-w-md glass border-white/5">
        <form onSubmit={handleLogin}>
          <CardHeader>
            <CardTitle className="text-xl font-headline">{t.auth.login_card_title}</CardTitle>
            <CardDescription>{t.auth.login_card_desc}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive text-xs py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder={t.auth.email_ph} 
                className="bg-white/5 border-white/10" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">{t.auth.password}</Label>
                <Link href="#" className="text-xs text-primary hover:text-accent">{t.auth.forgot_password}</Link>
              </div>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  className="bg-white/5 border-white/10 pr-10" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button 
                  type="button"
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full glow-indigo group" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.auth.authenticating}
                </>
              ) : (
                <>
                  {t.common.sign_in} <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              {t.auth.no_account} <Link href="/register" className="text-primary hover:text-accent font-medium">{t.common.get_started}</Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground font-headline">
        <Shield size={14} className="text-emerald-400" />
        {t.common.bank_security}
      </div>
    </div>
  );
}
