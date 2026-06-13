
"use client"

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, Shield, Upload, User, Fingerprint, Loader2, Camera, FileText, X } from 'lucide-react';
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
  
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  
  const idInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    dob: '',
    address: '',
    idType: 'Passport',
    idNumber: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    if (step === 1 && (!formData.email || !formData.password || !formData.fullName)) {
      toast({ variant: "destructive", title: "Faltan datos", description: "Nombre, email y clave son obligatorios." });
      return;
    }
    if (step === 2 && (!idPhoto || !facePhoto)) {
      toast({ variant: "destructive", title: "Documentos requeridos", description: "Debes subir tu ID y una selfie para continuar." });
      return;
    }
    setStep(step + 1);
  };
  
  const handlePrev = () => setStep(step - 1);

  const startVerification = async () => {
    setIsVerifying(true);
    try {
      const kycResult = await smartKycOnboarding({
        documentPhotoDataUri: idPhoto!,
        faceScanDataUri: facePhoto!,
        personalInformation: {
          fullName: formData.fullName,
          dateOfBirth: formData.dob || "1990-01-01",
          address: formData.address || "No especificada",
          documentType: formData.idType,
          documentNumber: formData.idNumber || "PENDIENTE",
          nationality: 'Global'
        }
      });

      if (!kycResult.isVerified) {
        throw new Error(`Verificación fallida: ${kycResult.verificationDetails}`);
      }

      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: formData.fullName });

      const usersRef = collection(db, "users");
      const usersSnap = await getDocs(query(usersRef, limit(1)));
      const isFirstUser = usersSnap.empty;
      const assignedRole = isFirstUser ? "admin" : "user";

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: formData.email,
        fullName: formData.fullName,
        balance: 5000.00,
        role: assignedRole,
        kycStatus: 'Verified',
        kycConfidence: kycResult.confidenceScore,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "users", user.uid, "transactions"), {
        userId: user.uid,
        merchant: "Aeon Bank Welcome Bonus",
        amount: 5000.00,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income"
      });

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
        title: assignedRole === "admin" ? "Súper Admin Configurado" : "Cuenta Creada",
        description: "Bienvenido al futuro de la banca digital.",
      });

      setStep(4);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: error.message || "No se pudo completar la verificación.",
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
              <CardTitle className="text-2xl font-headline font-bold">Datos Personales</CardTitle>
              <CardDescription>Comencemos con tu información básica.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input 
                  id="fullName" 
                  placeholder="Ej. Juan Pérez" 
                  className="bg-white/5 border-white/10"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="tu@email.com" 
                  className="bg-white/5 border-white/10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-white/5 border-white/10"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full glow-indigo group" onClick={handleNext}>
                Siguiente <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card className="glass border-white/5 animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle className="text-2xl font-headline font-bold">Verificación KYC</CardTitle>
              <CardDescription>Sube tu documento y una selfie para el análisis de IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Documento de Identidad (ID/Pasaporte)</Label>
                  <div 
                    onClick={() => idInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                      idPhoto ? "border-emerald-500 bg-emerald-500/5" : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={idInputRef}
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => handleFileChange(e, setIdPhoto)}
                    />
                    {idPhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="text-emerald-500" size={32} />
                        <span className="text-sm text-emerald-500 font-bold">Documento Cargado</span>
                        <p className="text-[10px] text-muted-foreground">Haz clic para cambiar el archivo</p>
                      </div>
                    ) : (
                      <>
                        <FileText className="text-muted-foreground mb-2" size={32} />
                        <p className="text-xs text-muted-foreground mb-4 font-medium">Sube una foto clara de tu ID</p>
                        <Button size="sm" variant="outline" className="pointer-events-none">Seleccionar Archivo</Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Selfie de Verificación</Label>
                  <div 
                    onClick={() => faceInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                      facePhoto ? "border-emerald-500 bg-emerald-500/5" : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={faceInputRef}
                      className="hidden" 
                      accept="image/*" 
                      capture="user"
                      onChange={(e) => handleFileChange(e, setFacePhoto)}
                    />
                    {facePhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="text-emerald-500" size={32} />
                        <span className="text-sm text-emerald-500 font-bold">Selfie Cargada</span>
                        <p className="text-[10px] text-muted-foreground">Haz clic para cambiar la foto</p>
                      </div>
                    ) : (
                      <>
                        <Camera className="text-muted-foreground mb-2" size={32} />
                        <p className="text-xs text-muted-foreground mb-4 font-medium">Tu rostro debe ser visible</p>
                        <Button size="sm" variant="outline" className="pointer-events-none">Tomar Foto</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={handlePrev} className="w-1/3 border-white/10">Atrás</Button>
              <Button className="w-2/3 glow-indigo" onClick={handleNext}>Continuar</Button>
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
              <CardTitle className="text-2xl font-headline font-bold">Procesando con IA</CardTitle>
              <CardDescription>Nuestra IA está verificando tus documentos en tiempo real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-sm text-center text-muted-foreground bg-white/5 p-4 rounded-xl border border-white/5">
                 Al hacer clic en finalizar, la IA comparará tu selfie con tu ID y validará tus datos para activar tu cuenta bancaria de alta precisión.
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
                    Analizando Identidad...
                  </>
                ) : (
                  "Finalizar y Activar Cuenta"
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
              <CardTitle className="text-3xl font-headline font-bold">¡Bienvenido!</CardTitle>
              <CardDescription className="text-lg">Tu cuenta Aeon está activa y verificada.</CardDescription>
            </CardHeader>
            <CardContent className="text-center p-8">
              <p className="text-muted-foreground mb-8">
                Hemos asignado un saldo inicial de <strong>$5,000.00</strong> y generado tu primera tarjeta virtual.
              </p>
              <Button className="w-full h-14 text-lg glow-indigo font-headline" asChild>
                <Link href="/login">Acceder a mi Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
