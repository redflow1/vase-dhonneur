"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Plus, Check, X, Trash2, Edit3 } from "lucide-react";

const STATUSES = ["À faire", "En cours", "Terminé", "Annulé"];

interface Task {
  id: string; title: string; description?: string; status: string; dueDate?: string;
  assignee?: { id: string; firstName: string; lastName: string } | null;
  creator: { id: string; firstName: string; lastName: string };
}

export default function TachesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "PASTEUR";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [members, setMembers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: "", dueDate: "" });

  const load = async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const r = await apiFetch(`/tasks${params}`);
      setTasks(r.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); apiFetch("/membres/annuaire").then(r => setMembers(r.data ?? [])).catch(() => {}); }, [filter]);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      await apiFetch("/tasks", { method: "POST", body: JSON.stringify(form) });
      setShowForm(false);
      setForm({ title: "", description: "", assignedTo: "", dueDate: "" });
      load();
    } catch {}
  };

  const updateStatus = async (id: string, status: string) => {
    try { await apiFetch(`/tasks/${id}`, { method: "PUT", body: JSON.stringify({ status }) }); load(); } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette tâche ?")) return;
    try { await apiFetch(`/tasks/${id}`, { method: "DELETE" }); load(); } catch {}
  };

  const counts = STATUSES.map(s => ({ label: s, count: tasks.filter(t => t.status === s).length }));

  return (
    <div>
      <PageHeader title="Tâches" subtitle="Gestion des tâches et responsabilités" action={isAdmin ? <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm font-medium"><Plus className="w-4 h-4" /> Nouvelle tâche</button> : undefined} />

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button onClick={() => setFilter("")} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${!filter ? "bg-teal-deep text-white" : "bg-card-bg text-muted border border-card-border hover:bg-teal-muted"}`}>Toutes ({tasks.length})</button>
        {counts.map((c) => <button key={c.label} onClick={() => setFilter(c.label)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${filter === c.label ? "bg-teal-deep text-white" : "bg-card-bg text-muted border border-card-border hover:bg-teal-muted"}`}>{c.label} ({c.count})</button>)}
      </div>

      {showForm && (
        <div className="bg-card-bg border border-card-border rounded-2xl p-4 mb-6 space-y-3">
          <input value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Titre de la tâche" className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
          <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optionnel)" rows={2} className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold resize-y" />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.assignedTo} onChange={(e) => setForm(p => ({ ...p, assignedTo: e.target.value }))} className="px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold">
              <option value="">Non assignée</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
            </select>
            <input type="date" value={form.dueDate} onChange={(e) => setForm(p => ({ ...p, dueDate: e.target.value }))} className="px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm"><Check className="w-4 h-4" /> Créer</button>
            <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-card-border text-foreground hover:bg-teal-muted transition text-sm"><X className="w-4 h-4" /> Annuler</button>
          </div>
        </div>
      )}

      {loading ? <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div> : (
        <div className="space-y-2">
          {tasks.length === 0 && <p className="text-center text-muted py-8 text-sm">Aucune tâche</p>}
          {tasks.map((t) => (
            <div key={t.id} className="bg-card-bg border border-card-border rounded-2xl p-4 flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 pt-0.5">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => updateStatus(t.id, s)}
                    className={`w-2 h-2 rounded-full transition-colors ${t.status === s ? "bg-teal-deep ring-2 ring-teal-deep/30" : "bg-gray-300 dark:bg-gray-600 hover:bg-teal-muted"}`} title={s}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-medium text-foreground text-sm ${t.status === "Terminé" || t.status === "Annulé" ? "line-through opacity-60" : ""}`}>{t.title}</h3>
                    {t.description && <p className="text-xs text-muted mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {isAdmin && <button onClick={() => handleDelete(t.id)} className="p-1 text-muted hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                  {t.assignee && <span>Assigné à : <strong>{t.assignee.firstName} {t.assignee.lastName}</strong></span>}
                  {t.dueDate && <span>Échéance : {new Date(t.dueDate).toLocaleDateString("fr-FR")}</span>}
                  <span className="px-1.5 py-0.5 rounded bg-teal-muted text-teal-deep">{t.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
