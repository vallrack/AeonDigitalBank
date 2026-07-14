
"use client"

import React, { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, addDoc, increment } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  RefreshCw
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

  const [newUserData, setNewUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    balance: 5000,
    role: 'user'
  });

  const usersQuery = useMemo(() => {
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: users, loading } = useCollection(usersQuery);

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentUserData = users.find(u => u.id === currentUser?.uid);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const secondaryApp = initializeApp(getApp().options, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUserData.email, 
        newUserData.password
      );
      const newUid = userCredential.user.uid;
      
      await signOut(secondaryAuth);
      
      const initBalance = Number(newUserData.balance) || 0;
      await setDoc(doc(db, 'users', newUid), {
        uid: newUid,
        email: newUserData.email,
        fullName: newUserData.fullName,
        balance: initBalance,
        role: newUserData.role || 'user',
        kycStatus: "Verified",
        createdAt: serverTimestamp()
      });

      if (initBalance > 0) {
        await addDoc(collection(db, 'users', newUid, 'transactions'), {
          userId: newUid,
          merchant: "Admin Initial Deposit",
          amount: initBalance,
          category: "Income",
          status: "Completed",
          date: new Date().toISOString(),
          type: "income",
          reference: "Initial deposit",
          network: "AEON_INTERNAL"
        });
      }

      toast({ title: t.common.success });
      setRegisterOpen(false);
      setNewUserData({ fullName: '', email: '', password: '', balance: 5000, role: 'user' });
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

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !depositAmount || Number(depositAmount) <= 0) return;
    setIsProcessing(true);

    try {
      const numAmount = Number(depositAmount);
      const userRef = doc(db, 'users', selectedUser.id);
      
      await updateDoc(userRef, {
        balance: increment(numAmount)
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
        network: "AEON_INTERNAL"
      });
      
      toast({ title: t.admin.deposit + " " + t.common.success });
      setDepositOpen(false);
      setDepositAmount('');
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
        balance: Number(selectedUser.balance),
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

  const totalReserves = useMemo(() => {
    return users.reduce((acc, u) => acc + (Number(u.balance) || 0), 0);
  }, [users]);

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

        <Dialog open={registerOpen} onOpenChange={(open) => {
          setRegisterOpen(open);
          if (!open) setNewUserData({ fullName: '', email: '', password: '', balance: 5000 });
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
                  <Label>{t.admin.initial_deposit} ($)</Label>
                  <Input 
                    type="number"
                    value={newUserData.balance}
                    onChange={(e) => setNewUserData({...newUserData, balance: Number(e.target.value)})}
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
            <CardTitle>${totalReserves.toLocaleString()}</CardTitle>
            <CardDescription>{t.admin.total_reserves}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-white/5 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t.common.search + "..."} 
              className="pl-9 bg-white/5 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-muted-foreground w-full sm:w-auto">
            <RefreshCw size={14} className="mr-2" /> {t.admin.refresh}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5">
                    <TableHead>{t.admin.col_user}</TableHead>
                    <TableHead className="hidden md:table-cell">{t.admin.col_email}</TableHead>
                    <TableHead className="text-right">{t.admin.col_balance}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className="border-white/5 hover:bg-white/5">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} />
                            <AvatarFallback className="bg-primary/20 text-primary">
                              {u.fullName?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-sm truncate max-w-[120px] sm:max-w-none">{u.fullName}</div>
                            {u.role === 'admin' && <Badge variant="outline" className="ml-0 text-[8px] h-3 border-primary text-primary">Admin</Badge>}
                            {u.role === 'coordinator' && <Badge variant="outline" className="ml-0 text-[8px] h-3 border-accent text-accent">Coord</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{u.email}</TableCell>
                      <TableCell className="text-right font-bold text-accent">
                        ${(Number(u.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreVertical size={14} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass border-white/10">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-white/10" />
                            {currentUserData?.role === 'admin' && (
                              <DropdownMenuItem onClick={() => { setSelectedUser(u); setDepositOpen(true); }}>
                                <ArrowUpCircle size={12} className="mr-2 text-emerald-400"/>{t.admin.deposit}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { setSelectedUser(u); setEditOpen(true); }}>
                              <Edit size={12} className="mr-2"/>{t.common.edit}
                            </DropdownMenuItem>
                            {currentUserData?.role === 'admin' && (
                              <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => handleDeleteUser(u.id)} className="text-destructive">
                                  <Trash2 size={12} className="mr-2"/>{t.common.delete}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{t.admin.edit_profile}</DialogTitle></DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>{t.admin.name}</Label>
                <Input value={selectedUser.fullName} onChange={e => setSelectedUser({...selectedUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.balance}</Label>
                <Input type="number" value={selectedUser.balance} onChange={e => setSelectedUser({...selectedUser, balance: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>{t.admin.role || "Rol"}</Label>
                <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}>
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

      {/* Deposit Dialog */}
      <Dialog open={depositOpen} onOpenChange={(open) => {
        setDepositOpen(open);
        if (!open) {
          setSelectedUser(null);
          setDepositAmount('');
        }
      }}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t.admin.deposit}</DialogTitle>
            <DialogDescription>{t.admin.add_balance} {selectedUser?.fullName}.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleDeposit} className="space-y-4">
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
