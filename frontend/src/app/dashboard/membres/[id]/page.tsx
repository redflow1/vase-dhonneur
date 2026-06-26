"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import { ROLE_LABELS, Role } from "@/lib/modules";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MemberAvatar from "@/components/MemberAvatar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Pencil, Trash2, Mail, Phone, MapPin, CalendarDays, Building2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Membre {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  departement: string;
  role: Role;
  statut: string;
  dateNaissance?: string;
  dateInscription?: string;
  photoUrl?: string;
}

interface Presence {
  id: string;
  date: string;
  typeService: string;
}

const DEPARTEMENTS = [
  "Louange","Intercession","Jeunesse","Femmes","Hommes","Accueil",
  "Communication","EVA","MRS","Administration","Autre",
];

const STATUT_VARIANT: Record<string, "success" | "warning" | "default" | "danger"> = {
  ACTIF: "success",
  INACTIF: "default",
  SUSPENDU: "danger",
};

const TABS = ["Informations", "Présences"];

export default function MembreFichePage() {
  const { isLoading: authLoading } = useAuth();
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const { data: membre, loading, error, refetch } = useApi<Membre>(`/membres/${id}`);
  const { data: presences, loading: presLoading } = useApi<Presence[]>(`/membres/${id}/presences`);

  const [tab, setTab] = useState("Informations");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [editForm, setEditForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    adresse: "",
    dateNaissance: "",
    departement: "",
    role: "MEMBRE" as Role,
  });

  const openEdit = () => {
    if (!membre) return;
    setEditForm({
      prenom: membre.prenom,
      nom: membre.nom,
      email: membre.email || "",
      telephone: membre.telephone || "",
      adresse: membre.adresse || "",
      dateNaissance: membre.dateNaissance ? membre.dateNaissance.split("T")[0] : "",
      departement: membre.departement || "",
      role: membre.role,
    });
    setFormError("");
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      await apiFetch(`/membres/${id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      });
      refetch();
      setEditOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/membres/${id}`, { method: "DELETE" });
      router.push("/dashboard/membres");
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression");
    }
  };

  const setField = (key: string, value: string) =>
    setEditForm((p) => ({ ...p, [key]: value }));

  const presenceCols = [
    {
      key: "date",
      label: "Date",
      render: (v: string) =>
        v ? format(parseISO(v), "dd/MM/yyyy") : "—",
    },
    { key: "typeService", label: "Type de service" },
  ];

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  if (!membre) return null;

  return (
    <div>
      <PageHeader
        title={`${membre.prenom} ${membre.nom}`}
        subtitle="Fiche membre détaillée"
        action={
          <div className="flex gap-2">
            <button
              onClick={openEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-card-border bg-card-bg text-sm font-medium text-foreground hover:bg-teal-muted transition-colors"
            >
              <Pencil size={15} />
              Modifier
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <Trash2 size={15} />
              Supprimer
            </button>
          </div>
        }
      />

      {/* Profile card */}
      <div className="flex flex-col sm:flex-row items-start gap-6 bg-card-bg border border-card-border rounded-2xl p-6 mb-6">
        <MemberAvatar
          name={`${membre.prenom} ${membre.nom}`}
          photoUrl={membre.photoUrl}
          size="lg"
        />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">
              {membre.prenom} {membre.nom}
            </h2>
            <Badge
              label={membre.statut || "—"}
              variant={STATUT_VARIANT[membre.statut] ?? "default"}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-muted">
            {membre.email && (
              <span className="flex items-center gap-2">
                <Mail size={14} /> {membre.email}
              </span>
            )}
            {membre.telephone && (
              <span className="flex items-center gap-2">
                <Phone size={14} /> {membre.telephone}
              </span>
            )}
            {membre.adresse && (
              <span className="flex items-center gap-2">
                <MapPin size={14} /> {membre.adresse}
              </span>
            )}
            {membre.departement && (
              <span className="flex items-center gap-2">
                <Building2 size={14} /> {membre.departement}
              </span>
            )}
            <span className="flex items-center gap-2">
              <CalendarDays size={14} />
              {membre.dateInscription
                ? `Inscrit le ${format(parseISO(membre.dateInscription), "dd/MM/yyyy")}`
                : "Date d'inscription inconnue"}
            </span>
            <span className="flex items-center gap-2 text-foreground font-medium">
              Rôle: {ROLE_LABELS[membre.role] ?? membre.role}
            </span>
          </div>
        </div>
      </div>

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {tab === "Informations" && (
          <div className="rounded-2xl bg-card-bg border border-card-border p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            {[
              ["Prénom", membre.prenom],
              ["Nom", membre.nom],
              ["Email", membre.email || "—"],
              ["Téléphone", membre.telephone || "—"],
              ["Adresse", membre.adresse || "—"],
              ["Département", membre.departement || "—"],
              ["Rôle", ROLE_LABELS[membre.role] ?? membre.role],
              [
                "Date de naissance",
                membre.dateNaissance
                  ? format(parseISO(membre.dateNaissance), "dd/MM/yyyy")
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted mb-0.5">{label}</p>
                <p className="font-medium text-foreground">{value}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "Présences" && (
          <DataTable
            columns={presenceCols}
            data={presences ?? []}
            loading={presLoading}
          />
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Modifier le membre" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <p className="text-sm text-red-500">{formError}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ["prenom", "Prénom", "text"],
                ["nom", "Nom", "text"],
                ["email", "Email", "email"],
                ["telephone", "Téléphone", "tel"],
                ["dateNaissance", "Date de naissance", "date"],
              ] as [string, string, string][]
            ).map(([key, label, type]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-muted mb-1">{label}</label>
                <input
                  type={type}
                  value={(editForm as any)[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Adresse</label>
              <input
                type="text"
                value={editForm.adresse}
                onChange={(e) => setField("adresse", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Département</label>
              <select
                value={editForm.departement}
                onChange={(e) => setField("departement", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              >
                <option value="">— Sélectionner —</option>
                {DEPARTEMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Rôle</label>
              <select
                value={editForm.role}
                onChange={(e) => setField("role", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              >
                {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer ce membre"
        message={`Êtes-vous sûr de vouloir supprimer ${membre.prenom} ${membre.nom} ? Cette action est irréversible.`}
        danger
      />
    </div>
  );
}
