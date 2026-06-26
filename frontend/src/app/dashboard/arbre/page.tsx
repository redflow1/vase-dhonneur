"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { GitBranch, ZoomIn, ZoomOut, RotateCcw, Users, MapPin, User, CalendarDays } from "lucide-react";
import { format } from "date-fns";

interface ChurchNode {
  id: string;
  name: string;
  city: string;
  pastorName: string;
  memberCount: number;
  foundedDate: string;
  parentId: string | null;
  children?: ChurchNode[];
}

const LEVEL_COLORS = [
  { bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-300 dark:border-amber-600", text: "text-amber-800 dark:text-amber-200", accent: "text-amber-500", badge: "bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300" },
  { bg: "bg-teal-50 dark:bg-teal-900/20", border: "border-teal-300 dark:border-teal-600", text: "text-teal-800 dark:text-teal-200", accent: "text-teal-500", badge: "bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300" },
  { bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-300 dark:border-blue-600", text: "text-blue-800 dark:text-blue-200", accent: "text-blue-500", badge: "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300" },
  { bg: "bg-purple-50 dark:bg-purple-900/20", border: "border-purple-300 dark:border-purple-600", text: "text-purple-800 dark:text-purple-200", accent: "text-purple-500", badge: "bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-300 dark:border-emerald-600", text: "text-emerald-800 dark:text-emerald-200", accent: "text-emerald-500", badge: "bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300" },
];

function getLevelColor(level: number) {
  return LEVEL_COLORS[level % LEVEL_COLORS.length];
}

function buildTree(nodes: ChurchNode[]): ChurchNode[] {
  const map = new Map<string, ChurchNode>();
  nodes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: ChurchNode[] = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function ChurchCard({ node, currentChurchId, level }: { node: ChurchNode; currentChurchId: string; level: number }) {
  const isCurrent = node.id === currentChurchId;
  const colors = getLevelColor(level);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-2xl border-2 p-4 w-56 shadow-sm transition-all cursor-pointer hover:shadow-md ${
          isCurrent ? "border-gold shadow-gold/20 shadow-md" : colors.border
        } ${colors.bg}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-bold ${isCurrent ? "text-gold" : colors.text}`}>
            {node.name}
          </span>
          {isCurrent && (
            <span className="text-[10px] bg-gold-muted text-gold rounded-full px-2 py-0.5 font-medium shrink-0 ml-1">
              Mon église
            </span>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <MapPin size={11} className={colors.accent} />
            <span>{node.city}</span>
          </div>
          {node.pastorName && (
            <div className="flex items-center gap-1.5">
              <User size={11} className={colors.accent} />
              <span>{node.pastorName}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users size={11} className={colors.accent} />
            <span>{node.memberCount} membre{node.memberCount !== 1 ? "s" : ""}</span>
          </div>
          {node.foundedDate && (
            <div className="flex items-center gap-1.5">
              <CalendarDays size={11} className={colors.accent} />
              <span>{format(new Date(node.foundedDate), "dd/MM/yyyy")}</span>
            </div>
          )}
        </div>
        {node.children && node.children.length > 0 && (
          <div className="mt-2 text-center">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${colors.badge}`}>
              {node.children.length} fille{node.children.length > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {expanded && node.children && node.children.length > 0 && (
        <div className="relative mt-0">
          <svg width="2" height="24" className="mx-auto">
            <line x1="1" y1="0" x2="1" y2="24" stroke="currentColor" className="text-card-border" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <div className="flex gap-6 items-start relative">
            {node.children.length > 1 && (
              <svg
                className="absolute"
                style={{ top: 0, left: 0, right: 0, height: 1, width: "100%", overflow: "visible" }}
              >
                <line
                  x1="2%"
                  y1="0"
                  x2="98%"
                  y2="0"
                  stroke="currentColor"
                  className="text-card-border"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                />
                {node.children.map((_, idx) => {
                  const x = (100 / (node.children!.length)) * (idx + 0.5);
                  return (
                    <circle key={idx} cx={`${x}%`} cy="0" r="3" fill="currentColor" className="text-card-border" />
                  );
                })}
              </svg>
            )}
            {node.children.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center relative pt-6">
                <svg width="2" height="24" className="absolute top-0">
                  <line x1="1" y1="0" x2="1" y2="24" stroke="currentColor" className="text-card-border" strokeWidth="1.5" strokeDasharray="4 3" />
                </svg>
                <ChurchCard node={child} currentChurchId={currentChurchId} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ArbrePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: arbreData, loading, error } = useApi<{ tree: ChurchNode }>("/arbre");
  const [zoom, setZoom] = useState(1);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tree = arbreData?.tree ? (Array.isArray(arbreData.tree) ? arbreData.tree : [arbreData.tree]) : [];

  return (
    <div>
      <PageHeader
        title="Arbre des Églises"
        subtitle="Réseau Vases d'Honneur — vue hiérarchique complète"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
              className="p-2 rounded-lg bg-card-bg border border-card-border hover:bg-teal-muted transition-colors"
              title="Zoom avant"
            >
              <ZoomIn size={16} className="text-foreground" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))}
              className="p-2 rounded-lg bg-card-bg border border-card-border hover:bg-teal-muted transition-colors"
              title="Zoom arrière"
            >
              <ZoomOut size={16} className="text-foreground" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-2 rounded-lg bg-card-bg border border-card-border hover:bg-teal-muted transition-colors"
              title="Réinitialiser le zoom"
            >
              <RotateCcw size={16} className="text-foreground" />
            </button>
            <span className="text-xs text-muted ml-1">{Math.round(zoom * 100)}%</span>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {tree.length === 0 && !error && (
        <EmptyState
          icon={<GitBranch size={48} />}
          title="Aucune église dans l'arbre"
          description="L'arbre généalogique sera affiché ici lorsque des données seront disponibles."
        />
      )}

      {tree.length > 0 && (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 px-1 text-xs text-muted flex-wrap">
            <span className="font-medium">Niveaux :</span>
            {LEVEL_COLORS.slice(0, 5).map((c, i) => (
              <span key={i} className={`flex items-center gap-1.5`}>
                <span className={`w-3 h-3 rounded-sm ${c.bg} border ${c.border}`} />
                {i === 0 ? "Église mère" : i === 1 ? "Fille" : `Niveau ${i}`}
              </span>
            ))}
            <span className="flex items-center gap-1.5 ml-2">
              <span className="w-3 h-3 rounded-sm bg-gold-muted border border-gold" />
              Mon église
            </span>
          </div>

          <div className="overflow-auto rounded-2xl border border-card-border bg-card-bg p-8">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                minWidth: "800px",
                transition: "transform 0.2s ease",
              }}
            >
              <div className="flex flex-col items-center gap-0">
                {tree.map((root, i) => (
                  <div key={root.id} className="flex flex-col items-center">
                    {i > 0 && (
                      <div className="w-px h-8 bg-card-border my-2" />
                    )}
                    <ChurchCard node={root} currentChurchId={user?.churchId ?? ""} level={0} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
