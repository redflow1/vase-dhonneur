import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// Helper: manual CSV row
function toCSVRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(",");
}

// GET / → events for church
router.get("/", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;

    const events = await prisma.event.findMany({
      where: { churchId },
      orderBy: { startDate: "desc" },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    res.json({ data: events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST / → create event
router.post(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { title, description, startDate, endDate, location, capacity, type, isPublic } = req.body;

      if (!title || !startDate) {
        return res.status(400).json({ message: "Titre et date de début requis" });
      }

      const event = await prisma.event.create({
        data: {
          churchId,
          title,
          description: description ?? null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          location: location ?? null,
          capacity: capacity ? parseInt(capacity) : null,
          type: type ?? null,
        },
      });

      res.status(201).json({ event });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /:id → update event
router.put(
  "/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { title, description, startDate, endDate, location, capacity, type } = req.body;

      const existing = await prisma.event.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Événement non trouvé" });

      const event = await prisma.event.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(startDate !== undefined && { startDate: new Date(startDate) }),
          ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
          ...(location !== undefined && { location }),
          ...(capacity !== undefined && { capacity: capacity ? parseInt(capacity) : null }),
          ...(type !== undefined && { type }),
        },
      });

      res.json({ event });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /:id → delete event
router.delete(
  "/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const existing = await prisma.event.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Événement non trouvé" });

      await prisma.event.delete({ where: { id } });
      res.json({ message: "Événement supprimé" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:id/inscription → self-register
router.post("/:id/inscription", async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const id = req.params.id as string;

    const event = await prisma.event.findFirst({ where: { id, churchId } });
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    // Check capacity
    if ((event as any).capacity) {
      const count = await prisma.eventRegistration.count({ where: { eventId: id } });
      if (count >= (event as any).capacity) {
        return res.status(400).json({ message: "Capacité maximale atteinte" });
      }
    }

    // Check if already registered
    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId: id, userId },
    });
    if (existing) return res.status(400).json({ message: "Déjà inscrit à cet événement" });

    const inscription = await prisma.eventRegistration.create({
      data: { eventId: id, userId },
    });

    res.status(201).json({ inscription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /:id/inscription → cancel registration
router.delete("/:id/inscription", async (req: Request, res: Response) => {
  try {
    const { churchId, userId } = (req as any).user;
    const id = req.params.id as string;

    const event = await prisma.event.findFirst({ where: { id, churchId } });
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    const existing = await prisma.eventRegistration.findFirst({
      where: { eventId: id, userId },
    });
    if (!existing) return res.status(404).json({ message: "Inscription non trouvée" });

    await prisma.eventRegistration.delete({ where: { id: existing.id } });
    res.json({ message: "Inscription annulée" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /:id/participants → participant list; if ?format=csv → CSV export
router.get("/:id/participants", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;
    const format = req.query.format as string;

    const event = await prisma.event.findFirst({ where: { id, churchId } });
    if (!event) return res.status(404).json({ message: "Événement non trouvé" });

    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId: id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    if (format === "csv") {
      let csv: string;
      try {
        const { stringify } = require("csv-stringify/sync");
        const rows = registrations.map((i: any) => ({
          ID: i.user.id,
          Prénom: i.user.firstName ?? "",
          Nom: i.user.lastName ?? "",
          Email: i.user.email ?? "",
          "Date inscription": new Date(i.createdAt).toLocaleDateString("fr-FR"),
        }));
        csv = stringify(rows, { header: true });
      } catch {
        const header = toCSVRow(["ID", "Prénom", "Nom", "Email", "Date inscription"]);
        const rows = registrations.map((i: any) =>
          toCSVRow([
            i.user.id,
            i.user.firstName,
            i.user.lastName,
            i.user.email,
            new Date(i.createdAt).toLocaleDateString("fr-FR"),
          ])
        );
        csv = [header, ...rows].join("\n");
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=participants-${id}.csv`);
      return res.send("\uFEFF" + csv);
    }

    res.json({ data: registrations, total: registrations.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
