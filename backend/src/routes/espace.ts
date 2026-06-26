import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET /verset → current week's verse
router.get("/verset", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const verset = await prisma.weeklyVerse.findFirst({
      where: { churchId, weekStart: { lte: new Date() } },
      orderBy: { weekStart: "desc" },
    });

    res.json({ verset: verset ?? null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /annonces → announcements for user's church
router.get("/annonces", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const annonces = await prisma.announcement.findMany({
      where: { churchId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
    });

    res.json({ data: annonces });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /presences → user's own attendance records
router.get("/presences", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const attendances = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });

    res.json({ data: attendances });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /anniversaires → upcoming birthdays in same church
router.get("/anniversaires", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const members = await prisma.user.findMany({
      where: { churchId, isActive: true, birthDate: { not: null } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true,
      },
    });

    const today = new Date();
    const in30 = new Date(today);
    in30.setDate(today.getDate() + 30);

    const upcoming = members.filter((m) => {
      if (!m.birthDate) return false;
      const bd = new Date(m.birthDate);
      const thisYear = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
      const nextYear = new Date(today.getFullYear() + 1, bd.getMonth(), bd.getDate());
      return (
        (thisYear >= today && thisYear <= in30) ||
        (nextYear >= today && nextYear <= in30)
      );
    });

    upcoming.sort((a, b) => {
      const today2 = new Date();
      const getNext = (bd: Date) => {
        const t = new Date(today2.getFullYear(), bd.getMonth(), bd.getDate());
        if (t < today2) t.setFullYear(today2.getFullYear() + 1);
        return t;
      };
      return (
        getNext(new Date(a.birthDate!)).getTime() -
        getNext(new Date(b.birthDate!)).getTime()
      );
    });

    res.json({ data: upcoming });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /plan-lecture → reading plans with user's progress
router.get("/plan-lecture", async (req: Request, res: Response) => {
  try {
    const { userId, churchId } = (req as any).user;

    const plans = await prisma.readingPlan.findMany({
      where: { churchId },
      include: {
        progress: {
          where: { userId },
          select: { id: true, completedDays: true, done: true, updatedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = plans.map((plan) => ({
      id: plan.id,
      title: plan.title,
      totalDays: (plan as any).durationDays ?? null,
      progress: plan.progress[0] ?? null,
    }));

    res.json({ data: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /plan-lecture/:id → increment completedDays
router.put("/plan-lecture/:id", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const id = req.params.id as string;

    const plan = await prisma.readingPlan.findUnique({ where: { id } });
    if (!plan) return res.status(404).json({ message: "Plan de lecture non trouvé" });

    // Upsert user progress
    const progress = await prisma.readingProgress.upsert({
      where: { userId_planId: { userId, planId: id } },
      create: { userId, planId: id, completedDays: 1 },
      update: { completedDays: { increment: 1 } },
    });

    res.json({ progress });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
