import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET /kpis → aggregate KPIs
router.get(
  "/kpis",
  requireRole("SUPER_ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const [
        totalMembers,
        activeMembers,
        totalVisitors,
        totalDonationsAgg,
        totalCells,
      ] = await Promise.all([
        prisma.user.count({ where: { churchId } }),
        prisma.user.count({ where: { churchId, isActive: true } }),
        prisma.visitor.count({ where: { churchId } }),
        prisma.donation.aggregate({ where: { churchId }, _sum: { amount: true } }),
        prisma.cell.count({ where: { churchId } }),
      ]);

      res.json({
        membresActifs: activeMembers,
        visiteurs: totalVisitors,
        donsTotal: totalDonationsAgg._sum.amount ?? 0,
        cellules: totalCells,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /presences → weekly attendance last 12 weeks
router.get(
  "/presences",
  requireRole("SUPER_ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      // Build last 12 Sundays
      const now = new Date();
      const weeks: { label: string; start: Date; end: Date }[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        // Go to Monday of the week `i` weeks ago
        const day = weekStart.getDay();
        const diffToMonday = (day === 0 ? -6 : 1 - day) - i * 7;
        weekStart.setDate(weekStart.getDate() + diffToMonday);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        weeks.push({
          label: weekStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          start: weekStart,
          end: weekEnd,
        });
      }

      // For each week, count attendances
      const data = await Promise.all(
        weeks.map(async (w) => {
          const count = await prisma.attendance.count({
            where: {
              churchId,
              date: { gte: w.start, lte: w.end },
            },
          });
          return { semaine: w.label, presences: count };
        })
      );

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /conversion → visitor pipeline funnel
router.get(
  "/conversion",
  requireRole("SUPER_ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const statuses = ["NOUVEAU", "RELANCE", "CONVERTI", "BAPTISE", "INTEGRE"];

      const counts = await Promise.all(
        statuses.map(async (status) => ({
          status,
          count: await prisma.visitor.count({ where: { churchId, status: status as any } }),
        }))
      );

      const data = counts.map(({ status, count }) => ({
        etape: status === "NOUVEAU" ? "Nouveau" : status === "RELANCE" ? "Relancé" : status === "CONVERTI" ? "Converti" : status === "BAPTISE" ? "Baptisé" : "Intégré",
        count,
      }));

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /croissance → monthly new members last 12 months
router.get(
  "/croissance",
  requireRole("SUPER_ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const now = new Date();
      const months: { label: string; start: Date; end: Date }[] = [];

      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        months.push({
          label: start.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
          start,
          end,
        });
      }

      const data = await Promise.all(
        months.map(async (m) => {
          const count = await prisma.user.count({
            where: {
              churchId,
              createdAt: { gte: m.start, lte: m.end },
            },
          });
          return { mois: m.label, nouveauxMembres: count };
        })
      );

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /dons-types → répartition par type de don
router.get(
  "/dons-types",
  requireRole("SUPER_ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const donations = await prisma.donation.groupBy({
        by: ["type"],
        where: { churchId },
        _sum: { amount: true },
      });

      const data = donations.map((d) => ({
        type: d.type,
        montant: d._sum.amount ?? 0,
      }));

      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
