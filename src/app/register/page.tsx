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

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    dob: '',
    address: '',
    idType: 'Passport',
    idNumber: ''
  });

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const startVerification = async () => {
    setIsVerifying(true);
    try {
      // In a real app, these would be data URIs from file inputs
      const mockDocument = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const mockFace = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

      const result = await smartKycOnboarding({
        documentPhotoDataUri: mockDocument,
        faceScanDataUri: mockFace,
        personalInformation: {
          fullName: formData.fullName,
          dateOfBirth: formData.dob,
          address: formData.address,
          documentType: formData.idType,
          documentNumber: formData.idNumber,
          nationality: 'Global citizen'
        }
      });

      if (result.isVerified) {
        setStep(4);
      } else {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: result.verificationDetails || "We couldn't verify your identity. Please try again.",
        });
        setStep(2);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred during KYC processing.",
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
        {/* Progress Bar */}
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input 
                    id="dob" 
                    type="date" 
                    className="bg-white/5 border-white/10"
                    value={formData.dob}
                    onChange={(e) => setFormData({...formData, dob: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idNumber">Document ID</Label>
                  <Input 
                    id="idNumber" 
                    placeholder="E.g. Passport #" 
                    className="bg-white/5 border-white/10"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
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
              <CardDescription>We need to verify your ID and perform a facial scan for security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                  <Upload className="text-primary group-hover:text-white" size={24} />
                </div>
                <p className="font-headline font-medium mb-1">Upload ID Document</p>
                <p className="text-xs text-muted-foreground">Passport, Driver License or National ID (Max 5MB)</p>
              </div>

              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent transition-colors">
                  <Fingerprint className="text-accent group-hover:text-slate-900" size={24} />
                </div>
                <p className="font-headline font-medium mb-1">Facial Liveness Scan</p>
                <p className="text-xs text-muted-foreground">We'll use your camera to confirm it's really you.</p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={handlePrev} className="w-1/3 border-white/10">Back</Button>
              <Button className="w-2/3 glow-indigo" onClick={handleNext}>Verify Identity</Button>
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
              <CardTitle className="text-2xl font-headline font-bold">AI Verification in Progress</CardTitle>
              <CardDescription>Our GenAI Smart-KYC engine is analyzing your documents and biometric data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-medium">
                    <span>Document integrity check</span>
                    <span className="text-emerald-400">PASSED</span>
                 </div>
                 <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-full" />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-xs font-medium">
                    <span>Facial biometric matching</span>
                    <span className="text-accent">PROCESSING...</span>
                 </div>
                 <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-accent h-full w-2/3 animate-pulse" />
                 </div>
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
                    Processing with GenAI...
                  </>
                ) : (
                  "Finalize Onboarding"
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
              <CardTitle className="text-3xl font-headline font-bold">You're Verified!</CardTitle>
              <CardDescription className="text-lg">Welcome to the future of digital banking.</CardDescription>
            </CardHeader>
            <CardContent className="text-center p-8">
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Your identity has been successfully verified. You now have full access to Aeon Digital Bank's features including virtual cards and instant transfers.
              </p>
              <Button className="w-full h-14 text-lg glow-indigo font-headline" asChild>
                <Link href="/dashboard">Enter Your Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
