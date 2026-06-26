import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// ─── SONGS ───────────────────────────────────────────────────────────────────

// GET /songs → songs list
router.get(
  "/songs",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const search = (req.query.search as string) ?? "";

      const songs = await prisma.song.findMany({
        where: {
          churchId,
          ...(search
            ? {
                OR: [
                  { title: { contains: search, mode: "insensitive" } },
                  { artist: { contains: search, mode: "insensitive" } },
                  { key: { contains: search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { title: "asc" },
      });

      res.json({ data: songs });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /songs → create song
router.post(
  "/songs",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { title, artist, key, lyrics, audioUrl } = req.body;

      if (!title) return res.status(400).json({ message: "Titre requis" });

      const song = await prisma.song.create({
        data: {
          churchId,
          title,
          artist: artist ?? null,
          key: key ?? null,
          lyrics: lyrics ?? null,
          audioUrl: audioUrl ?? null,
        },
      });

      res.status(201).json({ song });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /songs/:id → update song
router.put(
  "/songs/:id",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { title, artist, key, lyrics, audioUrl } = req.body;

      const existing = await prisma.song.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Chanson non trouvée" });

      const song = await prisma.song.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(artist !== undefined && { artist }),
          ...(key !== undefined && { key }),
          ...(lyrics !== undefined && { lyrics }),
          ...(audioUrl !== undefined && { audioUrl }),
        },
      });

      res.json({ song });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /songs/:id → delete song
router.delete(
  "/songs/:id",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const existing = await prisma.song.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Chanson non trouvée" });

      await prisma.song.delete({ where: { id } });

      res.json({ message: "Chanson supprimée" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// ─── SETLISTS ─────────────────────────────────────────────────────────────────

// GET /setlists → setlists list
router.get(
  "/setlists",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const setlists = await prisma.setlist.findMany({
        where: { churchId },
        orderBy: { date: "desc" },
        include: {
          _count: { select: { songs: true, musicians: true } },
        },
      });

      res.json({ data: setlists });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /setlists → create setlist
router.post(
  "/setlists",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { date, serviceId } = req.body;

      if (!date) return res.status(400).json({ message: "Date requise" });

      const setlist = await prisma.setlist.create({
        data: {
          churchId,
          date: new Date(date),
          serviceId: serviceId ?? null,
        },
      });

      res.status(201).json({ setlist });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /setlists/:id → setlist detail with songs and musicians
router.get(
  "/setlists/:id",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const setlist = await prisma.setlist.findFirst({
        where: { id, churchId },
        include: {
          songs: {
            orderBy: { order: "asc" },
            include: { song: true },
          },
          musicians: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
        },
      });

      if (!setlist) return res.status(404).json({ message: "Setlist non trouvée" });
      res.json({ setlist });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /setlists/:id/songs → add song to setlist
router.post(
  "/setlists/:id/songs",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { songId, order } = req.body;

      if (!songId) return res.status(400).json({ message: "songId requis" });

      const setlist = await prisma.setlist.findFirst({ where: { id, churchId } });
      if (!setlist) return res.status(404).json({ message: "Setlist non trouvée" });

      const song = await prisma.song.findFirst({ where: { id: songId, churchId } });
      if (!song) return res.status(404).json({ message: "Chanson non trouvée" });

      let itemOrder = order;
      if (itemOrder === undefined) {
        const last = await prisma.setlistSong.findFirst({
          where: { setlistId: id },
          orderBy: { order: "desc" },
        });
        itemOrder = (last?.order ?? 0) + 1;
      }

      const entry = await prisma.setlistSong.create({
        data: { setlistId: id, songId, order: itemOrder },
        include: { song: true },
      });

      res.status(201).json({ entry });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /setlists/:id/songs/:songId → remove song
router.delete(
  "/setlists/:id/songs/:songId",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const songId = req.params.songId as string;

      const setlist = await prisma.setlist.findFirst({ where: { id, churchId } });
      if (!setlist) return res.status(404).json({ message: "Setlist non trouvée" });

      await prisma.setlistSong.deleteMany({ where: { setlistId: id, songId } });

      res.json({ message: "Chanson retirée de la setlist" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /setlists/:id/musicians → assign musician
router.post(
  "/setlists/:id/musicians",
  requireRole("SUPER_ADMIN", "LOUANGE"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { userId, instrument } = req.body;

      if (!userId) return res.status(400).json({ message: "userId requis" });
      if (!instrument) return res.status(400).json({ message: "instrument requis" });

      const setlist = await prisma.setlist.findFirst({ where: { id, churchId } });
      if (!setlist) return res.status(404).json({ message: "Setlist non trouvée" });

      const musician = await prisma.setlistMusician.upsert({
        where: { setlistId_userId: { setlistId: id, userId } },
        create: { setlistId: id, userId, instrument },
        update: { instrument },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      });

      res.status(201).json({ musician });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
