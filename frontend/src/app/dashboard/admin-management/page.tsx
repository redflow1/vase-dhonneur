"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Shield, Plus, UserPlus, Building2, Eye, EyeOff, Trash2, Check, X } from "lucide-react";

interface Church {
  id: string;
  name: string;
  city: string;
}

interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  churchId: string;
  church: { name: string; city: string; parentId: string | null };
  createdAt: string;
}

export default function AdminManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: adminsResponse, loading: adminsLoading, error, refetch } = useApi<{ data: Admin[] }>("/auth/admins");
  const { data: churchesData } = useApi<Church[]>("/auth/churches");

  const [mode, setMode] = useState<"list" | "create">("list");
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "",
    churchName: "", churchCity: "", parentChurchId: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setCreating(true);
    try {
      await apiFetch("/auth/create-admin", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ firstName: "", lastName: "", email: "", password: "", churchName: "", churchCity: "", parentChurchId: "" });
      refetch();
      setMode("list");
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const handleDisable = async (id: string) => {
    try {
      await apiFetch(`/auth/admins/${id}/disable`, { method: "PUT" });
      refetch();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const admins = adminsResponse?.data ?? [];
  const churches = churchesData ?? [];
  const rootChurches = churches.filter((c) => !c.id);

  return (
    <div>
      <PageHeader
        title="Gestion des Églises"
        subtitle="Créer et gérer les administrateurs d'églises"
        action={
          <button
            onClick={() => setMode(mode === "list" ? "create" : "list")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm font-medium"
          >
            {mode === "list" ? <><Plus className="w-4 h-4" /> Nouvel Admin</> : <><Check className="w-4 h-4" /> Voir la liste</>}
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {mode === "create" ? (
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 max-w-2xl">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gold" />
            Créer un administrateur d&apos;église
          </h2>

          {formError && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Prénom</label>
                <input
                  type="text" required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                  placeholder="Jean"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Nom</label>
                <input
                  type="text" required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                  placeholder="Dupont"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                type="email" required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                placeholder="admin@eglise.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} required minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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

            <div className="border-t border-card-border pt-5">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gold" />
                Église à administrer
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Nom de l&apos;église</label>
                  <input
                    type="text" required
                    value={form.churchName}
                    onChange={(e) => setForm({ ...form, churchName: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                    placeholder="Eglise Vases d'Honneur de..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Ville</label>
                  <input
                    type="text" required
                    value={form.churchCity}
                    onChange={(e) => setForm({ ...form, churchCity: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition"
                    placeholder="Douala, Yaounde..."
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5">
                  Église mère <span className="text-muted font-normal">(optionnel)</span>
                </label>
                <select
                  value={form.parentChurchId}
                  onChange={(e) => setForm({ ...form, parentChurchId: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold transition"
                >
                  <option value="">-- Aucune (église fondatrice) --</option>
                  {churches.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gold hover:bg-gold-light text-white font-semibold transition disabled:opacity-50"
              >
                <UserPlus className="w-5 h-5" />
                {creating ? "Création..." : "Créer l'administrateur"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-2xl border border-card-border bg-card-bg overflow-hidden">
          {adminsLoading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner size="lg" />
            </div>
          ) : admins.length === 0 ? (
            <EmptyState
              icon={<Shield size={48} />}
              title="Aucun administrateur"
              description="Les administrateurs d'églises créés apparaîtront ici."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border bg-teal-muted">
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Admin</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Église</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Ville</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Créé le</th>
                    <th className="text-right px-4 py-3 font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-card-border hover:bg-teal-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-deep text-white flex items-center justify-center text-xs font-bold">
                            {admin.firstName[0]}{admin.lastName[0]}
                          </div>
                          <span className="font-medium text-foreground">{admin.firstName} {admin.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{admin.email}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{admin.church.name}</td>
                      <td className="px-4 py-3 text-muted">{admin.church.city}</td>
                      <td className="px-4 py-3 text-muted">{new Date(admin.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDisable(admin.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                          title="Désactiver"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
