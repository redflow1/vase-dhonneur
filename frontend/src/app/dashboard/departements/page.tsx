"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";
import { Plus, Pencil, Trash2, Users, Check, X } from "lucide-react";

interface Department {
  id: string; name: string; description?: string;
  leader?: { id: string; firstName: string; lastName: string };
  _count?: { members: number };
}

export default function DepartementsPage() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const load = async () => {
    try {
      const res = await apiFetch("/departments");
      setDepts(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setName(""); setDescription(""); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editId) {
        await apiFetch(`/departments/${editId}`, { method: "PUT", body: JSON.stringify({ name: name.trim(), description }) });
      } else {
        await apiFetch("/departments", { method: "POST", body: JSON.stringify({ name: name.trim(), description }) });
      }
      resetForm();
      load();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce département ?")) return;
    try {
      await apiFetch(`/departments/${id}`, { method: "DELETE" });
      load();
    } catch {}
  };

  const handleEdit = (d: Department) => {
    setName(d.name); setDescription(d.description || ""); setEditId(d.id); setShowForm(true);
  };

  if (loading) return <p className="text-muted">Chargement...</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-foreground">Départements</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nouveau département
        </button>
      </div>

      {showForm && (
        <div className="bg-card-bg border border-card-border rounded-2xl p-4 mb-6 space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du département" className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground focus:outline-none focus:ring-2 focus:ring-gold" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm"><Check className="w-4 h-4" /> {editId ? "Modifier" : "Créer"}</button>
            <button onClick={resetForm} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-card-border text-foreground hover:bg-teal-muted transition text-sm"><X className="w-4 h-4" /> Annuler</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {depts.map((d) => (
          <div key={d.id} className="bg-card-bg border border-card-border rounded-2xl p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-foreground">{d.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(d)} className="p-1.5 text-muted hover:text-teal-deep"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(d.id)} className="p-1.5 text-muted hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            {d.description && <p className="text-xs text-muted mb-2">{d.description}</p>}
            <div className="flex items-center gap-2 text-xs text-muted">
              <Users className="w-3.5 h-3.5" /> {d._count?.members ?? 0} membres
              {d.leader && <span>— Responsable : {d.leader.firstName} {d.leader.lastName}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
