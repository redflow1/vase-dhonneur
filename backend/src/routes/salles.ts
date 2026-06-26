import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / → rooms list
router.get(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const rooms = await prisma.room.findMany({
        where: { churchId },
        orderBy: { name: "asc" },
        include: {
          _count: { select: { bookings: true } },
        },
      });

      res.json({ data: rooms });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST / → create room
router.post(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { name, capacity, features } = req.body;

      if (!name) return res.status(400).json({ message: "Nom de la salle requis" });

      const room = await prisma.room.create({
        data: {
          churchId,
          name,
          capacity: capacity ? parseInt(capacity) : null,
          features: features ?? null,
        },
      });

      res.status(201).json({ room });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id/disponibilites → bookings for room (calendar data)
router.get(
  "/:id/disponibilites",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const month = req.query.month as string;
      const year = req.query.year as string;

      const room = await prisma.room.findFirst({ where: { id, churchId } });
      if (!room) return res.status(404).json({ message: "Salle non trouvée" });

      let dateFilter: any = {};
      if (month && year) {
        const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
        dateFilter = { startTime: { gte: startOfMonth, lte: endOfMonth } };
      }

      const bookings = await prisma.roomBooking.findMany({
        where: { roomId: id, ...dateFilter },
        orderBy: { startTime: "asc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });

      res.json({ data: bookings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:id/reserver → create booking (EN_ATTENTE)
router.post("/:id/reserver", async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const id = req.params.id as string;
    const { title, startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ message: "Dates de début et fin requises" });
    }

    if (!title) {
      return res.status(400).json({ message: "Titre requis" });
    }

    const room = await prisma.room.findFirst({ where: { id, churchId } });
    if (!room) return res.status(404).json({ message: "Salle non trouvée" });

    // Check for conflicts with approved bookings
    const conflict = await prisma.roomBooking.findFirst({
      where: {
        roomId: id,
        status: "APPROUVE",
        OR: [
          {
            startTime: { lte: new Date(endTime) },
            endTime: { gte: new Date(startTime) },
          },
        ],
      },
    });

    if (conflict) {
      return res.status(409).json({ message: "La salle est déjà réservée pour cette période" });
    }

    const booking = await prisma.roomBooking.create({
      data: {
        roomId: id,
        userId,
        title,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: "EN_ATTENTE",
      },
    });

    res.status(201).json({ booking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /bookings/pending → réservations en attente
router.get(
  "/bookings/pending",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const bookings = await prisma.roomBooking.findMany({
        where: {
          room: { churchId },
          status: "EN_ATTENTE",
        },
        orderBy: { createdAt: "asc" },
        include: {
          room: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.json({ data: bookings });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PATCH /bookings/:id → approve/reject
router.patch(
  "/bookings/:id",
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { status } = req.body;

      if (!["APPROUVE", "REJETE", "ANNULE"].includes(status)) {
        return res.status(400).json({ message: "Statut invalide (APPROUVE, REJETE, ANNULE)" });
      }

      // Verify the booking belongs to this church
      const booking = await prisma.roomBooking.findFirst({
        where: { id },
        include: { room: { select: { churchId: true } } },
      });

      if (!booking || booking.room.churchId !== churchId) {
        return res.status(404).json({ message: "Réservation non trouvée" });
      }

      const updated = await prisma.roomBooking.update({
        where: { id },
        data: { status },
      });

      res.json({ booking: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
