import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET / → user's notifications
router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ data: notifications, unreadCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /:id/read → mark one as read
router.put("/:id/read", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const id = req.params.id as string;

    const notif = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notif) return res.status(404).json({ message: "Notification non trouvée" });

    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ message: "ok" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /read-all → mark all as read
router.put("/read-all", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ message: "ok" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
