import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / — lister les départements
router.get("/", async (req: Request, res: Response) => {
  try {
    const { churchId, role } = (req as any).user;
    const depts = await prisma.department.findMany({
      where: role === "SUPER_ADMIN" ? {} : { churchId },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    });
    res.json({ data: depts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST / — créer un département
router.post("/", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Le nom est requis" });
    const dept = await prisma.department.create({
      data: { churchId, name: name.trim(), description },
    });
    res.status(201).json({ data: dept });
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(400).json({ message: "Ce département existe déjà" });
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /:id — modifier un département
router.put("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, leaderId } = req.body;
    const dept = await prisma.department.update({
      where: { id },
      data: { name, description, leaderId: leaderId || null },
    });
    res.json({ data: dept });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /:id — supprimer un département
router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.department.delete({ where: { id } });
    res.json({ message: "Département supprimé" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /:id/members — ajouter un membre au département
router.post("/:id/members", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    await prisma.userDepartment.create({
      data: { userId, departmentId: id },
    });
    res.status(201).json({ message: "Membre ajouté" });
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(400).json({ message: "Déjà membre" });
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /:id/members/:userId — retirer un membre
router.delete("/:id/members/:userId", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    await prisma.userDepartment.delete({
      where: { userId_departmentId: { userId, departmentId: id } },
    });
    res.json({ message: "Membre retiré" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
