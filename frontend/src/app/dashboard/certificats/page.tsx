"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Award, Download, Droplets, Heart, Star, Baby } from "lucide-react";
import { format, parseISO } from "date-fns";

type CertificatType = "BAPTEME" | "MARIAGE" | "ATTESTATION_MEMBRE" | "DEDICACE";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface Certificat {
  id: string;
  type: CertificatType;
  user?: { firstName: string; lastName: string };
  issueDate: string;
  data?: Record<string, string>;
}

const CERT_TYPES: { type: CertificatType; label: string; icon: React.ReactNode; description: string }[] = [
  { type: "BAPTEME", label: "Baptême", icon: <Droplets size={28} />, description: "Certificat de baptême par immersion" },
  { type: "MARIAGE", label: "Mariage", icon: <Heart size={28} />, description: "Certificat de bénédiction nuptiale" },
  { type: "ATTESTATION_MEMBRE", label: "Attestation membre", icon: <Star size={28} />, description: "Attestation d'appartenance à l'église" },
  { type: "DEDICACE", label: "Dédicace", icon: <Baby size={28} />, description: "Certificat de dédicace d'enfant" },
];

const CERT_VARIANT: Record<CertificatType, "default" | "success" | "warning" | "info" | "danger"> = {
  BAPTEME: "info",
  MARIAGE: "success",
  ATTESTATION_MEMBRE: "default",
  DEDICACE: "warning",
};

const TABS = ["Générer", "Historique"];

export default function CertificatsPage() {
  const { isLoading: authLoading } = useAuth();
  const { data: membresData } = useApi<{ data: Member[] }>("/membres?minimal=true");
  const { data: certificatsData, loading: certLoading, refetch } = useApi<{ data: Certificat[] }>("/certificats");

  const membres = membresData?.data ?? [];
  const certificats = certificatsData?.data ?? [];

  const [tab, setTab] = useState("Générer");
  const [selectedType, setSelectedType] = useState<CertificatType | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genSuccess, setGenSuccess] = useState("");

  // Type-specific form fields
  const [form, setForm] = useState<Record<string, string>>({});

  const handleSelectType = (type: CertificatType) => {
    setSelectedType(type);
    setForm({});
    setGenError("");
    setGenSuccess("");
  };

  const setField = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    setGenerating(true);
    setGenError("");
    setGenSuccess("");
    try {
      await apiFetch("/certificats", {
        method: "POST",
        body: JSON.stringify({ type: selectedType, ...form }),
      });
      setGenSuccess("Le certificat a été généré avec succès.");
      setForm({});
      setSelectedType(null);
      refetch();
    } catch (err: any) {
      setGenError(err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = (id: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    window.open(`${API_URL}/certificats/${id}/pdf`, "_blank");
  };

  const certColumns = [
    {
      key: "type",
      label: "Type",
      render: (v: CertificatType) => <Badge label={v.replace("_", " ")} variant={CERT_VARIANT[v] ?? "default"} />,
    },
    {
      key: "user",
      label: "Membre / Bénéficiaire",
      render: (v: { firstName: string; lastName: string } | undefined) =>
        v ? `${v.firstName} ${v.lastName}` : "—",
    },
    {
      key: "issueDate",
      label: "Date",
      render: (v: string) => (v ? format(parseISO(v), "dd/MM/yyyy") : "—"),
    },
    {
      key: "id",
      label: "PDF",
      render: (_: any, row: Certificat) => (
        <button
          onClick={() => handleDownloadPdf(row.id)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-muted text-teal-deep text-xs font-medium hover:bg-teal-deep hover:text-white transition-colors"
        >
          <Download size={12} />
          Télécharger
        </button>
      ),
    },
  ];

  const renderForm = () => {
    if (!selectedType) return null;
    const memberSelect = (fieldKey: string, label: string, required = true) => (
      <div key={fieldKey}>
        <label className="block text-xs font-medium text-muted mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          required={required}
          value={form[fieldKey] ?? ""}
          onChange={(e) => setField(fieldKey, e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
        >
          <option value="">— Sélectionner —</option>
          {(membres ?? []).map((m) => (
            <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
          ))}
        </select>
      </div>
    );

    const textInput = (fieldKey: string, label: string, type = "text", required = true) => (
      <div key={fieldKey}>
        <label className="block text-xs font-medium text-muted mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type={type}
          required={required}
          value={form[fieldKey] ?? ""}
          onChange={(e) => setField(fieldKey, e.target.value)}
          className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
        />
      </div>
    );

    switch (selectedType) {
      case "BAPTEME":
        return (
          <>
            {memberSelect("membreId", "Membre baptisé")}
            {textInput("date", "Date du baptême", "date")}
            {textInput("officiant", "Officiant")}
          </>
        );
      case "MARIAGE":
        return (
          <>
            {textInput("epoux", "Époux (nom complet)")}
            {textInput("epouse", "Épouse (nom complet)")}
            {textInput("date", "Date du mariage", "date")}
            {textInput("temoins", "Témoins (noms séparés par virgule)", "text", false)}
          </>
        );
      case "ATTESTATION_MEMBRE":
        return (
          <>
            {memberSelect("membreId", "Membre")}
            {textInput("dateAdhesion", "Date d'adhésion", "date")}
          </>
        );
      case "DEDICACE":
        return (
          <>
            {textInput("enfant", "Nom de l'enfant")}
            {textInput("parents", "Nom des parents")}
            {textInput("date", "Date de la dédicace", "date")}
          </>
        );
      default:
        return null;
    }
  };

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
        title="Certificats Automatiques"
        subtitle="Génération et gestion des certificats officiels"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── Générer ── */}
        {tab === "Générer" && (
          <div className="max-w-2xl space-y-6">
            {genSuccess && (
              <div className="rounded-lg bg-teal-muted border border-teal-deep/30 text-teal-deep px-4 py-3 text-sm font-medium">
                {genSuccess}
              </div>
            )}

            <div>
              <p className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
                Sélectionnez un type de certificat
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CERT_TYPES.map(({ type, label, icon, description }) => (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className={`text-left rounded-2xl border p-4 transition-all ${
                      selectedType === type
                        ? "border-teal-deep bg-teal-muted shadow-sm"
                        : "border-card-border bg-card-bg hover:border-teal-deep/50"
                    }`}
                  >
                    <div className={`mb-2 ${selectedType === type ? "text-teal-deep" : "text-muted"}`}>
                      {icon}
                    </div>
                    <p className={`text-sm font-semibold ${selectedType === type ? "text-teal-deep" : "text-foreground"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-muted mt-0.5">{description}</p>
                  </button>
                ))}
              </div>
            </div>

            {selectedType && (
              <form onSubmit={handleGenerate} className="rounded-2xl bg-card-bg border border-card-border p-5 space-y-4">
                <p className="text-sm font-semibold text-foreground">
                  Informations pour le certificat de {CERT_TYPES.find((c) => c.type === selectedType)?.label}
                </p>
                {genError && <p className="text-sm text-red-500">{genError}</p>}
                {renderForm()}
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
                  >
                    <Award size={16} />
                    {generating ? "Génération…" : "Générer le certificat"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ── Historique ── */}
        {tab === "Historique" && (
          <>
            {certLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !certificats || certificats.length === 0 ? (
              <EmptyState
                icon={<Award size={40} />}
                title="Aucun certificat généré"
                description="Les certificats générés apparaîtront ici."
              />
            ) : (
              <DataTable columns={certColumns} data={certificats} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
