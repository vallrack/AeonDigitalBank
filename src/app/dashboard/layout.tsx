
'use client';

import React, { useMemo, useEffect, useRef } from 'react';
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
  ShieldAlert,
  Languages,
  PanelLeft
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
  SidebarGroupContent,
  useSidebar
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IncognitoProvider, useIncognito } from '@/components/incognito-context';
import { useI18n } from '@/lib/i18n/context';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser, useDoc, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDocs, collection, query, limit, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function TopNav({ userData }: { userData: any }) {
  const { isIncognito, toggleIncognito } = useIncognito();
  const { user } = useUser();
  const { language, setLanguage, t } = useI18n();
  const { toggleSidebar } = useSidebar();
  
  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-background/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleSidebar}
          className="md:flex"
        >
          <PanelLeft size={20} />
        </Button>
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t.common.search + " AEON..."} 
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {userData?.role === 'admin' && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-accent/20 border border-accent/30 rounded-full text-[10px] font-bold text-accent uppercase tracking-wider animate-pulse">
            <ShieldAlert size={12} />
            {t.common.admin_mode}
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Languages size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass border-white/10">
            <DropdownMenuItem onClick={() => setLanguage('es')} className={language === 'es' ? 'bg-primary/20' : ''}>
              Español 🇪🇸
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-primary/20' : ''}>
              English 🇺🇸
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
  const { t } = useI18n();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {}
  };

  const menuItems = [
    { icon: LayoutDashboard, label: t.nav.dashboard, href: '/dashboard' },
    { icon: ArrowRightLeft, label: t.nav.transfers, href: '/dashboard/transfers' },
    { icon: CreditCard, label: t.nav.cards, href: '/dashboard/cards' },
    { icon: History, label: t.nav.activity, href: '/dashboard/activity' },
  ];

  const secondaryItems = [
    { icon: ShieldCheck, label: t.nav.security, href: '/dashboard/security' },
    { icon: Settings, label: t.nav.settings, href: '/dashboard/settings' },
  ];

  const isAdmin = userData?.role === 'admin';

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground font-headline font-bold">A</span>
          </div>
          <span className="font-headline font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">
            AEON <span className="text-accent">BANK</span>
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{t.nav.banking}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={isActive ? "bg-primary/10 text-primary font-bold" : ""}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-accent font-bold group-data-[collapsible=icon]:hidden">{t.nav.administration}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === '/dashboard/admin'}
                    tooltip={t.nav.manage_clients}
                    className={pathname === '/dashboard/admin' ? "bg-accent/10 text-accent font-bold" : "text-accent/80 hover:bg-accent/5"}
                  >
                    <Link href="/dashboard/admin">
                      <Users />
                      <span>{t.nav.manage_clients}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">{t.nav.support}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={isActive ? "bg-muted/50 text-foreground" : ""}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
              tooltip={t.nav.sign_out}
            >
              <LogOut />
              <span>{t.nav.sign_out}</span>
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
  const initializingRef = useRef(false);

  const userRef = useMemo(() => (user ? doc(db, 'users', user.uid) : null), [db, user]);
  const { data: userData, loading: docLoading } = useDoc(userRef);

  useEffect(() => {
    if (!userLoading && user && !docLoading && !userData && !initializingRef.current) {
      const initializeProfile = async () => {
        initializingRef.current = true;
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            initializingRef.current = false;
            return;
          }

          let isFirstUser = false;
          try {
            const usersSnap = await getDocs(query(collection(db, "users"), limit(1)));
            isFirstUser = usersSnap.empty;
          } catch (e) {}

          const finalRole = (isFirstUser || user.email === 'vallrack67@gmail.com') ? 'admin' : 'user';
          
          const profileData = {
            uid: user.uid,
            email: user.email,
            fullName: user.displayName || user.email?.split('@')[0] || 'New Client',
            balance: 5000,
            role: finalRole,
            createdAt: serverTimestamp(),
            kycStatus: 'Verified'
          };

          await setDoc(doc(db, "users", user.uid), profileData);
        } catch (error: any) {
          const permissionError = new FirestorePermissionError({
            path: `users/${user.uid}`,
            operation: 'create',
          });
          errorEmitter.emit('permission-error', permissionError);
        } finally {
          initializingRef.current = false;
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
