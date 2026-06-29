import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / — lister les tribus
router.get("/", async (req: Request, res: Response) => {
  try {
    const { churchId, role } = (req as any).user;
    const tribes = await prisma.tribe.findMany({
      where: role === "SUPER_ADMIN" ? {} : { churchId },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ data: tribes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST / — créer une tribu
router.post("/", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Le nom est requis" });
    const tribe = await prisma.tribe.create({
      data: { churchId, name: name.trim(), description },
    });
    res.status(201).json({ data: tribe });
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(400).json({ message: "Cette tribu existe déjà" });
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /:id — modifier une tribu
router.put("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, leaderId } = req.body;
    const tribe = await prisma.tribe.update({
      where: { id },
      data: { name, description, leaderId: leaderId || null },
    });
    res.json({ data: tribe });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /:id — supprimer une tribu
router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.tribe.delete({ where: { id } });
    res.json({ message: "Tribu supprimée" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
