import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET /eglises → all churches with member counts
router.get(
  "/eglises",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const eglises = await prisma.church.findMany({
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: { members: { where: { isActive: true } } },
          },
          parent: { select: { id: true, name: true } },
        },
      });

      const data = eglises.map((e: any) => ({
        id: e.id,
        name: e.name,
        city: e.city,
        pastor: e.pastorName ?? "",
        memberCount: e._count.members,
        foundedDate: e.foundedAt?.toISOString() ?? "",
        parentId: e.parentId,
        parentName: e.parent?.name ?? null,
      }));

      res.json({ data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /sermons-partages → sermons where isShared=true across ALL churches
router.get(
  "/sermons-partages",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const sermons = await prisma.sermon.findMany({
        where: { isShared: true },
        orderBy: { date: "desc" },
        include: {
          church: { select: { id: true, name: true } },
        },
      });

      res.json({ data: sermons });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /eglises-kpis → KPIs par église (SUPER_ADMIN)
router.get(
  "/eglises-kpis",
  requireRole("SUPER_ADMIN"),
  async (_req: Request, res: Response) => {
    try {
      const churches = await prisma.church.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          _count: {
            select: {
              members: { where: { isActive: true } },
              visitors: true,
              cells: true,
            },
          },
          donations: { select: { amount: true } },
        },
      });

      const data = churches.map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        memberCount: c._count.members,
        visiteurCount: c._count.visitors,
        donTotal: c.donations.reduce((sum, d) => sum + d.amount, 0),
        celluleCount: c._count.cells,
      }));

      res.json({ data });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /sermons/:id/partager → toggle isShared
router.put(
  "/sermons/:id/partager",
  requireRole("SUPER_ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const existing = await prisma.sermon.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Sermon non trouvé" });

      const sermon = await prisma.sermon.update({
        where: { id },
        data: { isShared: !(existing as any).isShared },
      });

      res.json({ sermon });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /stats-globales → aggregate KPIs across all churches (SUPER_ADMIN only)
router.get(
  "/stats-globales",
  requireRole("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const [
        totalChurches,
        totalMembers,
        activeMembers,
        totalVisitors,
        totalDonationsAgg,
        totalCells,
        totalUsers,
        totalSermons,
      ] = await Promise.all([
        prisma.church.count(),
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.visitor.count(),
        prisma.donation.aggregate({ _sum: { amount: true } }),
        prisma.cell.count(),
        prisma.user.count(),
        prisma.sermon.count(),
      ]);

      // Per-church member breakdown (top 10 by member count)
      const perChurch = await prisma.church.findMany({
        select: {
          id: true,
          name: true,
          _count: { select: { members: { where: { isActive: true } } } },
        },
        orderBy: { members: { _count: "desc" } },
        take: 10,
      });

      res.json({
        totalEglises: totalChurches,
        totalMembres: totalMembers,
        membresActifs: activeMembers,
        totalVisiteurs: totalVisitors,
        totalDons: totalDonationsAgg._sum.amount ?? 0,
        totalCellules: totalCells,
        totalSermons,
        topChurches: perChurch.map((c) => ({
          id: c.id,
          name: c.name,
          memberCount: c._count.members,
        })),
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
