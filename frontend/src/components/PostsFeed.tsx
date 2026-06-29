"use client";

import { useEffect, useState, useRef } from "react";
import { apiFetch, getUser, AuthUser } from "@/lib/auth";
import { Role } from "@/lib/modules";
import { Heart, MessageCircle, Trash2, Send, ImagePlus, Loader2 } from "lucide-react";

interface PostAuthor {
  id: string; firstName: string; lastName: string; photoUrl?: string; role: Role;
}
interface PostComment {
  id: string; author: PostAuthor; content: string; createdAt: string;
}
interface PostData {
  id: string; author: PostAuthor; content: string; imageUrl?: string;
  createdAt: string; likeCount: number; likedByMe: boolean;
  comments: PostComment[]; commentCount: number;
}

const CAN_POST: Role[] = ["SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"];

export default function PostsFeed() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const feedRef = useRef<HTMLDivElement>(null);

  const loadPosts = async () => {
    try {
      const res = await apiFetch("/posts");
      setPosts(res.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setUser(getUser());
    loadPosts();
  }, []);

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch("/posts", {
        method: "POST",
        body: JSON.stringify({ content: newContent.trim() }),
      });
      setPosts((prev) => [res.data, ...prev]);
      setNewContent("");
    } catch { /* ignore */ }
    finally { setPosting(false); }
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await apiFetch(`/posts/${postId}/like`, { method: "POST" });
      setPosts((prev) => prev.map((p) =>
        p.id === postId
          ? { ...p, likedByMe: res.liked, likeCount: p.likeCount + (res.liked ? 1 : -1) }
          : p
      ));
    } catch { /* ignore */ }
  };

  const handleComment = async (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      const res = await apiFetch(`/posts/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
      setPosts((prev) => prev.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, res.data], commentCount: p.commentCount + 1 }
          : p
      ));
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    } catch { /* ignore */ }
  };

  const handleDelete = async (postId: string) => {
    try {
      await apiFetch(`/posts/${postId}`, { method: "DELETE" });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch { /* ignore */ }
  };

  const canPost = user && CAN_POST.includes(user.role);
  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "À l'instant";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="bg-card-bg border border-card-border rounded-2xl p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-teal-deep" />
      </div>
    );
  }

  return (
    <div ref={feedRef} className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">Fil d'actualité</h2>

      {canPost && (
        <div className="bg-card-bg border border-card-border rounded-2xl p-4">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Publier une annonce..."
            className="w-full px-4 py-3 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold transition resize-none min-h-[80px]"
          />
          <div className="flex justify-between items-center mt-3">
            <button className="flex items-center gap-1.5 text-sm text-muted hover:text-teal-deep transition">
              <ImagePlus className="w-5 h-5" /> Image
            </button>
            <button
              onClick={handlePost}
              disabled={!newContent.trim() || posting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition font-medium text-sm disabled:opacity-40"
            >
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publier
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">Aucune publication pour le moment</p>
      ) : (
        posts.map((post) => (
          <div key={post.id} className="bg-card-bg border border-card-border rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-teal-muted flex items-center justify-center text-sm font-bold text-teal-deep">
                {post.author.firstName[0]}{post.author.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {post.author.firstName} {post.author.lastName}
                </p>
                <p className="text-xs text-muted">{formatDate(post.createdAt)}</p>
              </div>
              {(user?.id === post.author.id || user?.role === "SUPER_ADMIN") && (
                <button onClick={() => handleDelete(post.id)} className="text-muted hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-card-border">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 text-sm transition ${
                  post.likedByMe ? "text-red-500" : "text-muted hover:text-red-500"
                }`}
              >
                <Heart className={`w-4 h-4 ${post.likedByMe ? "fill-red-500" : ""}`} />
                {post.likeCount > 0 && post.likeCount}
              </button>
              <button className="flex items-center gap-1.5 text-sm text-muted hover:text-teal-deep transition">
                <MessageCircle className="w-4 h-4" />
                {post.commentCount > 0 && post.commentCount}
              </button>
            </div>

            {post.comments.length > 0 && (
              <div className="mt-3 space-y-2">
                {post.comments.map((c) => (
                  <div key={c.id} className="flex gap-2 text-sm">
                    <span className="font-semibold text-foreground shrink-0">
                      {c.author.firstName} {c.author.lastName}
                    </span>
                    <span className="text-muted">{c.content}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <input
                value={commentInputs[post.id] || ""}
                onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                placeholder="Ecrire un commentaire..."
                className="flex-1 px-3 py-2 rounded-xl bg-input-bg border border-input-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <button
                onClick={() => handleComment(post.id)}
                disabled={!commentInputs[post.id]?.trim()}
                className="px-3 py-2 rounded-xl bg-teal-deep text-white hover:bg-teal-light transition text-sm disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
