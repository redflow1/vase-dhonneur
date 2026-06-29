"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { DollarSign, Plus, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell as RCell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = { primary: "#1A6B5C", secondary: "#2D8B78", accent: "#C9940A", light: "#F5D070" };

type DonationType = "DIME" | "OFFRANDE" | "DON_SPECIAL" | "AUTRE";
type PaymentMethod = "ESPECES" | "VIREMENT" | "MOBILE_MONEY" | "CHEQUE";

interface Don {
  id: string;
  date: string;
  donorName: string;
  amount: number;
  type: DonationType;
  method: PaymentMethod;
}

interface Budget {
  id: string;
  department: string;
  year: number;
  allocated: number;
  spent: number;
}

interface Rapport {
  grandTotal: number;
  totalByType: Record<string, number>;
  totalByMethod: Record<string, number>;
}

const DONATION_TYPES: DonationType[] = ["DIME", "OFFRANDE", "DON_SPECIAL", "AUTRE"];
const PAYMENT_METHODS: PaymentMethod[] = ["ESPECES", "VIREMENT", "MOBILE_MONEY", "CHEQUE"];

const DON_VARIANT: Record<DonationType, "default" | "success" | "warning" | "info" | "danger"> = {
  DIME: "success",
  OFFRANDE: "info",
  DON_SPECIAL: "warning",
  AUTRE: "default",
};

const TABS = ["Dons", "Budgets", "Rapport"];

