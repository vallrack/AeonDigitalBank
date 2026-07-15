
"use client"

import React, { useMemo, useState, useEffect } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, addDoc, increment, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  UserPlus, 
  Search, 
  Loader2, 
  ShieldCheck, 
  MoreVertical,
  Edit,
  Trash2,
  ArrowUpCircle,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useI18n } from '@/lib/i18n/context';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const db = useFirestore();
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const [depositAccount, setDepositAccount] = useState<'checking' | 'savings'>('checking');
  const [kycOpen, setKycOpen] = useState(false);
  const [kycData, setKycData] = useState<{ idPhoto: string; facePhoto: string; userName: string } | null>(null);
  const [kycLoading, setKycLoading] = useState(false);

  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    checkingBalance: 0,
    savingsBalance: 0,
    role: 'user'
  });

  const [flaggedTransactions, setFlaggedTransactions] = useState<any[]>([]);
  const [loadingFlags, setLoadingFlags] = useState(false);

  const usersQuery = useMemo(() => {
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: users, loading } = useCollection(usersQuery);

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentUserData = users.find(u => u.id === currentUser?.uid);

  useEffect(() => {
    const fetchFlagged = async () => {
      if (users.length === 0) return;
      setLoadingFlags(true);
      try {
        let allFlagged: any[] = [];
        for (const u of users) {
          // Fetch pending transactions for this user
          const q = query(collection(db, 'users', u.id, 'transactions'), where('status', '==', 'pending'));
          const snap = await getDocs(q);
          snap.forEach(d => {
            allFlagged.push({ ...d.data(), id: d.id, user: u });
          });
        }
        allFlagged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFlaggedTransactions(allFlagged);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingFlags(false);
      }
    };
    fetchFlagged();
  }, [users, db]);

  const handleResolveFraud = async (tx: any, action: 'approve' | 'reject') => {
    if (!confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta transacción?`)) return;
    
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const txRef = doc(db, 'users', tx.userId, 'transactions', tx.id);
      
      if (action === 'approve') {
        // Just mark as completed, money was already deducted from checkingBalance as "held"
        batch.update(txRef, { status: 'completed', flagged: false, flagReason: 'Aprobado por Admin' });
        
        // If it was a transfer to someone else, we need to add the money to the recipient
        if (tx.recipientId) {
          const recipientRef = doc(db, 'users', tx.recipientId);
          batch.update(recipientRef, { checkingBalance: increment(tx.amount) });
        }
      } else {
        // Reject: refund the money back to the user
        const userRef = doc(db, 'users', tx.userId);
        const refundField = tx.account === 'savings' ? 'savingsBalance' : 'checkingBalance';
        batch.update(userRef, { [refundField]: increment(tx.amount) });
        
        batch.update(txRef, { status: 'failed', flagged: false, flagReason: 'Rechazado por Admin (Reembolsado)' });
      }
      
      await batch.commit();
      toast({ title: "Resolución completada exitosamente" });
      
      // Update local state temporarily so we don't have to wait for next useEffect cycle
      setFlaggedTransactions(prev => prev.filter(t => t.id !== tx.id));
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      let secondaryApp;
      try {
        secondaryApp = getApp('Secondary');
      } catch (e) {
        secondaryApp = initializeApp(getApp().options, 'Secondary');
      }
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUserData.email, 
        newUserData.password
      );
      const newUid = userCredential.user.uid;
      
      await signOut(secondaryAuth);
      
      const initChecking = Number(newUserData.checkingBalance) || 0;
      const initSavings = Number(newUserData.savingsBalance) || 0;
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: newUserData.email,
        fullName: newUserData.fullName,
        checkingBalance: initChecking,
        savingsBalance: initSavings,
        role: newUserData.role || 'user',
        kycStatus: "Verified",
        createdAt: serverTimestamp()
      });

      if (initChecking > 0) {
        await addDoc(collection(db, 'users', newUid, 'transactions'), {
          userId: newUid,
          merchant: "Admin Initial Checking Deposit",
          amount: initChecking,
          category: "Income",
          status: "Completed",
          date: new Date().toISOString(),
          type: "income",
          reference: "Initial deposit",
          account: "checking",
          network: "AEON_INTERNAL"
        });
      }
      
      if (initSavings > 0) {
        await addDoc(collection(db, 'users', newUid, 'transactions'), {
          userId: newUid,
          merchant: "Admin Initial Savings Deposit",
          amount: initSavings,
          category: "Income",
          status: "Completed",
          date: new Date().toISOString(),
          type: "income",
          reference: "Initial deposit",
          account: "savings",
          network: "AEON_INTERNAL"
        });
      }

      toast({ title: t.common.success });
      setRegisterOpen(false);
      setNewUserData({ fullName: '', email: '', password: '', checkingBalance: 0, savingsBalance: 0, role: 'user' });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewKyc = async (u: any) => {
    setKycLoading(true);
    setKycData(null);
    setKycOpen(true);
    try {
      // Try new subcollection first (kyc/documents)
      const kycSnap = await getDoc(doc(db, 'users', u.id, 'kyc', 'documents'));
      if (kycSnap.exists()) {
        const data = kycSnap.data();
        setKycData({
          idPhoto: data?.idPhoto || '',
          facePhoto: data?.facePhoto || '',
          userName: u.fullName
        });
      } else {
        // Fallback: old format stored in main user doc
        const userSnap = await getDoc(doc(db, 'users', u.id));
        const data = userSnap.data();
        setKycData({
          idPhoto: data?.kycIdPhoto || '',
          facePhoto: data?.kycFacePhoto || '',
          userName: u.fullName
        });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los documentos KYC.' });
      setKycOpen(false);
    } finally {
      setKycLoading(false);
    }
  };

  const handleActivateAccount = async (u: any) => {
    try {
      await updateDoc(doc(db, 'users', u.id), {
        status: 'active'
      });
      toast({ title: "Cuenta activada manualmente" });
      
      // Trigger welcome email
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: { email: u.email, name: u.fullName },
          type: 'welcome',
          data: {
            name: u.fullName,
            activationDate: new Date().toISOString()
          }
        })
      }).catch(console.error);
    } catch (e: any) {
      toast({ variant: "destructive", title: t.common.error, description: e.message });
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !depositAmount || Number(depositAmount) <= 0) return;
    setIsProcessing(true);

    try {
      const numAmount = Number(depositAmount);
      const userRef = doc(db, 'users', selectedUser.id);
      
      await updateDoc(userRef, {
        [depositAccount === 'checking' ? 'checkingBalance' : 'savingsBalance']: increment(numAmount)
      });
      
      await addDoc(collection(userRef, 'transactions'), {
        userId: selectedUser.id,
        merchant: "Admin Manual Deposit",
        amount: numAmount,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income",
        reference: "Admin deposit",
        account: depositAccount,
        network: "AEON_INTERNAL"
      });
      
      toast({ title: t.admin.deposit + " " + t.common.success });
      setDepositOpen(false);
      setDepositAmount('');

      // Send deposit notification email
      fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: { email: selectedUser.email, name: selectedUser.fullName },
          type: 'deposit',
          data: {
            amount: numAmount,
            account: depositAccount === 'checking' ? 'Cuenta Corriente' : 'Cuenta de Ahorros',
            date: new Date().toISOString(),
            name: selectedUser.fullName
          }
        })
      }).catch(console.error);

      setSelectedUser(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);

    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        fullName: selectedUser.fullName,
        checkingBalance: Number(selectedUser.checkingBalance ?? selectedUser.balance ?? 0),
        savingsBalance: Number(selectedUser.savingsBalance ?? 0),
        role: selectedUser.role
      });
      
      toast({ title: t.common.save + " " + t.common.success });
      setEditOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t.common.confirm + "?")) return;
    
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast({ title: t.common.success });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: error.message,
      });
    }
  };

  const totalBalances = useMemo(() => {
    return users.reduce((acc, u) => acc + (Number(u.checkingBalance ?? u.balance) || 0) + (Number(u.savingsBalance) || 0), 0);
  }, [users]);

  // Derived state to ensure real-time updates reflect in open modals
  const activeUser = selectedUser ? (users.find(u => u.id === selectedUser.id) || selectedUser) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="text-accent" size={20} />
            <h1 className="text-3xl font-headline font-bold">{t.admin.title}</h1>
          </div>
          <p className="text-muted-foreground">{t.admin.subtitle}</p>
        </div>

        {/* KYC Document Viewer Dialog */}
        <Dialog open={kycOpen} onOpenChange={(open) => {
          setKycOpen(open);
          // IMPORTANT: clear heavy base64 data from memory when dialog closes
          // to prevent UI freeze/navigation block
          if (!open) setTimeout(() => setKycData(null), 300);
        }}>
          <DialogContent className="glass border-white/10 sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Documentos KYC — {kycData?.userName}
              </DialogTitle>
              <DialogDescription>Documentos de identidad enviados durante el registro.</DialogDescription>
            </DialogHeader>
            {kycLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="animate-spin text-primary" size={36} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Documento de Identidad</p>
                  {kycData?.idPhoto && !kycData.idPhoto.startsWith('pdf:') ? (
                    <img src={kycData.idPhoto} alt="ID Document" className="w-full rounded-lg border border-white/10 object-contain max-h-72" />
                  ) : kycData?.idPhoto?.startsWith('pdf:') ? (
                    <div className="flex flex-col items-center justify-center h-40 border border-dashed border-white/20 rounded-lg text-muted-foreground gap-2">
                      <FileText size={32} />
                      <p className="text-sm">PDF subido: {kycData.idPhoto.split(':')[1]}</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 border border-dashed border-white/20 rounded-lg text-muted-foreground">
                      <p className="text-sm">Sin documento</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Selfie de Verificación</p>
                  {kycData?.facePhoto ? (
                    <img src={kycData.facePhoto} alt="Selfie" className="w-full rounded-lg border border-white/10 object-contain max-h-72" />
                  ) : (
                    <div className="flex items-center justify-center h-40 border border-dashed border-white/20 rounded-lg text-muted-foreground">
                      <p className="text-sm">Sin selfie</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={registerOpen} onOpenChange={(open) => {
          setRegisterOpen(open);
          if (!open) setNewUserData({ fullName: '', email: '', password: '', checkingBalance: 0, savingsBalance: 0, role: 'user' });
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 glow-indigo w-full md:w-auto">
              <UserPlus size={16} />
              {t.admin.add_client}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">{t.admin.add_client}</DialogTitle>
              <DialogDescription>{t.admin.create_account_desc}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>{t.admin.full_name}</Label>
                  <Input 
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.admin.email}</Label>
                  <Input 
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.admin.password}</Label>
                  <Input 
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Inicial Cheques ($)</Label>
                  <Input 
                    type="number"
                    value={newUserData.checkingBalance}
                    onChange={(e) => setNewUserData({...newUserData, checkingBalance: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Inicial Ahorros ($)</Label>
                  <Input 
                    type="number"
                    value={newUserData.savingsBalance}
                    onChange={(e) => setNewUserData({...newUserData, savingsBalance: Number(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t.admin.role || "Rol"}</Label>
                  <Select value={newUserData.role} onValueChange={(value) => setNewUserData({...newUserData, role: value})}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="user">{t.settings.client || "Cliente"}</SelectItem>
                      {currentUserData?.role === 'admin' && (
                        <>
                          <SelectItem value="coordinator">{t.admin.coordinator || "Coordinador"}</SelectItem>
                          <SelectItem value="admin">{t.settings.admin || "Admin"}</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full glow-indigo" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : t.common.confirm}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>{users.length}</CardTitle>
            <CardDescription>{t.nav.manage_clients}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>{users.filter(u => u.role === 'admin').length}</CardTitle>
            <CardDescription>{t.admin.admins}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="glass border-white/5 sm:col-span-2 md:col-span-1">
          <CardHeader>
            <CardTitle>${totalBalances.toLocaleString()}</CardTitle>
            <CardDescription>{t.admin.total_reserves}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-black/5">
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="fraud">
            Centro de Resoluciones
            {flaggedTransactions.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                {flaggedTransactions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-8">
          <Card className="glass border-white/10 shadow-xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-border/50 pb-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="font-headline text-lg">{t.admin?.users_list || "Lista de Usuarios"}</CardTitle>
                  <CardDescription>
                    {t.admin?.total_clients || "Total Clientes"}: {users.length}
                  </CardDescription>
                </div>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.admin.search_placeholder}
                    className="pl-9 bg-white border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[250px]">{t.admin.client}</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">{t.admin.checking}</TableHead>
                      <TableHead className="text-right">{t.admin.savings}</TableHead>
                      <TableHead>{t.admin.role}</TableHead>
                      <TableHead className="text-right">{t.admin.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                          {t.admin.no_users}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-primary/10">
                                <AvatarFallback className="bg-primary/5 text-primary">
                                  {u.fullName?.substring(0, 2).toUpperCase() || 'US'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold text-slate-900">{u.fullName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{u.id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-600">{u.email}</TableCell>
                          <TableCell className="text-right font-mono font-medium text-emerald-600">
                            ${(Number(u.checkingBalance ?? u.balance) || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-blue-600">
                            ${(Number(u.savingsBalance) || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant={u.role === 'admin' ? "default" : "secondary"} className={u.role === 'admin' ? "bg-accent hover:bg-accent/80" : ""}>
                                {u.role || 'user'}
                              </Badge>
                              {u.status === 'pending' && (
                                <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 text-[10px]">
                                  Pendiente
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>{t.admin.actions}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {u.status === 'pending' && (
                                  <DropdownMenuItem onClick={() => handleActivateAccount(u)} className="text-amber-600 focus:text-amber-600 focus:bg-amber-50">
                                    <ShieldAlert className="mr-2 h-4 w-4" /> Activar Ahora
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => { 
                                    // Strip heavy base64 fields to prevent crash
                                    const { kycIdPhoto, kycFacePhoto, ...safeUser } = u;
                                    setSelectedUser(safeUser); 
                                    setEditOpen(true); 
                                  }}>
                                  <Edit className="mr-2 h-4 w-4" /> {t.common.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedUser(u); setDepositOpen(true); }}>
                                  <ArrowUpCircle className="mr-2 h-4 w-4 text-emerald-500" /> {t.admin.deposit}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleViewKyc(u)} className="text-blue-600 focus:text-blue-600 focus:bg-blue-50">
                                  <FileText className="mr-2 h-4 w-4" /> Ver KYC / Documentos
                                </DropdownMenuItem>
                                {u.id !== currentUser?.uid && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleDeleteUser(u.id)} className="text-red-600 focus:text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" /> {t.common.delete}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-8">
          <Card className="glass shadow-xl overflow-hidden">
            <CardHeader className="bg-red-50 border-b border-red-100 pb-4">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle className="font-headline text-lg flex items-center gap-2 text-red-700">
                    <AlertOctagon size={20} />
                    Alertas de Fraude
                  </CardTitle>
                  <CardDescription>
                    Transacciones retenidas por el motor de prevención de fraudes.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Motivo / Tipo</TableHead>
                      <TableHead className="text-right">Monto Retenido</TableHead>
                      <TableHead className="text-right">Resolución</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingFlags ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        </TableCell>
                      </TableRow>
                    ) : flaggedTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                          No hay transacciones retenidas en este momento.
                        </TableCell>
                      </TableRow>
                    ) : (
                      flaggedTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">{tx.user?.fullName}</div>
                            <div className="text-xs text-muted-foreground">{tx.user?.email}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive" className="bg-red-500">
                                {tx.flagReason || 'Fraude Sospechoso'}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{tx.merchant}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium text-red-600">
                            ${tx.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleResolveFraud(tx, 'approve')}
                                disabled={isProcessing}
                              >
                                <CheckCircle2 size={16} className="mr-1" /> Aprobar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleResolveFraud(tx, 'reject')}
                                disabled={isProcessing}
                              >
                                <XCircle size={16} className="mr-1" /> Rechazar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Saldos</DialogTitle>
            <DialogDescription>Ajusta el balance de {activeUser?.fullName}</DialogDescription>
          </DialogHeader>
          {activeUser && (
            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.admin.name}</Label>
                <Input value={activeUser.fullName} onChange={e => setSelectedUser({...activeUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Saldo Cheques</Label>
                <Input type="number" value={activeUser.checkingBalance ?? activeUser.balance ?? 0} onChange={e => setSelectedUser({...activeUser, checkingBalance: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Saldo Ahorros</Label>
                <Input type="number" value={activeUser.savingsBalance ?? 0} onChange={e => setSelectedUser({...activeUser, savingsBalance: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.role || "Rol"}</Label>
                <Select value={activeUser.role} onValueChange={(value) => setSelectedUser({...activeUser, role: value})}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="user">{t.settings.client || "Cliente"}</SelectItem>
                    {currentUserData?.role === 'admin' && (
                      <>
                        <SelectItem value="coordinator">{t.admin.coordinator || "Coordinador"}</SelectItem>
                        <SelectItem value="admin">{t.settings.admin || "Admin"}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button type="submit" disabled={isProcessing}>{t.common.save}</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.admin.deposit}</DialogTitle>
            <DialogDescription>Añadir saldo a {activeUser?.fullName}.</DialogDescription>
          </DialogHeader>
          {activeUser && (
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.admin.current_balance}</Label>
                <div className="text-2xl font-bold text-emerald-400">
                  ${((Number(activeUser.checkingBalance ?? activeUser.balance) || 0) + (Number(activeUser.savingsBalance) || 0)).toLocaleString()}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cuenta de Destino</Label>
                <Select value={depositAccount} onValueChange={(val: 'checking' | 'savings') => setDepositAccount(val)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="checking">Cheques (Checking)</SelectItem>
                    <SelectItem value="savings">Ahorros (Savings)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.admin.amount_usd}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                  <Input 
                    type="number" 
                    className="pl-7" 
                    placeholder="0.00"
                    value={depositAmount} 
                    onChange={e => setDepositAmount(e.target.value)} 
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full glow-indigo" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : t.common.confirm}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
