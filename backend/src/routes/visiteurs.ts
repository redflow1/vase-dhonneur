import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / → visitors list with ?status filter
router.get(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const status = req.query.status as string;

      const visitors = await prisma.visitor.findMany({
        where: {
          churchId,
          ...(status ? { status: status as any } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { followUps: true } },
        },
      });

      res.json({ data: visitors });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST / → register visitor
router.post(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { firstName, lastName, phone, email, firstVisit } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: "Prénom et nom requis" });
      }

      const visitor = await prisma.visitor.create({
        data: {
          churchId,
          firstName,
          lastName,
          phone: phone ?? null,
          email: email ?? null,
          firstVisit: firstVisit ? new Date(firstVisit) : new Date(),
          status: "NOUVEAU",
        },
      });

      res.status(201).json({ visitor });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /alertes → visitors NOUVEAU with no follow-up in 3 weeks
router.get(
  "/alertes",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

      const visitors = await prisma.visitor.findMany({
        where: {
          churchId,
          status: "NOUVEAU",
        },
        include: {
          followUps: {
            orderBy: { date: "desc" },
            take: 1,
          },
        },
      });

      // Filter: no follow-up at all, or last follow-up is older than 3 weeks
      const alertes = visitors.filter((v) => {
        if (v.followUps.length === 0) return true;
        return new Date(v.followUps[0].date) < threeWeeksAgo;
      });

      res.json({ data: alertes });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id → visitor detail with follow-ups
router.get(
  "/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const visitor = await prisma.visitor.findFirst({
        where: { id, churchId },
        include: {
          followUps: { orderBy: { date: "desc" } },
        },
      });

      if (!visitor) return res.status(404).json({ message: "Visiteur non trouvé" });
      res.json({ visitor });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PATCH /:id/statut → update visitor status
router.patch(
  "/:id/statut",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { status } = req.body;

      const validStatuses = ["NOUVEAU", "RELANCE", "CONVERTI", "BAPTISE", "INTEGRE", "PERDU"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Statut invalide. Valeurs: ${validStatuses.join(", ")}` });
      }

      const existing = await prisma.visitor.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Visiteur non trouvé" });

      const visitor = await prisma.visitor.update({
        where: { id },
        data: { status: status as any },
      });

      res.json({ visitor });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:id/suivi → add follow-up note
router.post(
  "/:id/suivi",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"),
  async (req: Request, res: Response) => {
    try {
      const { churchId, userId } = (req as any).user;
      const id = req.params.id as string;
      const { note, step } = req.body;

      if (!note) return res.status(400).json({ message: "Note requise" });

      const visitor = await prisma.visitor.findFirst({ where: { id, churchId } });
      if (!visitor) return res.status(404).json({ message: "Visiteur non trouvé" });

      const followUp = await prisma.visitorFollowUp.create({
        data: {
          visitorId: id,
          userId,
          note,
          step: step ?? null,
        },
      });

      res.status(201).json({ followUp });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
