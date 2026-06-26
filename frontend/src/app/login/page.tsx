"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { saveAuth, apiFetch, AuthUser } from "@/lib/auth";
import { Eye, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveAuth(data.token, data.user as AuthUser);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="bg-card-bg border border-card-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-1 text-foreground">
            Connexion
          </h1>
          <p className="text-center text-muted text-sm mb-8">
            Accedez a votre espace Vases d&apos;Honneur
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-foreground">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition pr-12"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-teal-deep hover:bg-teal-light text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-gold font-semibold hover:underline">
              Creer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
