
"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, Shield, Upload, User, Fingerprint, Loader2 } from 'lucide-react';
import { smartKycOnboarding } from '@/ai/flows/smart-kyc-onboarding-flow';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, limit, addDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    dob: '',
    address: '',
    idType: 'Passport',
    idNumber: ''
  });

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const startVerification = async () => {
    if (!formData.email || !formData.password || !formData.fullName) {
      toast({
        variant: "destructive",
        title: "Required Fields",
        description: "Name, email and password are required.",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const mockImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

      await smartKycOnboarding({
        documentPhotoDataUri: mockImage,
        faceScanDataUri: mockImage,
        personalInformation: {
          fullName: formData.fullName,
          dateOfBirth: formData.dob || "1990-01-01",
          address: formData.address || "Main St 123",
          documentType: formData.idType,
          documentNumber: formData.idNumber || "ABC12345",
          nationality: 'Global'
        }
      });

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: formData.fullName });

      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(query(usersRef, limit(1)));
      const isFirstUser = usersSnap.empty;
      const assignedRole = isFirstUser ? "admin" : "user";

      // Crear perfil en Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        fullName: formData.fullName,
        balance: 5000.00,
        role: assignedRole,
        createdAt: serverTimestamp()
      });

      // Crear transacción de bienvenida
      await addDoc(collection(db, "users", user.uid, "transactions"), {
        userId: user.uid,
        merchant: "Aeon Bank Welcome",
        amount: 5000.00,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income"
      });

      // Crear primera tarjeta virtual
      await addDoc(collection(db, "users", user.uid, "virtualCards"), {
        userId: user.uid,
        cardHolder: formData.fullName.toUpperCase(),
        cardNumber: "4255" + Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        expiryDate: "12/28",
        cvv: Math.floor(100 + Math.random() * 899).toString(),
        isFrozen: false,
        type: "standard"
      });

      toast({
        title: assignedRole === "admin" ? "Super Admin Configured" : "Account Created",
        description: "Welcome to the future of banking.",
      });

      setStep(4);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: error.message || "An error occurred during registration.",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1016] flex flex-col items-center justify-center p-6">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
             <span className="text-white font-headline font-bold">A</span>
          </div>
          <span className="font-headline font-bold text-lg tracking-tight group-hover:text-primary transition-colors">AEON</span>
        </Link>
      </div>

      <div className="w-full max-w-lg">
        <div className="flex justify-between items-center mb-12 relative px-2">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 -z-10" />
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold border-2 transition-all duration-500",
                step === s ? "bg-primary border-primary text-white scale-110 glow-indigo" : 
                step > s ? "bg-accent border-accent text-slate-900" : "bg-slate-900 border-white/10 text-muted-foreground"
              )}
            >
              {step > s ? <CheckCircle size={20} /> : s}
            </div>
          ))}
        </div>

        {step === 1 && (
          <Card className="glass border-white/5 animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle className="text-2xl font-headline font-bold">Personal Details</CardTitle>
              <CardDescription>Tell us a bit about yourself to start your application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Legal Full Name</Label>
                <Input 
                  id="fullName" 
                  placeholder="John Doe" 
                  className="bg-white/5 border-white/10"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@example.com" 
                    className="bg-white/5 border-white/10"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="bg-white/5 border-white/10"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full glow-indigo group" onClick={handleNext}>
                Continue <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card className="glass border-white/5 animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle className="text-2xl font-headline font-bold">Identity Verification</CardTitle>
              <CardDescription>We'll simulate the KYC upload for this demonstration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center group cursor-default">
                <Upload className="text-primary mb-4" size={24} />
                <p className="font-headline font-medium">Document Simulation Ready</p>
                <p className="text-xs text-muted-foreground">The AI will process a standard template.</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={handlePrev} className="w-1/3 border-white/10">Back</Button>
              <Button className="w-2/3 glow-indigo" onClick={handleNext}>Process Verification</Button>
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card className="glass border-white/5 animate-in fade-in slide-in-from-right-4">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Shield className="text-primary" size={32} />
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl font-headline font-bold">AI Processing</CardTitle>
              <CardDescription>Finalizing your biometric and data analysis.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-sm text-center text-muted-foreground">
                 Clicking finalize will create your real account and assign a precision bank account and your first virtual card.
               </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full glow-indigo" 
                disabled={isVerifying} 
                onClick={startVerification}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning Account...
                  </>
                ) : (
                  "Finalize & Access AEON"
                )}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 4 && (
          <Card className="glass border-white/5 animate-in fade-in zoom-in-95 duration-700">
            <CardHeader className="text-center pb-0">
              <div className="w-20 h-20 bg-emerald-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="text-emerald-400" size={40} />
              </div>
              <CardTitle className="text-3xl font-headline font-bold">Success!</CardTitle>
              <CardDescription className="text-lg">Your precision bank account is active.</CardDescription>
            </CardHeader>
            <CardContent className="text-center p-8">
              <p className="text-muted-foreground mb-8">
                Your account for <strong>{formData.email}</strong> is ready with a $5,000 credit.
              </p>
              <Button className="w-full h-14 text-lg glow-indigo font-headline" asChild>
                <Link href="/login">Go to Login</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
