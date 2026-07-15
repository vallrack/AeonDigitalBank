
"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, CheckCircle, Shield, Upload, User, Fingerprint, Loader2, Camera, FileText, X, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { ref, uploadString } from 'firebase/storage';
import { useAuth, useFirestore } from '@/firebase';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n/context';
import { VirtualCard, CardStyleType } from '@/components/banking/virtual-card';

export default function RegisterPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const idInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    dob: '',
    address: '',
    idType: 'Passport',
    idNumber: ''
  });
  
  const cardOptions: { id: CardStyleType, name: string }[] = [
    { id: 'customized-cash', name: 'Customized Cash Rewards (Roja)' },
    { id: 'unlimited-cash', name: 'Unlimited Cash Rewards (Gris)' },
    { id: 'travel-rewards', name: 'Travel Rewards (Azul oscuro)' },
    { id: 'bankamericard', name: 'BankAmericard (Blanca)' }
  ];
  
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [idFileName, setIdFileName] = useState('');

  // Convert PDF first page to a compressed JPEG image using PDF.js
  const pdfToImage = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const scale = 1.2;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;

    await page.render({ canvasContext: ctx, viewport }).promise;
    // Compress the resulting image
    return compressImage(canvas.toDataURL('image/jpeg'), 600, 0.7);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFileName(file.name);
      if (file.type === 'application/pdf') {
        // Convert PDF first page to JPEG image
        pdfToImage(file).then(setter).catch(() => {
          // Fallback: store metadata if conversion fails
          setter(`pdf:${file.name}:${file.size}`);
        });
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setter(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Compress image to stay under Firestore 1MB doc limit
  const compressImage = (dataUrl: string, maxWidth = 400, quality = 0.6): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.auth.reg_err_cam
      });
      setIsCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setFacePhoto(dataUrl);
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        setIsCameraActive(false);
      }
    }
  };

  const handleNext = () => {
    if (step === 1 && (!formData.email || !formData.password || !formData.fullName)) {
      toast({ variant: "destructive", title: t.common.error, description: t.auth.reg_err_missing });
      return;
    }
    if (step === 2 && (!idPhoto || !facePhoto)) {
      toast({ variant: "destructive", title: t.common.error, description: t.auth.reg_err_docs });
      return;
    }
    setStep(step + 1);
  };
  
  const handlePrev = () => {
    if (isCameraActive) {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
    setStep(step - 1);
  };

  const startVerification = async () => {
    setIsVerifying(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: formData.fullName });

      // Save compressed KYC images directly to Firestore (no Storage needed)
      let compressedId = '';
      let compressedFace = '';
      // idPhoto is already an image (compressed by handleFileChange for PDFs too)
      if (idPhoto && !idPhoto.startsWith('pdf:')) {
        compressedId = await compressImage(idPhoto);
      } else if (idPhoto && idPhoto.startsWith('pdf:')) {
        compressedId = idPhoto; // fallback metadata
      }
      if (facePhoto) compressedFace = await compressImage(facePhoto);

      // Create user profile in Firestore
      const isAdmin = formData.email === 'vallrack67@gmail.com';
      const userRole = isAdmin ? 'admin' : 'user';
      
      const activationTime = new Date();
      if (!isAdmin) {
        activationTime.setHours(activationTime.getHours() + 6); // Add 6 hours for standard users
      }

      await setDoc(doc(db, 'users', user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        role: userRole,
        status: isAdmin ? 'active' : 'pending',
        activationTime: activationTime.toISOString(),
        createdAt: new Date().toISOString(),
        checkingBalance: 0,
        savingsBalance: 0,
        kycIdPhoto: compressedId,
        kycFacePhoto: compressedFace
      });

      // Generate the initial Virtual Card requested by the user
      const randomCard = "4255" + Math.floor(100000000000 + Math.random() * 900000000000).toString().substring(0, 12);
      const randomCvv = Math.floor(100 + Math.random() * 900).toString().substring(0, 3);
      
      await addDoc(collection(db, 'users', user.uid, 'virtualCards'), {
        userId: user.uid,
        cardHolder: (formData.fullName || "VALUED CUSTOMER").toUpperCase(),
        cardNumber: randomCard,
        expiryDate: "12/28",
        cvv: randomCvv,
        isFrozen: false,
        type: cardOptions[selectedCardIndex].id,
        variant: 'standard',
        createdAt: new Date().toISOString()
      });

      toast({
        title: isAdmin ? t.common.admin_mode : "Registro Completo",
        description: isAdmin 
          ? t.auth.reg_finish_info 
          : "Tu cuenta será activada en un lapso de 6 horas por seguridad.",
      });

      setStep(4);
    } catch (error: any) {
      console.error("Registration error:", error);
      
      let errorMessage = t.auth.reg_err_general;
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t.auth.reg_err_in_use;
      }

      toast({
        variant: "destructive",
        title: t.common.error,
        description: errorMessage,
      });
    } finally {
      setIsVerifying(false);
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
              <CardTitle className="text-2xl font-headline font-bold">{t.auth.reg_personal_title}</CardTitle>
              <CardDescription>{t.auth.reg_personal_desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.auth.reg_fullname}</Label>
                <Input 
                  id="fullName" 
                  placeholder={t.auth.reg_fullname_ph} 
                  className="bg-white/5 border-white/10"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder={t.auth.email_ph} 
                  className="bg-white/5 border-white/10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.password}</Label>
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
                {t.common.next} <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card className="glass border-white/5 animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle className="text-2xl font-headline font-bold">{t.auth.reg_docs_title}</CardTitle>
              <CardDescription>{t.auth.reg_docs_desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.auth.reg_id_doc}</Label>
                  <div 
                    onClick={() => idInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer h-32",
                      idPhoto ? "border-emerald-500 bg-emerald-500/5" : "border-white/10 hover:border-primary/50 hover:bg-white/5"
                    )}
                  >
                    <input 
                      type="file" 
                      ref={idInputRef}
                      className="hidden" 
                      accept="image/*,application/pdf" 
                      onChange={(e) => handleFileChange(e, setIdPhoto)}
                    />
                    {idPhoto ? (
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="text-emerald-500" size={32} />
                        <span className="text-sm text-emerald-500 font-bold">{t.auth.reg_id_uploaded}</span>
                      </div>
                    ) : (
                      <>
                        <FileText className="text-muted-foreground mb-2" size={32} />
                        <p className="text-xs text-muted-foreground font-medium">{t.auth.reg_id_upload}</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.auth.reg_selfie}</Label>
                  <div className={cn(
                    "border-2 border-dashed rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center transition-all min-h-[160px]",
                    facePhoto ? "border-emerald-500 bg-emerald-500/5" : "border-white/10 bg-white/5"
                  )}>
                    {isCameraActive ? (
                      <div className="relative w-full aspect-video bg-black">
                        <video 
                          ref={videoRef} 
                          autoPlay 
                          playsInline 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row gap-2 w-[90%] sm:w-auto justify-center">
                          <Button size="sm" onClick={takePhoto} className="glow-indigo rounded-full">
                            {t.auth.reg_selfie_capture}
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setIsCameraActive(false)} className="rounded-full">
                            {t.common.cancel}
                          </Button>
                        </div>
                      </div>
                    ) : facePhoto ? (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                        <img src={facePhoto} alt="Selfie" className="w-32 h-32 rounded-full object-cover border-2 border-emerald-500 mb-2" />
                        <span className="text-sm text-emerald-500 font-bold">{t.auth.reg_selfie_done}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-muted-foreground hover:text-primary"
                          onClick={startCamera}
                        >
                          <RefreshCw size={14} className="mr-2" /> {t.auth.reg_selfie_retake}
                        </Button>
                      </div>
                    ) : (
                      <div className="p-6 flex flex-col items-center justify-center">
                        <Camera className="text-muted-foreground mb-2" size={32} />
                        <p className="text-xs text-muted-foreground mb-4 font-medium">{t.auth.reg_selfie_desc}</p>
                        <Button size="sm" variant="outline" onClick={startCamera}>
                          <Camera className="mr-2" size={16} /> {t.auth.reg_selfie_open}
                        </Button>
                      </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={handlePrev} className="w-1/3 border-white/10">{t.common.back}</Button>
              <Button className="w-2/3 glow-indigo" onClick={handleNext} disabled={isCameraActive}>{t.common.next}</Button>
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card className="glass border-white/5 animate-in fade-in slide-in-from-right-4">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="text-primary" size={48} />
                </div>
              </div>
              <CardTitle className="text-2xl font-headline font-bold">{t.auth.reg_finish_title}</CardTitle>
              <CardDescription>{t.auth.reg_finish_desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-4">
                 <Label className="text-center block text-lg mb-2">Elige tu primera Tarjeta Virtual</Label>
                 
                 <div className="flex items-center justify-between">
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-10 w-10 shrink-0"
                     onClick={() => setSelectedCardIndex(prev => prev === 0 ? cardOptions.length - 1 : prev - 1)}
                   >
                     <ChevronLeft />
                   </Button>
                   
                   <div className="flex-1 flex flex-col items-center justify-center px-2 relative perspective-1000">
                     <VirtualCard
                        cardHolder={formData.fullName || "VALUED CUSTOMER"}
                        cardNumber="4255 •••• •••• ••••"
                        expiryDate="12/28"
                        cvv="•••"
                        type={cardOptions[selectedCardIndex].id}
                        interactive={false}
                        className="transform scale-90 sm:scale-100 transition-all duration-300 pointer-events-none mb-4"
                     />
                     <div className="text-sm font-semibold text-center text-primary mt-2">
                       {cardOptions[selectedCardIndex].name}
                     </div>
                   </div>

                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-10 w-10 shrink-0"
                     onClick={() => setSelectedCardIndex(prev => prev === cardOptions.length - 1 ? 0 : prev + 1)}
                   >
                     <ChevronRight />
                   </Button>
                 </div>
               </div>
               
               <div className="text-sm text-center text-muted-foreground bg-white/5 p-4 rounded-xl border border-white/5 mt-4">
                 {t.auth.reg_finish_info}
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
                    {t.auth.reg_activating}
                  </>
                ) : (
                  t.auth.reg_finish_btn
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
              <CardTitle className="text-3xl font-headline font-bold">{t.auth.reg_success_title}</CardTitle>
              <CardDescription className="text-lg">{t.auth.reg_success_desc}</CardDescription>
            </CardHeader>
            <CardContent className="text-center p-8">
              <p className="text-muted-foreground mb-8">
                {t.auth.reg_success_info}
              </p>
              <Button className="w-full h-14 text-lg glow-indigo font-headline" asChild>
                <Link href="/login">{t.auth.reg_access_btn}</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
