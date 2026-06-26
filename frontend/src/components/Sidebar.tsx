"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ModuleItem } from "@/lib/modules";
import {
  GitBranch, Users, LayoutDashboard, ClipboardList, Music,
  Megaphone, Heart, UserPlus, Wallet, Calendar, Building2,
  Network, Lock, FileText, BarChart3, Globe, Shield, X
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GitBranch, Users, LayoutDashboard, ClipboardList, Music,
  Megaphone, Heart, UserPlus, Wallet, Calendar, Building2,
  Network, Lock, FileText, BarChart3, Globe, Shield,
};

interface SidebarProps {
  modules: ModuleItem[];
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ modules, open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  // body scroll lock on mobile when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      closeRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        role="dialog"
        aria-modal={open}
        aria-label="Navigation"
        className={`fixed top-0 left-0 z-50 h-full w-64 max-w-[85vw] bg-sidebar-bg text-sidebar-text flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:z-auto`}
      >
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Logo size="sm" showText />
          <button
            ref={closeRef}
            onClick={onClose}
            className="lg:hidden text-sidebar-text hover:text-gold"
            aria-label="Fermer la navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 overscroll-behavior-contain">
          {modules.map((mod) => {
            const Icon = ICON_MAP[mod.icon] || LayoutDashboard;
            const active = pathname === mod.path;
            return (
              <Link
                key={mod.id}
                href={mod.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-white/10 text-gold border-l-4 border-gold pl-2.5"
                    : "hover:bg-white/5 hover:text-gold border-l-4 border-transparent"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="truncate">{mod.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 text-xs text-sidebar-text/50 text-center">
          Vases d&apos;Honneur v1.0
        </div>
      </aside>
    </>
  );
}
