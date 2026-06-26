import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / → cells list for church
router.get("/", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const cells = await prisma.cell.findMany({
      where: { churchId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true, meetings: true } },
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.json({ data: cells });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST / → create cell
router.post("/", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const { name, leaderId, description } = req.body;

    if (!name) return res.status(400).json({ message: "Nom de la cellule requis" });
    if (!leaderId) return res.status(400).json({ message: "leaderId requis" });

    const cell = await prisma.cell.create({
      data: {
        churchId,
        name,
        leaderId,
        description: description ?? null,
      },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    res.status(201).json({ cell });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /rapport-mensuel → monthly aggregate per cell
router.get("/rapport-mensuel", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const month = req.query.month as string;
    const year = req.query.year as string;

    const now = new Date();
    const targetMonth = month ? parseInt(month) - 1 : now.getMonth();
    const targetYear = year ? parseInt(year) : now.getFullYear();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const cells = await prisma.cell.findMany({
      where: { churchId },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
        meetings: {
          where: {
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          select: {
            id: true,
            date: true,
            attendeeIds: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const rapport = cells.map((c) => ({
      id: c.id,
      name: c.name,
      leader: c.leader,
      totalMembers: c._count.members,
      meetingCount: c.meetings.length,
      avgAttendance:
        c.meetings.length > 0
          ? Math.round(
              c.meetings.reduce((sum, r) => sum + (r.attendeeIds?.length ?? 0), 0) /
                c.meetings.length
            )
          : 0,
    }));

    res.json({ data: rapport, period: { month: targetMonth + 1, year: targetYear } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /:id → cell detail with members and meetings
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const cell = await prisma.cell.findFirst({
      where: { id, churchId },
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          select: { id: true, firstName: true, lastName: true, phone: true, email: true },
        },
        meetings: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    });

    if (!cell) return res.status(404).json({ message: "Cellule non trouvée" });
    res.json({ cell });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /:id/meetings → record meeting
router.post("/:id/meetings", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;
    const { date, location, topic, attendeeIds, notes } = req.body;

    if (!date) return res.status(400).json({ message: "Date requise" });

    const cell = await prisma.cell.findFirst({ where: { id, churchId } });
    if (!cell) return res.status(404).json({ message: "Cellule non trouvée" });

    const meeting = await prisma.cellMeeting.create({
      data: {
        cellId: id,
        date: new Date(date),
        location: location ?? null,
        topic: topic ?? null,
        attendeeIds: attendeeIds ?? [],
      },
    });

    res.status(201).json({ meeting });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /:id/meetings/:meetingId → update meeting
router.put("/:id/meetings/:meetingId", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;
    const meetingId = req.params.meetingId as string;
    const { date, location, topic, attendeeIds, minutes } = req.body;

    const cell = await prisma.cell.findFirst({ where: { id, churchId } });
    if (!cell) return res.status(404).json({ message: "Cellule non trouvée" });

    const existingMeeting = await prisma.cellMeeting.findFirst({
      where: { id: meetingId, cellId: id },
    });
    if (!existingMeeting) return res.status(404).json({ message: "Réunion non trouvée" });

    const meeting = await prisma.cellMeeting.update({
      where: { id: meetingId },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(topic !== undefined && { topic }),
        ...(attendeeIds !== undefined && { attendeeIds }),
        ...(minutes !== undefined && { minutes }),
      },
    });

    res.json({ meeting });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
