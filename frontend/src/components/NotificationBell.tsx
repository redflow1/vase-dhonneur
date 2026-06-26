"use client";

import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/auth";

interface Notification {
  id: string;
  title: string;
  createdAt: string;
  read: boolean;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch("/communication/notifications");
      setNotifications(Array.isArray(data) ? data : data.notifications ?? []);
    } catch {
      // silently fail — bell should not break the UI
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const recent = notifications.slice(0, 10);

  const markAllRead = async () => {
    try {
      await apiFetch("/communication/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silently fail
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-muted hover:text-teal-deep hover:bg-teal-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-card-border bg-card-bg shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border">
            <span className="text-sm font-semibold text-foreground">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-teal-deep hover:text-teal-light font-medium transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-card-border">
            {recent.length === 0 ? (
              <li className="py-8 text-center text-sm text-muted">
                Aucune notification
              </li>
            ) : (
              recent.map((n) => (
                <li
                  key={n.id}
                  className={`px-4 py-3 flex flex-col gap-0.5 ${
                    !n.read ? "bg-teal-muted/30" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-foreground leading-snug">
                    {n.title}
                  </span>
                  <span className="text-xs text-muted">
                    {formatTime(n.createdAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
