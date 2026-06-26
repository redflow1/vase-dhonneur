import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// ─── DONATIONS ────────────────────────────────────────────────────────────────

// GET /dons → donations list
router.get(
  "/dons",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const type = req.query.type as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const where: any = {
        churchId,
        ...(type ? { type } : {}),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {}),
      };

      const donations = await prisma.donation.findMany({
        where,
        orderBy: { date: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.json({ data: donations });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /dons → record donation
router.post(
  "/dons",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { userId, amount, type, method, date, donorName } = req.body;

      if (!amount || !type) {
        return res.status(400).json({ message: "Montant et type requis" });
      }

      const donation = await prisma.donation.create({
        data: {
          churchId,
          userId: userId ?? null,
          amount: parseFloat(amount),
          type,
          method: method ?? "ESPECES",
          date: date ? new Date(date) : new Date(),
          donorName: donorName ?? null,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.status(201).json({ donation });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /rapport → financial summary
router.get(
  "/rapport",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const dateFilter: any =
        startDate || endDate
          ? {
              date: {
                ...(startDate ? { gte: new Date(startDate) } : {}),
                ...(endDate ? { lte: new Date(endDate) } : {}),
              },
            }
          : {};

      const donations = await prisma.donation.findMany({
        where: { churchId, ...dateFilter },
        select: { amount: true, type: true, method: true },
      });

      // Aggregate by type
      const totalByType: Record<string, number> = {};
      const totalByMethod: Record<string, number> = {};
      let grandTotal = 0;

      donations.forEach((d) => {
        const type = d.type ?? "INCONNU";
        const method = d.method ?? "INCONNU";
        totalByType[type] = (totalByType[type] ?? 0) + d.amount;
        totalByMethod[method] = (totalByMethod[method] ?? 0) + d.amount;
        grandTotal += d.amount;
      });

      res.json({ totalByType, totalByMethod, grandTotal });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// ─── BUDGETS ──────────────────────────────────────────────────────────────────

// GET /budgets → budgets list
router.get(
  "/budgets",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const budgets = await prisma.budget.findMany({
        where: { churchId },
        orderBy: [{ year: "desc" }, { department: "asc" }],
      });

      res.json({ data: budgets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /budgets → create or update budget
router.post(
  "/budgets",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { department, year, month, allocated, notes } = req.body;

      if (!department || !year || allocated === undefined) {
        return res.status(400).json({ message: "Département, année et montant alloué requis" });
      }

      // Upsert by church + department + year + month
      const budget = await prisma.budget.upsert({
        where: {
          churchId_department_year_month: {
            churchId,
            department,
            year: parseInt(year),
            month: month ? parseInt(month) : (null as any),
          },
        },
        create: {
          churchId,
          department,
          year: parseInt(year),
          month: month ? parseInt(month) : null,
          allocated: parseFloat(allocated),
        },
        update: {
          allocated: parseFloat(allocated),
        },
      });

      res.status(201).json({ budget });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
