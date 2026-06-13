
"use client"

import React, { useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  CreditCard, 
  History, 
  Settings, 
  ShieldCheck, 
  LogOut,
  Bell,
  Eye,
  EyeOff,
  Search,
  Users,
  ShieldAlert
} from 'lucide-react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IncognitoProvider, useIncognito } from '@/components/incognito-context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useDoc, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDocs, collection, query, limit, setDoc, serverTimestamp } from 'firebase/firestore';

function TopNav({ userData }: { userData: any }) {
  const { isIncognito, toggleIncognito } = useIncognito();
  const { user } = useUser();
  
  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search transactions..." 
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {userData?.role === 'admin' && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-accent/20 border border-accent/30 rounded-full text-[10px] font-bold text-accent uppercase tracking-wider animate-pulse">
            <ShieldAlert size={12} />
            Admin Mode
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleIncognito}
          className="text-muted-foreground hover:text-accent"
        >
          {isIncognito ? <EyeOff size={20} /> : <Eye size={20} />}
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        </Button>
        <Avatar className="h-8 w-8 border border-primary/20">
          <AvatarImage src={`https://picsum.photos/seed/${user?.uid || 'aeon'}/100/100`} />
          <AvatarFallback>{user?.email?.substring(0,2).toUpperCase() || 'AD'}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function DashboardSidebar({ userData }: { userData: any }) {
  const pathname = usePathname();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: ArrowRightLeft, label: 'Transfers', href: '/dashboard/transfers' },
    { icon: CreditCard, label: 'Virtual Cards', href: '/dashboard/cards' },
    { icon: History, label: 'Activity', href: '/dashboard/activity' },
  ];

  const secondaryItems = [
    { icon: ShieldCheck, label: 'Security', href: '/dashboard/security' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  const isAdmin = userData?.role === 'admin';

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-headline font-bold">A</span>
          </div>
          <span className="font-headline font-bold text-lg tracking-tight">
            AEON <span className="text-accent">BANK</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Banking</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={pathname === item.href ? "bg-primary/10 text-primary" : ""}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-accent font-bold">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/dashboard/admin'}
                    tooltip="User Management"
                    className={pathname === '/dashboard/admin' ? "bg-accent/10 text-accent font-bold" : "text-accent/80 hover:bg-accent/5"}
                  >
                    <Link href="/dashboard/admin">
                      <Users />
                      <span>Manage Clients</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className={pathname === item.href ? "bg-muted/50 text-foreground" : ""}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleSignOut}
              className="text-destructive hover:bg-destructive/10"
            >
              <LogOut />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function RootDashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData, loading: docLoading } = useDoc(userRef);

  // Lógica de inicialización de perfil
  useEffect(() => {
    if (!userLoading && user && !docLoading && !userData) {
      const initializeProfile = async () => {
        try {
          const usersSnap = await getDocs(query(collection(db, "users"), limit(1)));
          const isFirstUser = usersSnap.empty;
          
          await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || user.email?.split('@')[0] || 'New User',
            balance: 5000,
            role: isFirstUser ? 'admin' : 'user',
            createdAt: serverTimestamp(),
            kycStatus: 'Verified'
          });
        } catch (e) {
          console.error("Error initializing profile:", e);
        }
      };
      initializeProfile();
    }
  }, [user, userData, userLoading, docLoading, db]);

  return (
    <IncognitoProvider>
      <SidebarProvider defaultOpen={true}>
        <DashboardSidebar userData={userData} />
        <SidebarInset>
          <TopNav userData={userData} />
          <main className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </IncognitoProvider>
  );
}
