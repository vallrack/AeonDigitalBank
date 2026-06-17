
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
  PlusCircle,
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
import { toast } from '@/hooks/use-toast';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function AdminUsersPage() {
  const { user: currentUser } = useUser();
  const db = useFirestore();
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
    balance: 5000
  });

  const usersQuery = useMemo(() => {
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: users, loading } = useCollection(usersQuery);

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const secondaryApp = getApps().find(app => app.name === 'AdminTool') || initializeApp(firebaseConfig, 'AdminTool');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        newUserData.email, 
        newUserData.password
      );
      
      const newUserId = userCredential.user.uid;

      const userDocRef = doc(db, "users", newUserId);
      const userProfile = {
        uid: newUserId,
        email: newUserData.email,
        fullName: newUserData.fullName,
        balance: Number(newUserData.balance),
        role: "user",
        kycStatus: 'Verified',
        createdAt: serverTimestamp()
      };

      await setDoc(userDocRef, userProfile);
      
      await addDoc(collection(db, "users", newUserId, "transactions"), {
        userId: newUserId,
        merchant: "Aeon Welcome Bonus",
        amount: Number(newUserData.balance),
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income"
      });

      toast({ title: "Account created successfully" });
      setRegisterOpen(false);
      setNewUserData({ fullName: '', email: '', password: '', balance: 5000 });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: error.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !depositAmount || Number(depositAmount) <= 0) return;
    setIsProcessing(true);

    const amount = Number(depositAmount);
    const userRef = doc(db, 'users', selectedUser.id);
    const txCollectionRef = collection(db, 'users', selectedUser.id, 'transactions');

    updateDoc(userRef, {
      balance: increment(amount)
    }).then(() => {
      addDoc(txCollectionRef, {
        userId: selectedUser.id,
        merchant: "Admin Manual Deposit",
        amount: amount,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income",
        reference: "Admin deposit"
      });
      toast({ title: "Deposit Processed" });
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { balance: amount }
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setDepositOpen(false);
      setDepositAmount('');
      setSelectedUser(null);
      setIsProcessing(false);
    });
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);

    const userRef = doc(db, 'users', selectedUser.id);
    const originalUser = users.find(u => u.id === selectedUser.id);
    const oldBalance = Number(originalUser?.balance || 0);
    const newBalance = Number(selectedUser.balance);
    const difference = newBalance - oldBalance;

    const updateData = {
      fullName: selectedUser.fullName,
      role: selectedUser.role || originalUser?.role || 'user',
      balance: newBalance
    };

    updateDoc(userRef, updateData)
      .then(() => {
        if (difference !== 0) {
          addDoc(collection(db, "users", selectedUser.id, "transactions"), {
            userId: selectedUser.id,
            merchant: "Admin Balance Adjustment",
            amount: Math.abs(difference),
            category: "Adjustment",
            status: "Completed",
            date: new Date().toISOString(),
            type: difference > 0 ? "income" : "expense",
            reference: "Manual adjustment by admin"
          });
        }
        toast({ title: "User updated" });
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setEditOpen(false);
        setSelectedUser(null);
        setIsProcessing(false);
      });
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Are you sure?")) return;
    
    const userRef = doc(db, 'users', userId);
    deleteDoc(userRef).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'delete'
      });
      errorEmitter.emit('permission-error', permissionError);
    });
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
            <h1 className="text-3xl font-headline font-bold">Client Management</h1>
          </div>
          <p className="text-muted-foreground">Admin panel for supervising and registering users.</p>
        </div>

        <Dialog open={registerOpen} onOpenChange={(open) => {
          setRegisterOpen(open);
          if (!open) setNewUserData({ fullName: '', email: '', password: '', balance: 5000 });
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 glow-indigo">
              <UserPlus size={16} />
              Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Register New Client</DialogTitle>
              <DialogDescription>Create a new account with an initial balance.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input 
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Initial Deposit ($)</Label>
                  <Input 
                    type="number"
                    value={newUserData.balance}
                    onChange={(e) => setNewUserData({...newUserData, balance: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full glow-indigo" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Create Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={selectedUser.fullName} onChange={e => setSelectedUser({...selectedUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Balance ($)</Label>
                <Input type="number" value={selectedUser.balance} onChange={e => setSelectedUser({...selectedUser, balance: e.target.value})} />
              </div>
              <DialogFooter><Button type="submit" disabled={isProcessing}>Save Changes</Button></DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={depositOpen} onOpenChange={(open) => {
        setDepositOpen(open);
        if (!open) {
          setSelectedUser(null);
          setDepositAmount('');
        }
      }}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Deposit Funds</DialogTitle>
            <DialogDescription>Add balance to {selectedUser?.fullName}'s account.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (USD)</Label>
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
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Confirm Deposit"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>{users.length}</CardTitle>
            <CardDescription>Total Clients</CardDescription>
          </CardHeader>
        </Card>
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>{users.filter(u => u.role === 'admin').length}</CardTitle>
            <CardDescription>Admins</CardDescription>
          </CardHeader>
        </Card>
        <Card className="glass border-white/5">
          <CardHeader>
            <CardTitle>${totalReserves.toLocaleString()}</CardTitle>
            <CardDescription>Total Reserves</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-white/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter users..." 
              className="pl-9 bg-white/5 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-muted-foreground">
            <RefreshCw size={14} className="mr-2" /> Refresh View
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className="border-white/5 hover:bg-white/5">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} /><AvatarFallback>{u.fullName?.[0]}</AvatarFallback></Avatar>
                        <div>
                          <div className="font-bold text-sm">{u.fullName}</div>
                          <Badge variant="secondary" className="text-[8px] h-3">{u.role}</Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-right font-bold text-accent">
                      ${(Number(u.balance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreVertical size={14} /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10">
                          <DropdownMenuItem onClick={() => { setSelectedUser(u); setDepositOpen(true); }}>
                            <ArrowUpCircle size={12} className="mr-2 text-emerald-400"/>Deposit Funds
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedUser(u); setEditOpen(true); }}>
                            <Edit size={12} className="mr-2"/>Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => handleDeleteUser(u.id)} className="text-destructive">
                            <Trash2 size={12} className="mr-2"/>Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
