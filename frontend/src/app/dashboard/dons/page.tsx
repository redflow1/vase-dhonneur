"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Plus, Download, X, Check } from "lucide-react";

const TYPES = ["DIME", "OFFRANDE", "DON_SPECIAL"];
const METHODS = ["ESPECES", "MOBILE_MONEY_MTN", "MOBILE_MONEY_ORANGE", "CARTE_BANCAIRE"];
const TYPE_LABELS: Record<string, string> = { DIME: "Dîme", OFFRANDE: "Offrande", DON_SPECIAL: "Don spécial" };
const METHOD_LABELS: Record<string, string> = { ESPECES: "Espèces", MOBILE_MONEY_MTN: "Mobile Money MTN", MOBILE_MONEY_ORANGE: "Mobile Money Orange", CARTE_BANCAIRE: "Carte bancaire" };

interface Donation {
  id: string; amount: number; type: string; method: string; date: string; donorName?: string;
  user?: { id: string; firstName: string; lastName: string } | null;
}

export default function DonsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "PASTEUR";
  const [dons, setDons] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", type: "OFFRANDE", method: "ESPECES", date: new Date().toISOString().split("T")[0], donorName: "" });

  const load = async () => {
    setLoading(true);
    try { const r = await apiFetch("/finances/dons"); setDons(r.data); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.amount) return;
    try {
      await apiFetch("/finances/dons", { method: "POST", body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
      setShowForm(false);
      setForm({ amount: "", type: "OFFRANDE", method: "ESPECES", date: new Date().toISOString().split("T")[0], donorName: "" });
      load();
    } catch {}
  };

  const total = dons.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <PageHeader title="Dons & Offrandes" subtitle="Enregistrement et suivi" action={isAdmin ? <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm font-medium"><Plus className="w-4 h-4" /> Nouveau don</button> : undefined} />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {TYPES.map((t) => (
          <div key={t} className="bg-card-bg border border-card-border rounded-2xl p-4 text-center">
            <p className="text-xs text-muted mb-1">{TYPE_LABELS[t]}</p>
            <p className="text-xl font-bold text-teal-deep">{dons.filter(d => d.type === t).reduce((s, d) => s + d.amount, 0).toLocaleString()} F</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-card-bg border border-card-border rounded-2xl p-4 mb-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} placeholder="Montant" className="px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
            <input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
            <select value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))} className="px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <select value={form.method} onChange={(e) => setForm(p => ({ ...p, method: e.target.value }))} className="px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
              {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
            </select>
          </div>
          <input type="text" value={form.donorName} onChange={(e) => setForm(p => ({ ...p, donorName: e.target.value }))} placeholder="Nom du donateur (optionnel)" className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm"><Check className="w-4 h-4" /> Enregistrer</button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-card-border text-foreground hover:bg-teal-muted transition text-sm"><X className="w-4 h-4" /> Annuler</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div> : (
        <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-card-border text-muted text-xs uppercase">
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Donateur</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Méthode</th>
                <th className="text-right px-4 py-3 font-semibold">Montant</th>
              </tr></thead>
              <tbody>
                {dons.map((d) => (
                  <tr key={d.id} className="border-b border-card-border last:border-0 hover:bg-teal-muted/20">
                    <td className="px-4 py-3 text-foreground">{new Date(d.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-foreground">{d.donorName || (d.user ? `${d.user.firstName} ${d.user.lastName}` : "Anonyme")}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-teal-muted text-teal-deep rounded-full px-2 py-0.5">{TYPE_LABELS[d.type]}</span></td>
                    <td className="px-4 py-3 text-muted">{METHOD_LABELS[d.method]}</td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">{d.amount.toLocaleString()} F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-card-border text-right text-sm font-bold text-foreground">Total : {total.toLocaleString()} F</div>
        </div>
      )}
    </div>
  );
}
