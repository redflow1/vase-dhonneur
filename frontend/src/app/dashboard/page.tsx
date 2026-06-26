"use client";

import { useEffect, useState } from "react";
import { getUser, AuthUser } from "@/lib/auth";
import { getModulesForRole, ModuleItem } from "@/lib/modules";
import Link from "next/link";
import {
  GitBranch, Users, LayoutDashboard, ClipboardList, Music,
  Megaphone, Heart, UserPlus, Wallet, Calendar, Building2,
  Network, Lock, FileText, BarChart3, Globe
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GitBranch, Users, LayoutDashboard, ClipboardList, Music,
  Megaphone, Heart, UserPlus, Wallet, Calendar, Building2,
  Network, Lock, FileText, BarChart3, Globe,
};

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);

  useEffect(() => {
    const u = getUser();
    if (u) {
      setUser(u);
      setModules(getModulesForRole(u.role));
    }
  }, []);

  if (!user) return null;

  return (
    <div>
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">
          Bienvenue, {user.firstName}
        </h1>
        <p className="text-muted mt-1">
          Tableau de bord — {user.churchName}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {modules.map((mod) => {
          const Icon = ICON_MAP[mod.icon] || LayoutDashboard;
          return (
            <Link
              key={mod.id}
              href={mod.path}
              className="group bg-card-bg border border-card-border rounded-2xl p-4 md:p-6 hover:border-gold hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-teal-muted flex items-center justify-center mb-4 group-hover:bg-gold-muted transition">
                <Icon className="w-6 h-6 text-teal-deep group-hover:text-gold transition" />
              </div>
              <h3 className="font-semibold text-foreground text-sm mb-1">
                {mod.name}
              </h3>
              <p className="text-xs text-muted">
                {mod.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
