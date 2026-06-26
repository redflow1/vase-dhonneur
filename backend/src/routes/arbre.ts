import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

async function buildChurchTree(churchId: string): Promise<any> {
  const church = await prisma.church.findUnique({
    where: { id: churchId },
    include: {
      _count: { select: { members: { where: { isActive: true } } } },
      children: { select: { id: true } },
    },
  });

  if (!church) return null;

  const children = await Promise.all(
    church.children.map((child: { id: string }) => buildChurchTree(child.id))
  );

  return {
    id: church.id,
    name: church.name,
    city: church.city,
    pastorName: church.pastorName ?? "",
    foundedDate: church.foundedAt?.toISOString() ?? "",
    parentId: church.parentId ?? null,
    memberCount: church._count.members,
    children: children.filter(Boolean),
  };
}

// GET / → church tree (SuperAdmin voit tout, les autres voient leur branche)
router.get(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId, role } = (req as any).user;

      if (role === "SUPER_ADMIN") {
        // SuperAdmin voit toutes les racines (églises sans parent)
        const roots = await prisma.church.findMany({
          where: { parentId: null },
          select: { id: true },
        });

        const forest = await Promise.all(
          roots.map((r) => buildChurchTree(r.id))
        );

        return res.json({ tree: forest.length === 1 ? forest[0] : forest });
      }

      // ADMIN / PASTEUR → voit sa branche uniquement
      const tree = await buildChurchTree(churchId);
      res.json({ tree });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id → single church detail
router.get(
  "/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const church = await prisma.church.findFirst({
        where: { id },
        include: {
          parent: { select: { id: true, name: true } },
          children: {
            select: {
              id: true,
              name: true,
              _count: { select: { members: { where: { isActive: true } } } },
            },
          },
          _count: {
            select: {
              members: { where: { isActive: true } },
            },
          },
        },
      });

      if (!church) {
        return res.status(404).json({ message: "Église non trouvée" });
      }

      res.json({ church });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /all/summary → vue synthétique pour le réseau
router.get(
  "/all/summary",
  requireRole("SUPER_ADMIN"),
  async (_req: Request, res: Response) => {
    try {
      const churches = await prisma.church.findMany({
        select: {
          id: true,
          name: true,
          city: true,
          parentId: true,
          pastorName: true,
          foundedAt: true,
          _count: { select: { members: { where: { isActive: true } } } },
        },
        orderBy: { name: "asc" },
      });

      const totalMembers = churches.reduce(
        (sum, c) => sum + c._count.members,
        0
      );

      res.json({
        data: churches.map((c) => ({
          id: c.id,
          name: c.name,
          city: c.city,
          parentId: c.parentId,
          pastorName: c.pastorName ?? "",
          foundedDate: c.foundedAt?.toISOString() ?? "",
          memberCount: c._count.members,
        })),
        totalChurches: churches.length,
        totalMembers,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
