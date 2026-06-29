"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { saveAuth, apiFetch, AuthUser } from "@/lib/auth";
import { Eye, EyeOff, UserPlus, ChevronLeft, Check, Search } from "lucide-react";
import Link from "next/link";

interface Church {
  id: string;
  name: string;
  city: string;
}

const STEPS = ["Informations personnelles", "Eglise"];

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredChurches = useMemo(() => {
    if (!churchName.trim()) return churches;
    const q = churchName.toLowerCase();
    return churches.filter(
      (c) => c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
    );
  }, [churches, churchName]);

  useEffect(() => {
    apiFetch("/auth/churches").then(setChurches).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const canNext = () => {
    if (step === 0) return firstName && lastName && email && password.length >= 6;
    return churchName && churchCity;
  };

  const handleSelectChurch = (c: Church) => {
    setChurchName(c.name);
    setChurchCity(c.city);
    setSelectedChurch(c);
    setShowSuggestions(false);
  };

  const handleChurchInput = (value: string) => {
    setChurchName(value);
    setSelectedChurch(null);
    setShowSuggestions(true);
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
              <div className="relative">
                <label className="block text-sm font-medium mb-1.5">Nom de l&apos;eglise</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={churchName}
                    onChange={(e) => handleChurchInput(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                    placeholder="Cherchez ou tapez le nom de votre eglise..."
                    autoComplete="off"
                  />
                </div>
                {showSuggestions && filteredChurches.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 mt-1 w-full bg-card-bg border border-card-border rounded-xl shadow-lg max-h-48 overflow-y-auto"
                  >
                    {filteredChurches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectChurch(c)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-teal-muted transition ${
                          churchName === c.name && churchCity === c.city
                            ? "bg-teal-muted text-teal-deep font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        {c.name} <span className="text-muted">— {c.city}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedChurch && (
                  <p className="mt-1.5 text-xs text-teal-deep">
                    Eglise existante selectionnee
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Ville</label>
                <input
                  type="text"
                  value={churchCity}
                  onChange={(e) => setChurchCity(e.target.value)}
                  disabled={!!selectedChurch}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Douala, Yaounde..."
                />
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

            {step < 1 ? (
              <button
                onClick={() => canNext() && setStep(step + 1)}
                disabled={!canNext()}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition font-medium text-sm disabled:opacity-40"
              >
                Suivant <Search className="w-4 h-4" />
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
