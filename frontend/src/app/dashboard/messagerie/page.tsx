"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Send, Plus, X } from "lucide-react";

interface Conv { id: string; title: string; participants: { id: string; firstName: string; lastName: string }[]; lastMessage?: { content: string; createdAt: string } | null; updatedAt: string; }
interface Msg { id: string; content: string; createdAt: string; sender: { id: string; firstName: string; lastName: string }; }

export default function MessageriePage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [members, setMembers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newMsg, setNewMsg] = useState("");
  const msgsEnd = useRef<HTMLDivElement>(null);

  const loadConvs = async () => { try { const r = await apiFetch("/conversations"); setConvs(r.data); } catch {} finally { setLoading(false); } };

  useEffect(() => { loadConvs(); apiFetch("/membres/annuaire").then(r => setMembers(r.data ?? [])).catch(() => {}); }, []);

  useEffect(() => { if (!activeConv) return; apiFetch(`/conversations/${activeConv}/messages`).then(r => setMsgs(r.data)).catch(() => {}); }, [activeConv]);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const sendMsg = async () => {
    if (!input.trim() || !activeConv) return;
    try {
      await apiFetch(`/conversations/${activeConv}/messages`, { method: "POST", body: JSON.stringify({ content: input }) });
      setInput("");
      const r = await apiFetch(`/conversations/${activeConv}/messages`);
      setMsgs(r.data);
      loadConvs();
    } catch {}
  };

  const createConv = async () => {
    if (selectedIds.length === 0) return;
    try {
      await apiFetch("/conversations", { method: "POST", body: JSON.stringify({ participantIds: selectedIds, title: newTitle, initialMessage: newMsg }) });
      setShowNew(false); setSelectedIds([]); setNewTitle(""); setNewMsg("");
      loadConvs();
    } catch {}
  };

  const toggleMember = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar conversations */}
      <div className="w-72 shrink-0 bg-card-bg border border-card-border rounded-2xl flex flex-col">
        <div className="p-3 border-b border-card-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-sm">Messages</h2>
          <button onClick={() => { setShowNew(true); setSelectedIds([]); setNewTitle(""); setNewMsg(""); }} className="p-1.5 rounded-lg hover:bg-teal-muted transition"><Plus className="w-4 h-4 text-muted" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="text-xs text-muted text-center py-8">Aucune conversation</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActiveConv(c.id)} className={`w-full text-left px-3 py-3 border-b border-card-border hover:bg-teal-muted/30 transition ${activeConv === c.id ? "bg-teal-muted" : ""}`}>
              <p className="text-sm font-medium text-foreground truncate">{c.title || c.participants.filter(p => p.id !== user?.id).map(p => p.firstName).join(", ") || "Discussion"}</p>
              <p className="text-xs text-muted truncate mt-0.5">{c.lastMessage?.content ?? "Aucun message"}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-card-bg border border-card-border rounded-2xl flex flex-col">
        {!activeConv ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">Sélectionnez une conversation</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.sender.id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${m.sender.id === user?.id ? "bg-teal-deep text-white rounded-br-md" : "bg-teal-muted text-foreground rounded-bl-md"}`}>
                    <p className="text-[10px] opacity-70 mb-0.5">{m.sender.firstName}</p>
                    <p>{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={msgsEnd} />
            </div>
            <div className="p-3 border-t border-card-border flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMsg()} placeholder="Votre message..." className="flex-1 px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
              <button onClick={sendMsg} disabled={!input.trim()} className="p-2.5 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition disabled:opacity-50"><Send className="w-4 h-4" /></button>
            </div>
          </>
        )}
      </div>

      {/* Modal new conversation */}
      {showNew && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setShowNew(false)}>
          <div className="bg-card-bg rounded-2xl p-5 w-full max-w-md mx-4 border border-card-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-foreground">Nouvelle conversation</h3>
              <button onClick={() => setShowNew(false)} className="p-1 hover:bg-teal-muted rounded"><X className="w-4 h-4" /></button>
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Titre (optionnel)" className="w-full px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold" />
            <p className="text-xs font-medium text-muted mb-2">Participants</p>
            <div className="max-h-40 overflow-y-auto space-y-1 mb-3">
              {members.filter((m: any) => m.id !== user?.id).map((m: any) => (
                <label key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-teal-muted/30 cursor-pointer">
                  <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleMember(m.id)} className="accent-teal-deep" />
                  <span className="text-sm text-foreground">{m.firstName} {m.lastName}</span>
                </label>
              ))}
            </div>
            <input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Premier message (optionnel)" className="w-full px-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-gold" />
            <button onClick={createConv} disabled={selectedIds.length === 0} className="w-full py-2.5 rounded-xl bg-teal-deep text-white font-medium hover:bg-teal-light transition disabled:opacity-50">Créer</button>
          </div>
        </div>
      )}
    </div>
  );
}
