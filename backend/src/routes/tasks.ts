import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

const TASK_SELECT: any = {
  id: true, title: true, description: true, status: true, dueDate: true, createdAt: true,
  assignee: { select: { id: true, firstName: true, lastName: true } },
  creator: { select: { id: true, firstName: true, lastName: true } },
};

// GET / → tasks for church
router.get("/", async (req: Request, res: Response) => {
  try {
    const { churchId, userId, role } = (req as any).user;
    const status = req.query.status as string;

    const where: any = { churchId };
    if (status) where.status = status;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      where.OR = [{ assignedTo: userId }, { createdBy: userId }];
    }

    const tasks = await prisma.task.findMany({
      where,
      select: TASK_SELECT,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    res.json({ data: tasks });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// POST / → create task
router.post("/", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const { title, description, assignedTo, dueDate } = req.body;

    if (!title?.trim()) return res.status(400).json({ message: "Titre requis" });

    const task = await prisma.task.create({
      data: {
        churchId, title: title.trim(), description: description ?? null,
        assignedTo: assignedTo ?? null, createdBy: userId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      select: TASK_SELECT,
    });

    res.status(201).json({ task });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// PUT /:id → update task (status, etc.)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const existing = await prisma.task.findFirst({ where: { id, churchId } });
    if (!existing) return res.status(404).json({ message: "Tâche non trouvée" });

    const { title, description, status, assignedTo, dueDate } = req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      },
      select: TASK_SELECT,
    });

    res.json({ task });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// DELETE /:id
router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const existing = await prisma.task.findFirst({ where: { id, churchId } });
    if (!existing) return res.status(404).json({ message: "Tâche non trouvée" });

    await prisma.task.delete({ where: { id } });
    res.json({ message: "Tâche supprimée" });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

export default router;
