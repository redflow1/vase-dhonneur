"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { saveAuth, apiFetch, AuthUser } from "@/lib/auth";
import { ROLE_LABELS, Role } from "@/lib/modules";
import { Eye, EyeOff, UserPlus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import Link from "next/link";

interface Church {
  id: string;
  name: string;
  city: string;
}

const STEPS = ["Informations personnelles", "Eglise", "Role"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [churches, setChurches] = useState<Church[]>([]);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [churchName, setChurchName] = useState("");
  const [churchCity, setChurchCity] = useState("");
  const [parentChurchId, setParentChurchId] = useState("");

  // Step 3
  const [role, setRole] = useState<Role>("MEMBRE");

  useEffect(() => {
    apiFetch("/auth/churches").then(setChurches).catch(() => {});
  }, []);

  const canNext = () => {
    if (step === 0) return firstName && lastName && email && password.length >= 6;
    if (step === 1) return churchName && churchCity;
    return true;
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          churchName,
          churchCity,
          parentChurchId: parentChurchId || null,
          role,
        }),
      });
      saveAuth(data.token, data.user as AuthUser);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        <div className="bg-card-bg border border-card-border rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-center mb-1 text-foreground">
            Creer un compte
          </h1>
          <p className="text-center text-muted text-sm mb-6">
            Rejoignez le reseau Vases d&apos;Honneur
          </p>

          {/* Stepper */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    i < step
                      ? "bg-gold text-white"
                      : i === step
                      ? "bg-teal-deep text-white"
                      : "bg-teal-muted text-muted"
                  }`}
                >
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 ${i < step ? "bg-gold" : "bg-card-border"}`} />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Prenom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                    placeholder="Dupont"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                  placeholder="votre@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition pr-12"
                    placeholder="6 caracteres minimum"
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
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom de l&apos;eglise</label>
                <input
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                  placeholder="Eglise Vases d'Honneur de..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Ville</label>
                <input
                  type="text"
                  value={churchCity}
                  onChange={(e) => setChurchCity(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                  placeholder="Douala, Yaounde..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Eglise mere <span className="text-muted font-normal">(optionnel)</span>
                </label>
                <select
                  value={parentChurchId}
                  onChange={(e) => setParentChurchId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold transition"
                >
                  <option value="">-- Aucune (eglise fondatrice) --</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Votre role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold transition"
                >
                  {(Object.entries(ROLE_LABELS) as [Role, string][])
                    .filter(([key]) => key !== "SUPER_ADMIN" && key !== "ADMIN")
                    .map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-4 rounded-xl bg-teal-muted border border-card-border">
                <p className="text-sm text-muted">
                  Le role determine les modules auxquels vous aurez acces.
                  Un administrateur d&apos;eglise pourra modifier votre role par la suite.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl border border-card-border text-foreground hover:bg-teal-muted transition font-medium text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
            ) : (
              <div />
            )}

            {step < 2 ? (
              <button
                onClick={() => canNext() && setStep(step + 1)}
                disabled={!canNext()}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition font-medium text-sm disabled:opacity-40"
              >
                Suivant <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-light text-white hover:text-teal-deep transition font-semibold text-sm disabled:opacity-50"
              >
                <UserPlus className="w-5 h-5" />
                {loading ? "Creation..." : "Creer mon compte"}
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            Deja un compte ?{" "}
            <Link href="/login" className="text-gold font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
