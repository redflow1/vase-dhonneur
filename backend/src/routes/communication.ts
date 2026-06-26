import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────

// GET /annonces → announcements list
router.get(
  "/annonces",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const annonces = await prisma.announcement.findMany({
        where: { churchId },
        orderBy: { createdAt: "desc" },
      });

      res.json({ data: annonces });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /annonces → create announcement
router.post(
  "/annonces",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"),
  async (req: Request, res: Response) => {
    try {
      const { churchId, userId } = (req as any).user;
      const { title, content, targetScope, targetId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ message: "Titre et contenu requis" });
      }

      const annonce = await prisma.announcement.create({
        data: {
          churchId,
          authorId: userId,
          title,
          content,
          targetScope: targetScope ?? "ALL",
          targetId: targetId ?? null,
        },
      });

      res.status(201).json({ annonce });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /annonces/:id → update announcement
router.put(
  "/annonces/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { title, content, targetScope, targetId } = req.body;

      const existing = await prisma.announcement.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Annonce non trouvée" });

      const annonce = await prisma.announcement.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(targetScope !== undefined && { targetScope }),
          ...(targetId !== undefined && { targetId }),
        },
      });

      res.json({ annonce });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /annonces/:id → delete announcement
router.delete(
  "/annonces/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const existing = await prisma.announcement.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Annonce non trouvée" });

      await prisma.announcement.delete({ where: { id } });

      res.json({ message: "Annonce supprimée" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

// GET /notifications → user's notifications
router.get("/notifications", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ data: notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /notifications/:id/read → mark as read
router.put("/notifications/:id/read", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const id = req.params.id as string;

    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ message: "Notification non trouvée" });

    const notification = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({ notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /notifications/read-all → mark all as read
router.put("/notifications/read-all", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ message: "Toutes les notifications marquées comme lues" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
