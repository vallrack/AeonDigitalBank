
"use client"

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useI18n } from '@/lib/i18n/context';
import { VirtualCard } from '@/components/banking/virtual-card';
import { decryptLocalData } from '@/lib/webauthn';
import { Fingerprint } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bioAuthData, setBioAuthData] = useState<{ email: string, enc: string, id: string } | null>(null);
  const [isBioLoading, setIsBioLoading] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);
  const auth = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    const stored = localStorage.getItem('AeonBank_BioAuth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setBioAuthData(parsed);
        setEmail(parsed.email); // Pre-fill email
      } catch (e) {
        localStorage.removeItem('AeonBank_BioAuth');
      }
    }
  }, []);

  const handleBiometricLogin = async () => {
    if (!bioAuthData) return;
    setIsBioLoading(true);
    setErrorMessage(null);

    try {
      if (!window.PublicKeyCredential) throw new Error('Biometría no soportada');
      
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32), // Dummy challenge for demo
          allowCredentials: [{
            id: Uint8Array.from(atob(bioAuthData.id), c => c.charCodeAt(0)),
            type: 'public-key'
          }],
          timeout: 60000,
          userVerification: 'required'
        }
      });

      if (credential) {
        const dec = decryptLocalData(bioAuthData.enc);
        if (!dec) throw new Error('Error de desencriptación local');
        
        await signInWithEmailAndPassword(auth, bioAuthData.email, dec);
        
        toast({ title: t.auth.login_success, description: "Sesión iniciada con huella dactilar" });
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage("La verificación biométrica falló o fue cancelada. Por favor, ingresa tu contraseña.");
      setShowPasswordFallback(true);
      toast({ variant: "destructive", title: "Biometría cancelada", description: "Por favor, usa tu contraseña." });
    } finally {
      setIsBioLoading(false);
    }
  };

  const handleClearBiometrics = () => {
    localStorage.removeItem('AeonBank_BioAuth');
    setBioAuthData(null);
  };

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
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      
      {/* LEFT COLUMN - LOGIN BOX */}
      <div className="w-full lg:w-[400px] xl:w-[450px] bg-white flex flex-col p-8 lg:p-12 shadow-2xl z-10 relative">
        {/* Botón de Regresar */}
        <div className="absolute top-4 left-4">
          <Button variant="ghost" asChild className="gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <Link href="/">
              <ArrowLeft size={16} /> Volver
            </Link>
          </Button>
        </div>

        <div className="w-full max-w-sm mx-auto mt-8">
          {/* Top Red Bar simulation */}
          <div className="w-full flex items-center mb-6">
            <div className="h-[3px] w-1/3 bg-[#E31837]" />
            <div className="h-[3px] w-2/3 bg-slate-800" />
          </div>
          
          <h1 className="text-3xl font-light text-slate-800 mb-8 tracking-tight">Bank of Americans</h1>
          
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMessage && (
              <Alert variant="destructive" className="bg-red-50 text-red-700 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
            
            {bioAuthData && !showPasswordFallback ? (
              <div className="flex flex-col items-center justify-center space-y-6 py-6">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                  <Fingerprint size={40} />
                </div>
                <div className="text-center">
                  <p className="text-slate-500 text-sm mb-1">Bienvenido de nuevo</p>
                  <p className="text-lg font-medium text-slate-800">{bioAuthData.email}</p>
                </div>
                <Button 
                  type="button" 
                  onClick={handleBiometricLogin}
                  disabled={isBioLoading}
                  className="w-full bg-[#012169] hover:bg-[#001440] text-white py-6 text-base rounded-md font-semibold transition-colors shadow-md gap-2"
                >
                  {isBioLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Fingerprint className="h-5 w-5" />}
                  Iniciar sesión con Huella
                </Button>
                
                <div className="flex flex-col gap-2 mt-4 items-center w-full">
                  <button 
                    type="button" 
                    onClick={() => setShowPasswordFallback(true)}
                    className="text-sm text-[#012169] hover:underline"
                  >
                    Usar mi contraseña
                  </button>
                  <button 
                    type="button" 
                    onClick={handleClearBiometrics}
                    className="text-xs text-slate-400 hover:text-slate-600 underline mt-2"
                  >
                    Ingresar con otra cuenta (Borrar biometría)
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-slate-700 font-semibold text-xs tracking-wider">ID de usuario</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    className="bg-white border-slate-300 text-slate-900 focus-visible:ring-1 focus-visible:ring-[#012169] rounded-sm py-5" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-slate-700 font-semibold text-xs tracking-wider">Contraseña</Label>
                  <Input 
                    id="password" 
                    type="password"
                    className="bg-white border-slate-300 text-slate-900 focus-visible:ring-1 focus-visible:ring-[#012169] rounded-sm py-5" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <input type="checkbox" id="saveId" className="rounded-sm border-slate-400 w-4 h-4 text-[#012169] focus:ring-[#012169]" />
                  <label htmlFor="saveId" className="text-sm text-slate-700">Guardar ID de usuario</label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-[#012169] hover:bg-[#001440] text-white py-6 text-base rounded-md font-semibold transition-colors mt-6 shadow-md" 
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Iniciar una sesión'}
                </Button>
                
                <div className="flex flex-wrap items-center gap-3 text-xs mt-6 px-1">
                  <Link href="#" className="text-[#012169] hover:underline">Olvidé la ID/Contraseña</Link>
                  <span className="text-slate-300">|</span>
                  <Link href="#" className="text-[#012169] hover:underline">Seguridad y ayuda</Link>
                  <span className="text-slate-300">|</span>
                  <Link href="/register" className="text-[#012169] hover:underline">Inscribirse</Link>
                </div>
                
                <div className="mt-8 pt-8 border-t border-slate-200">
                   <Button variant="outline" className="w-full border-slate-300 text-[#012169] hover:bg-slate-50 py-6 font-semibold rounded-md shadow-sm" asChild>
                     <Link href="/register">Abrir una cuenta</Link>
                   </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* RIGHT COLUMN - PROMOTIONS */}
      <div className="flex-1 bg-gradient-to-br from-[#012169] via-[#0b3896] to-[#012169] p-8 lg:p-12 xl:p-16 flex flex-col justify-center min-h-screen">
        <div className="max-w-6xl mx-auto w-full">
          <h2 className="text-3xl md:text-4xl font-light text-white mb-16 text-center lg:text-left">
            Elija la tarjeta que funcione para usted
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-4">
            
            {/* Card 1 */}
            <div className="flex flex-col items-center gap-5">
              <div className="text-center text-white h-28 flex flex-col justify-end">
                <div className="text-6xl font-light mb-1">6<span className="text-3xl">%</span></div>
                <p className="text-[13px] leading-tight">de oferta en reembolsos<br/>de dinero en efectivo<br/><span className="text-[11px] opacity-80 mt-1 block">Sin cuota anual.</span></p>
              </div>
              <div className="w-full max-w-[260px]">
                <VirtualCard 
                  cardHolder="VALUED CUSTOMER" 
                  cardNumber="4123 4567 8901 2345" 
                  expiryDate="12/28" 
                  cvv="123" 
                  type="customized-cash" 
                  showNumbersOnFront={false}
                  interactive={false}
                />
              </div>
              <div className="text-white text-sm mt-1 text-center">Customized Cash Rewards</div>
              <div className="bg-white text-[#012169] font-bold text-sm text-center py-2.5 px-4 rounded w-full max-w-[260px] shadow-sm">
                $200 de oferta de<br/>bonificación en línea
              </div>
            </div>

            {/* Card 2 */}
            <div className="flex flex-col items-center gap-5">
              <div className="text-center text-white h-28 flex flex-col justify-end">
                <div className="text-6xl font-light mb-1">2<span className="text-3xl">%</span></div>
                <p className="text-[13px] leading-tight">de oferta en reembolsos<br/>de dinero en efectivo<br/><span className="text-[11px] opacity-80 mt-1 block">Sin cuota anual.</span></p>
              </div>
              <div className="w-full max-w-[260px]">
                <VirtualCard 
                  cardHolder="VALUED CUSTOMER" 
                  cardNumber="4812 3456 7890 1234" 
                  expiryDate="08/27" 
                  cvv="456" 
                  type="unlimited-cash" 
                  showNumbersOnFront={false}
                  interactive={false}
                />
              </div>
              <div className="text-white text-sm mt-1 text-center">Unlimited Cash Rewards</div>
              <div className="bg-white text-[#012169] font-bold text-sm text-center py-2.5 px-4 rounded w-full max-w-[260px] shadow-sm">
                $200 de oferta de<br/>bonificación en línea
              </div>
            </div>

            {/* Card 3 */}
            <div className="flex flex-col items-center gap-5">
              <div className="text-center text-white h-28 flex flex-col justify-end">
                <div className="text-6xl font-light mb-1">1.5</div>
                <p className="text-[13px] leading-tight">puntos por cada $1<br/><br/><span className="text-[11px] opacity-80 mt-1 block">Sin cuota anual.</span></p>
              </div>
              <div className="w-full max-w-[260px]">
                <VirtualCard 
                  cardHolder="VALUED CUSTOMER" 
                  cardNumber="4555 6789 0123 4567" 
                  expiryDate="11/29" 
                  cvv="789" 
                  type="travel-rewards" 
                  showNumbersOnFront={false}
                  interactive={false}
                />
              </div>
              <div className="text-white text-sm mt-1 text-center">Travel Rewards</div>
              <div className="bg-white text-[#012169] font-bold text-sm text-center py-2.5 px-4 rounded w-full max-w-[260px] shadow-sm">
                25,000 puntos de oferta de<br/>bonificación en línea
              </div>
            </div>

            {/* Card 4 */}
            <div className="flex flex-col items-center gap-5">
              <div className="text-center text-white h-28 flex flex-col justify-end">
                <div className="text-6xl font-light mb-1">0<span className="text-3xl">%</span></div>
                <p className="text-[13px] leading-tight">oferta de Tasa<br/>APR introductoria<br/><span className="text-[11px] opacity-80 mt-1 block">Sin cuota anual.</span></p>
              </div>
              <div className="w-full max-w-[260px]">
                <VirtualCard 
                  cardHolder="VALUED CUSTOMER" 
                  cardNumber="5123 4567 8901 2345" 
                  expiryDate="05/26" 
                  cvv="012" 
                  type="bankamericard" 
                  showNumbersOnFront={false}
                  interactive={false}
                />
              </div>
              <div className="text-white text-sm mt-1 text-center">BankAmericard®</div>
              <div className="bg-white text-[#012169] font-bold text-[13px] leading-snug text-center py-2 px-3 rounded w-full max-w-[260px] shadow-sm">
                Oferta de Tasa APR<br/>introductoria durante 21<br/>ciclos de facturación
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
