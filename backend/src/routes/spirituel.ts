import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// ─── PRAYER REQUESTS ──────────────────────────────────────────────────────────

// GET /prieres → prayer requests for church (public)
router.get("/prieres", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const prieres = await prisma.prayerRequest.findMany({
      where: { churchId, isPublic: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        prayCount: true,
        answered: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ data: prieres });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /prieres → submit prayer request
router.post("/prieres", async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const { content, contenu, isPublic } = req.body;
    const text = content || contenu;

    if (!text) return res.status(400).json({ message: "La demande de prière est requise" });

    const priere = await prisma.prayerRequest.create({
      data: {
        churchId,
        userId,
        content: text,
        isPublic: isPublic ?? true,
        prayCount: 0,
        answered: false,
      },
    });

    res.status(201).json({ priere });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /prieres/:id/prier → increment prayCount
router.post("/prieres/:id/prier", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const existing = await prisma.prayerRequest.findFirst({
      where: { id, churchId },
    });
    if (!existing) return res.status(404).json({ message: "Prière non trouvée" });

    const priere = await prisma.prayerRequest.update({
      where: { id },
      data: { prayCount: { increment: 1 } },
    });

    res.json({ priere });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /prieres/:id/repondu → mark answered
router.patch("/prieres/:id/repondu", async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const id = req.params.id as string;

    const existing = await prisma.prayerRequest.findFirst({
      where: { id, churchId },
    });
    if (!existing) return res.status(404).json({ message: "Prière non trouvée" });

    // Only the author or admin/pasteur can mark as answered
    const user = (req as any).user;
    if (existing.userId !== userId && !["SUPER_ADMIN", "ADMIN", "PASTEUR"].includes(user.role)) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const priere = await prisma.prayerRequest.update({
      where: { id },
      data: { answered: true },
    });

    res.json({ priere });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// ─── TESTIMONIES ──────────────────────────────────────────────────────────────

// GET /temoignages → approved testimonies
router.get("/temoignages", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const temoignages = await prisma.testimony.findMany({
      where: { churchId, status: "APPROUVE" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.json({ data: temoignages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /temoignages → submit testimony
router.post("/temoignages", async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const { title, content, titre, contenu } = req.body;
    const t = title || titre;
    const c = content || contenu;

    if (!c) return res.status(400).json({ message: "Contenu requis" });
    if (!t) return res.status(400).json({ message: "Titre requis" });

    const temoignage = await prisma.testimony.create({
      data: {
        churchId,
        userId,
        title: t,
        content: c,
        status: "EN_ATTENTE",
      },
    });

    res.status(201).json({ temoignage });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PATCH /temoignages/:id/statut → approve/reject
router.patch(
  "/temoignages/:id/statut",
  requireRole("PASTEUR", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { status } = req.body;

      if (!["APPROUVE", "REJETE"].includes(status)) {
        return res.status(400).json({ message: "Statut invalide (APPROUVE ou REJETE)" });
      }

      const existing = await prisma.testimony.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Témoignage non trouvé" });

      const temoignage = await prisma.testimony.update({
        where: { id },
        data: { status },
      });

      res.json({ temoignage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// ─── SERMONS ─────────────────────────────────────────────────────────────────

// GET /sermons → sermons library
router.get("/sermons", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const sermons = await prisma.sermon.findMany({
      where: {
        OR: [{ churchId }, { isShared: true }],
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        preacher: true,
        date: true,
        audioUrl: true,
        videoUrl: true,
        textContent: true,
        isShared: true,
        churchId: true,
        createdAt: true,
      },
    });

    res.json({ data: sermons });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /sermons → add sermon (PASTEUR only)
router.post(
  "/sermons",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { title, preacher, date, audioUrl, videoUrl, textContent, isShared } = req.body;

      if (!title || !date) return res.status(400).json({ message: "Titre et date requis" });
      if (!preacher) return res.status(400).json({ message: "Prédicateur requis" });

      const sermon = await prisma.sermon.create({
        data: {
          churchId,
          title,
          preacher,
          date: new Date(date),
          audioUrl: audioUrl ?? null,
          videoUrl: videoUrl ?? null,
          textContent: textContent ?? null,
          isShared: isShared ?? false,
        },
      });

      res.status(201).json({ sermon });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// Aliases pour /approuver et /rejeter (utilisés par le frontend)
router.patch(
  "/temoignages/:id/approuver",
  requireRole("PASTEUR", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const existing = await prisma.testimony.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Témoignage non trouvé" });

      const temoignage = await prisma.testimony.update({
        where: { id },
        data: { status: "APPROUVE" },
      });

      res.json({ temoignage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

router.patch(
  "/temoignages/:id/rejeter",
  requireRole("PASTEUR", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const existing = await prisma.testimony.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Témoignage non trouvé" });

      const temoignage = await prisma.testimony.update({
        where: { id },
        data: { status: "REJETE" },
      });

      res.json({ temoignage });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
