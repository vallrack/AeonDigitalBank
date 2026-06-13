"use client"

import React, { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy, doc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
  Mail,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  ShieldAlert
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
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form state for new user
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

      await setDoc(doc(db, "users", newUserId), {
        uid: newUserId,
        email: newUserData.email,
        fullName: newUserData.fullName,
        balance: Number(newUserData.balance),
        role: "user",
        kycStatus: 'Verified',
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "users", newUserId, "transactions"), {
        userId: newUserId,
        merchant: "Admin Manual Deposit",
        amount: Number(newUserData.balance),
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income"
      });

      toast({
        title: "Client Created Successfully",
        description: `User ${newUserData.fullName} has been added to Aeon Bank.`,
      });

      setRegisterOpen(false);
      setNewUserData({ fullName: '', email: '', password: '', balance: 5000 });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: error.message || "Could not create the client profile.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsProcessing(true);

    const userRef = doc(db, 'users', selectedUser.uid);
    const updateData = {
      fullName: selectedUser.fullName,
      balance: Number(selectedUser.balance),
      role: selectedUser.role
    };

    updateDoc(userRef, updateData)
      .then(() => {
        toast({ title: "User updated successfully" });
        setEditOpen(false);
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => setIsProcessing(false));
  };

  const handleDeleteUser = (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    const userRef = doc(db, 'users', userId);
    deleteDoc(userRef)
      .then(() => {
        toast({ title: "User deleted" });
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'delete'
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const openEditDialog = (user: any) => {
    setSelectedUser({ ...user });
    setEditOpen(true);
  };

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

        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 glow-indigo">
              <UserPlus size={16} />
              Add New Client
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Register New Client</DialogTitle>
              <DialogDescription>
                Create a new account with an initial balance.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateClient}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Elena Smith" 
                    className="bg-white/5 border-white/10"
                    value={newUserData.fullName}
                    onChange={(e) => setNewUserData({...newUserData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="elena@example.com" 
                    className="bg-white/5 border-white/10"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Temporary Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="bg-white/5 border-white/10"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="balance">Initial Deposit ($)</Label>
                  <Input 
                    id="balance" 
                    type="number" 
                    className="bg-white/5 border-white/10"
                    value={newUserData.balance}
                    onChange={(e) => setNewUserData({...newUserData, balance: Number(e.target.value)})}
                    required
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full glow-indigo" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Create & Activate Account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass border-white/10 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Edit Client Profile</DialogTitle>
            <DialogDescription>
              Modify user details, balance or role.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleUpdateUser}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input 
                    value={selectedUser.fullName}
                    onChange={(e) => setSelectedUser({...selectedUser, fullName: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Balance ($)</Label>
                  <Input 
                    type="number"
                    value={selectedUser.balance}
                    onChange={(e) => setSelectedUser({...selectedUser, balance: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background"
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value})}
                  >
                    <option value="user" className="bg-[#0E1016]">Standard User</option>
                    <option value="admin" className="bg-[#0E1016]">Administrator</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full glow-indigo" disabled={isProcessing}>
                  {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Clients</CardDescription>
            <CardTitle className="text-2xl font-headline">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Active Admins</CardDescription>
            <CardTitle className="text-2xl font-headline">{users.filter(u => u.role === 'admin').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="glass border-primary/5">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Total Bank Reserves</CardDescription>
            <CardTitle className="text-2xl font-headline text-accent">
              ${users.reduce((acc, u) => acc + (u.balance || 0), 0).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="glass border-primary/5">
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search clients by name or email..." 
              className="pl-10 bg-muted/30 border-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary h-10 w-10" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center p-20 text-muted-foreground">
              No clients found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent text-xs uppercase tracking-wider">
                  <TableHead>User / Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Joined Date</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.uid} className="border-border/30 hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-primary/20">
                          <AvatarImage src={`https://picsum.photos/seed/${u.uid}/100/100`} />
                          <AvatarFallback>{u.fullName?.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">{u.fullName}</span>
                          <Badge variant={u.role === 'admin' ? "default" : "secondary"} className="text-[10px] w-fit py-0 h-4">
                            {u.role?.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="opacity-50" />
                        {u.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="opacity-50" />
                        {u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-headline font-bold text-accent">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign size={14} />
                        {(u.balance || 0).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass border-white/10">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => openEditDialog(u)} className="gap-2">
                            <Edit size={14} /> Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteUser(u.uid)} className="gap-2 text-rose-400 focus:text-rose-400">
                            <Trash2 size={14} /> Delete User
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
