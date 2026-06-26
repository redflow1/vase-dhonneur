"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getUser, clearAuth, AuthUser } from "@/lib/auth";
import { getModulesForRole, ModuleItem } from "@/lib/modules";
import { Menu, LogOut } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    setModules(getModulesForRole(u.role));
  }, [router]);

  const handleLogout = () => {
    clearAuth();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar modules={modules} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 md:h-16 border-b border-card-border bg-card-bg flex items-center justify-between px-3 md:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-teal-muted rounded-lg transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted">{user.churchName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-teal-muted transition text-muted hover:text-foreground"
              title="Deconnexion"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