export default function FinancesPage() {
  const { isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState("Dons");

  const { data: donsData, loading: donsLoading, refetch: refetchDons } = useApi<{ data: Don[] }>("/finances/dons");
  const { data: budgetsData, loading: budgetsLoading, refetch: refetchBudgets } = useApi<{ data: Budget[] }>("/finances/budgets");

  const dons = donsData?.data ?? [];
  const budgets = budgetsData?.data ?? [];

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rapport, setRapport] = useState<Rapport | null>(null);
  const [rapportLoading, setRapportLoading] = useState(false);

  // Don modal
  const [donOpen, setDonOpen] = useState(false);
  const [donForm, setDonForm] = useState({ amount: "", type: "DIME" as DonationType, method: "ESPECES" as PaymentMethod, donorName: "" });
  const [donSubmitting, setDonSubmitting] = useState(false);
  const [donError, setDonError] = useState("");

  // Budget modal
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ department: "", year: new Date().getFullYear().toString(), allocated: "" });
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [budgetError, setBudgetError] = useState("");

  const handleSubmitDon = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonSubmitting(true);
    setDonError("");
    try {
      await apiFetch("/finances/dons", {
        method: "POST",
        body: JSON.stringify({ ...donForm, amount: parseFloat(donForm.amount) }),
      });
      setDonOpen(false);
      setDonForm({ amount: "", type: "DIME", method: "ESPECES", donorName: "" });
      refetchDons();
    } catch (err: any) {
      setDonError(err.message || "Erreur");
    } finally {
      setDonSubmitting(false);
    }
  };

  const handleSubmitBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setBudgetSubmitting(true);
    setBudgetError("");
    try {
      await apiFetch("/finances/budgets", {
        method: "POST",
        body: JSON.stringify({ ...budgetForm, year: parseInt(budgetForm.year), allocated: parseFloat(budgetForm.allocated) }),
      });
      setBudgetOpen(false);
      setBudgetForm({ department: "", year: new Date().getFullYear().toString(), allocated: "" });
      refetchBudgets();
    } catch (err: any) {
      setBudgetError(err.message || "Erreur");
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const fetchRapport = async () => {
    setRapportLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      const raw = await apiFetch(`/finances/rapport?${params.toString()}`);
      setRapport({
        grandTotal: raw.grandTotal ?? 0,
        totalByType: raw.totalByType ?? {},
        totalByMethod: raw.totalByMethod ?? {},
      });
    } catch (err: any) {
      alert(err.message || "Erreur lors du chargement du rapport");
    } finally {
      setRapportLoading(false);
    }
  };

  const donColumns = [
    { key: "date", label: "Date", render: (v: string) => v ? format(parseISO(v), "dd/MM/yyyy") : "—" },
    { key: "donorName", label: "Donateur" },
    { key: "amount", label: "Montant", render: (v: number) => `${v?.toLocaleString("fr-FR")} FCFA` },
    { key: "type", label: "Type", render: (v: DonationType) => <Badge label={v} variant={DON_VARIANT[v] ?? "default"} /> },
    { key: "method", label: "Méthode", render: (v: string) => <Badge label={v} variant="info" /> },
  ];

  const budgetColumns = [
    { key: "department", label: "Département" },
    { key: "year", label: "Année" },
    { key: "allocated", label: "Alloué", render: (v: number) => `${v?.toLocaleString("fr-FR")} FCFA` },
    { key: "spent", label: "Dépensé", render: (v: number) => `${v?.toLocaleString("fr-FR")} FCFA` },
    {
      key: "allocated",
      label: "Restant / Progression",
      render: (_: any, row: Budget) => {
        const restant = row.allocated - row.spent;
        const pct = row.allocated > 0 ? Math.min((row.spent / row.allocated) * 100, 100) : 0;
        return (
          <div className="min-w-[140px]">
            <div className="flex justify-between text-xs mb-1">
              <span className={restant < 0 ? "text-red-500" : "text-foreground"}>{restant.toLocaleString("fr-FR")} FCFA</span>
              <span className="text-muted">{Math.round(pct)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-teal-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : "bg-teal-deep"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Finances & Dons"
        subtitle="Gestion des dons, budgets et rapports financiers"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── Dons ── */}
        {tab === "Dons" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setDonOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
              >
                <Plus size={16} />
                Enregistrer un don
              </button>
            </div>
            {donsLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !dons || dons.length === 0 ? (
              <EmptyState icon={<DollarSign size={40} />} title="Aucun don enregistré" description="Enregistrez le premier don pour commencer." />
            ) : (
              <DataTable columns={donColumns} data={dons} />
            )}
          </>
        )}

        {/* ── Budgets ── */}
        {tab === "Budgets" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setBudgetOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
              >
                <Plus size={16} />
                Ajouter budget
              </button>
            </div>
            {budgetsLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !budgets || budgets.length === 0 ? (
              <EmptyState icon={<TrendingUp size={40} />} title="Aucun budget défini" description="Ajoutez un budget départemental pour commencer." />
            ) : (
              <DataTable columns={budgetColumns} data={budgets} />
            )}
          </>
        )}

        {/* ── Rapport ── */}
        {tab === "Rapport" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-4 p-4 rounded-2xl bg-card-bg border border-card-border">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Date de fin</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                />
              </div>
              <button
                onClick={fetchRapport}
                disabled={rapportLoading}
                className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
              >
                {rapportLoading ? "Chargement…" : "Générer le rapport"}
              </button>
            </div>

            {rapportLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : rapport ? (
              <>
                <div className="rounded-2xl bg-card-bg border border-card-border p-6 text-center">
                  <p className="text-sm text-muted mb-1">Total des dons</p>
                  <p className="text-4xl font-bold text-teal-deep">{rapport.grandTotal?.toLocaleString("fr-FR")} FCFA</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-2xl bg-card-bg border border-card-border p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Dons par type</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={Object.entries(rapport.totalByType).map(([type, montant]) => ({ type, montant }))}
                          dataKey="montant"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ payload, percent }: any) => `${payload.type} ${Math.round((percent ?? 0) * 100)}%`}
                        >
                          {Object.keys(rapport.totalByType).map((_, i) => (
                            <RCell key={i} fill={[COLORS.primary, COLORS.accent, COLORS.secondary, COLORS.light][i % 4]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => `${v?.toLocaleString("fr-FR")} FCFA`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="rounded-2xl bg-card-bg border border-card-border p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4">Dons par méthode</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={Object.entries(rapport.totalByMethod).map(([methode, montant]) => ({ methode, montant }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="methode" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v?.toLocaleString("fr-FR")} />
                        <Tooltip formatter={(v: any) => `${v?.toLocaleString("fr-FR")} FCFA`} />
                        <Bar dataKey="montant" name="Montant" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-muted text-sm">
                Sélectionnez une période et cliquez sur "Générer le rapport"
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal : Enregistrer un don */}
      <Modal open={donOpen} onClose={() => setDonOpen(false)} title="Enregistrer un don" size="sm">
        <form onSubmit={handleSubmitDon} className="space-y-4">
          {donError && <p className="text-sm text-red-500">{donError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Donateur</label>
            <input
              type="text"
              value={donForm.donorName}
              onChange={(e) => setDonForm((p) => ({ ...p, donorName: e.target.value }))}
              placeholder="Nom du donateur"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Montant (FCFA) <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              min={0}
              value={donForm.amount}
              onChange={(e) => setDonForm((p) => ({ ...p, amount: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Type <span className="text-red-500">*</span></label>
            <select
              value={donForm.type}
              onChange={(e) => setDonForm((p) => ({ ...p, type: e.target.value as DonationType }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              {DONATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Méthode de paiement <span className="text-red-500">*</span></label>
            <select
              value={donForm.method}
              onChange={(e) => setDonForm((p) => ({ ...p, method: e.target.value as PaymentMethod }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setDonOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={donSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {donSubmitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal : Ajouter budget */}
      <Modal open={budgetOpen} onClose={() => setBudgetOpen(false)} title="Ajouter un budget" size="sm">
        <form onSubmit={handleSubmitBudget} className="space-y-4">
          {budgetError && <p className="text-sm text-red-500">{budgetError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Département <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={budgetForm.department}
              onChange={(e) => setBudgetForm((p) => ({ ...p, department: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Année <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              value={budgetForm.year}
              onChange={(e) => setBudgetForm((p) => ({ ...p, year: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Montant alloué (FCFA) <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              min={0}
              value={budgetForm.allocated}
              onChange={(e) => setBudgetForm((p) => ({ ...p, allocated: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setBudgetOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={budgetSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {budgetSubmitting ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
