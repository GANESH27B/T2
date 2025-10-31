'use client';

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserRole } from "@/lib/types";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNetworkStatus } from "@/hooks/use-network-status";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
      return;
    }

    if (user && firestore) {
      const checkUserRole = async () => {
        // 1. Check for admin role
        try {
          const adminDocRef = doc(firestore, "roles_admin", user.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            setRole("admin");
            const expectedPath = "/dashboard/admin";
            if (window.location.pathname !== expectedPath) {
              router.push(expectedPath);
            }
            setLoading(false);
            return;
          }
        } catch (e: any) {
          // This is expected for non-admins. We can ignore permission-denied and continue.
          if (e.code !== 'permission-denied') {
            console.error("Error checking admin role:", e);
          }
        }

        // 2. If not an admin, check for other roles in the 'users' collection.
        try {
          const facultyDocRef = doc(firestore, "users", user.uid);
          const facultyDocSnap = await getDoc(facultyDocRef);

          if (facultyDocSnap.exists()) {
            const userData = facultyDocSnap.data();
            const userRole = (userData.role as UserRole) || 'student';
            setRole(userRole);
            const expectedPath = `/dashboard/${userRole}`;
            if (window.location.pathname !== expectedPath) {
              router.push(expectedPath);
            }
          } else {
            // 3. If user document doesn't exist in either collection, log them out.
            toast({
              variant: "destructive",
              title: "Access Denied",
              description: "Your user role could not be determined.",
            });
            router.push("/login");
          }
        } catch (e: any) {
          if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: `users/${user.uid}`,
              operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
          } else {
            toast({
              variant: "destructive",
              title: "Error fetching user data",
              description: "Could not fetch user data.",
            });
          }
          router.push("/login");
        } finally {
          setLoading(false);
        }
      };

      checkUserRole();
    } else if (!userLoading) {
        setLoading(false);
    }
  }, [user, userLoading, firestore, router, toast]);

  if (loading || userLoading || !user || !role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <SidebarNav role={role} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
           <div className="flex items-center gap-2 md:hidden">
              <SidebarTrigger />
              <Shield className="w-8 h-8 text-primary" />
              <h1 className="text-xl font-semibold font-headline">AttendSync</h1>
           </div>
          <div className="flex items-center gap-2 ml-auto">
             <Badge variant={isOnline ? "outline" : "destructive"} className="hidden sm:flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                    {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></span>
                </span>
                {isOnline ? 'Online' : 'Offline'}
             </Badge>
            <ThemeToggle />
            <UserNav />
          </div>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 space-y-4">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
