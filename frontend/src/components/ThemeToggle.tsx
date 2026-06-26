"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-lg hover:bg-teal-muted transition-colors"
      aria-label="Basculer le theme"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-gold" />
      ) : (
        <Moon className="w-5 h-5 text-teal-deep" />
      )}
    </button>
  );
}
