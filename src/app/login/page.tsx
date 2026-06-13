"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen bg-[#0E1016] flex flex-col items-center justify-center p-6">
      <div className="mb-8 flex flex-col items-center gap-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center glow-indigo">
             <span className="text-white font-headline font-bold text-2xl">A</span>
          </div>
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-headline font-bold">Sign In to Aeon</h1>
          <p className="text-muted-foreground">Securely manage your precision finances.</p>
        </div>
      </div>

      <Card className="w-full max-w-md glass border-white/5">
        <CardHeader>
          <CardTitle className="text-xl font-headline">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" placeholder="name@example.com" className="bg-white/5 border-white/10" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className="text-xs text-primary hover:text-accent">Forgot Password?</Link>
            </div>
            <div className="relative">
              <Input 
                id="password" 
                type={showPassword ? "text" : "password"} 
                className="bg-white/5 border-white/10 pr-10" 
              />
              <button 
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full glow-indigo group" asChild>
            <Link href="/dashboard">
              Sign In <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
            </Link>
          </Button>
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="text-primary hover:text-accent font-medium">Get Started</Link>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground font-headline">
        <Shield size={14} className="text-emerald-400" />
        BANK-LEVEL SECURITY ENABLED
      </div>
    </div>
  );
}
