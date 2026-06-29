import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / — Fil d'actualité (paginated)
router.get(
  "/",
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      const posts = await prisma.post.findMany({
        where: { churchId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, role: true },
          },
          comments: {
            orderBy: { createdAt: "asc" },
            take: 3,
            include: {
              author: {
                select: { id: true, firstName: true, lastName: true, photoUrl: true },
              },
            },
          },
          likes: {
            select: { userId: true },
          },
          _count: {
            select: { comments: true },
          },
        },
      });
      const total = await prisma.post.count({ where: { churchId } });

      res.json({
        data: posts.map((p) => {
          const { _count, ...rest } = p;
          return {
            ...rest,
            likeCount: rest.likes.length,
            likedByMe: rest.likes.some((l) => l.userId === (req as any).user.userId),
            commentCount: _count.comments,
          };
        }),
        total,
        page,
        limit,
        hasMore: skip + limit < total,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST / — Créer un post
router.post(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"),
  async (req: Request, res: Response) => {
    try {
      const { churchId, userId } = (req as any).user;
      const { content, imageUrl } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Le contenu est requis" });
      }

      const post = await prisma.post.create({
        data: {
          churchId,
          authorId: userId,
          content: content.trim(),
          imageUrl: imageUrl || null,
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true, role: true },
          },
        },
      });

      res.status(201).json({
        data: { ...post, comments: [], likes: [], likeCount: 0, likedByMe: false, commentCount: 0 },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur lors de la création du post" });
    }
  }
);

// DELETE /:id — Supprimer un post (auteur ou SUPER_ADMIN)
router.delete(
  "/:id",
  async (req: Request, res: Response) => {
    try {
      const { userId, role } = (req as any).user;
      const postId = req.params.id;

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post introuvable" });
      }

      if (post.authorId !== userId && role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Non autorisé" });
      }

      await prisma.post.delete({ where: { id: postId } });
      res.json({ message: "Post supprimé" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:id/comment — Ajouter un commentaire
router.post(
  "/:id/comment",
  async (req: Request, res: Response) => {
    try {
      const { userId } = (req as any).user;
      const postId = req.params.id;
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Le contenu est requis" });
      }

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return res.status(404).json({ message: "Post introuvable" });
      }

      const comment = await prisma.postComment.create({
        data: {
          postId,
          authorId: userId,
          content: content.trim(),
        },
        include: {
          author: {
            select: { id: true, firstName: true, lastName: true, photoUrl: true },
          },
        },
      });

      res.status(201).json({ data: comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /:id/comment/:commentId — Supprimer un commentaire
router.delete(
  "/:id/comment/:commentId",
  async (req: Request, res: Response) => {
    try {
      const { userId, role } = (req as any).user;
      const { commentId } = req.params;

      const comment = await prisma.postComment.findUnique({ where: { id: commentId } });
      if (!comment) {
        return res.status(404).json({ message: "Commentaire introuvable" });
      }

      if (comment.authorId !== userId && role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Non autorisé" });
      }

      await prisma.postComment.delete({ where: { id: commentId } });
      res.json({ message: "Commentaire supprimé" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:id/like — Toggle like
router.post(
  "/:id/like",
  async (req: Request, res: Response) => {
    try {
      const { userId } = (req as any).user;
      const postId = req.params.id;

      const existing = await prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
      });

      if (existing) {
        await prisma.postLike.delete({ where: { id: existing.id } });
        res.json({ liked: false });
      } else {
        await prisma.postLike.create({ data: { postId, userId } });
        res.json({ liked: true });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
