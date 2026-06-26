import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";
import { encrypt, decrypt } from "../lib/crypto";

const router = Router();

// All routes require PASTEUR role
function assertPasteur(req: Request, res: Response): boolean {
  if ((req as any).user.role !== "PASTEUR") {
    res.status(403).json({ message: "Accès réservé au Pasteur" });
    return false;
  }
  return true;
}

// GET / → all pastoral notes for pastor's church (decrypt content)
router.get(
  "/",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    if (!assertPasteur(req, res)) return;
    try {
      const { churchId } = (req as any).user;

      const notes = await prisma.pastoralNote.findMany({
        where: { churchId },
        orderBy: { createdAt: "desc" },
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
          pastor: { select: { firstName: true, lastName: true } },
        },
      });

      const transformed = notes.map((n) => ({
        id: n.id,
        content: decrypt(n.encryptedContent),
        date: n.createdAt,
        reminderDate: n.reminderDate,
        memberId: n.memberId,
        auteur: n.pastor ? `${n.pastor.firstName} ${n.pastor.lastName}` : "",
      }));

      res.json({ data: transformed });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /rappels → notes with reminderDate <= today + 7 days
router.get(
  "/rappels",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    if (!assertPasteur(req, res)) return;
    try {
      const { churchId } = (req as any).user;

      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);

      const notes = await prisma.pastoralNote.findMany({
        where: {
          churchId,
          reminderDate: { lte: in7Days },
        },
        orderBy: { reminderDate: "asc" },
        include: {
          member: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const transformed = notes.map((n) => ({
        id: n.id,
        content: decrypt(n.encryptedContent),
        date: n.createdAt,
        reminderDate: n.reminderDate,
        memberId: n.memberId,
        memberName: n.member ? `${n.member.firstName} ${n.member.lastName}` : "",
      }));

      res.json({ data: transformed });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:memberId → create note (encrypt content)
// Also transforms the response to match the frontend note format
router.post(
  "/:memberId",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    if (!assertPasteur(req, res)) return;
    try {
      const { churchId, userId } = (req as any).user;
      const memberId = req.params.memberId as string;
      const { content, reminderDate } = req.body;

      if (!content) return res.status(400).json({ message: "Contenu requis" });

      const member = await prisma.user.findFirst({ where: { id: memberId, churchId } });
      if (!member) return res.status(404).json({ message: "Membre non trouvé" });

      const encryptedContent = encrypt(content);

      const note = await prisma.pastoralNote.create({
        data: {
          churchId,
          memberId,
          pastorId: userId,
          encryptedContent,
          reminderDate: reminderDate ? new Date(reminderDate) : null,
        },
      });

      res.status(201).json({ id: note.id, content, date: note.createdAt, reminderDate: note.reminderDate, auteur: "" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:memberId → get notes for member (decrypt)
router.get(
  "/:memberId",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    if (!assertPasteur(req, res)) return;
    try {
      const { churchId } = (req as any).user;
      const memberId = req.params.memberId as string;

      const member = await prisma.user.findFirst({ where: { id: memberId, churchId } });
      if (!member) return res.status(404).json({ message: "Membre non trouvé" });

      const notes = await prisma.pastoralNote.findMany({
        where: { memberId, churchId },
        orderBy: { createdAt: "desc" },
        include: {
          pastor: { select: { firstName: true, lastName: true } },
        },
      });

      const transformed = notes.map((n) => ({
        id: n.id,
        content: decrypt(n.encryptedContent),
        date: n.createdAt,
        reminderDate: n.reminderDate,
        auteur: n.pastor ? `${n.pastor.firstName} ${n.pastor.lastName}` : "",
      }));

      res.json(transformed);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /:noteId → update note (re-encrypt)
router.put(
  "/:noteId",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    if (!assertPasteur(req, res)) return;
    try {
      const { churchId } = (req as any).user;
      const noteId = req.params.noteId as string;
      const { content, reminderDate } = req.body;

      const existing = await prisma.pastoralNote.findFirst({ where: { id: noteId, churchId } });
      if (!existing) return res.status(404).json({ message: "Note non trouvée" });

      const note = await prisma.pastoralNote.update({
        where: { id: noteId },
        data: {
          ...(content !== undefined && { encryptedContent: encrypt(content) }),
          ...(reminderDate !== undefined && {
            reminderDate: reminderDate ? new Date(reminderDate) : null,
          }),
        },
      });

      const plainContent = content ?? decrypt(note.encryptedContent);
      res.json({ id: note.id, content: plainContent, date: note.createdAt, reminderDate: note.reminderDate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /:noteId → delete note
router.delete(
  "/:noteId",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    if (!assertPasteur(req, res)) return;
    try {
      const { churchId } = (req as any).user;
      const noteId = req.params.noteId as string;

      const existing = await prisma.pastoralNote.findFirst({ where: { id: noteId, churchId } });
      if (!existing) return res.status(404).json({ message: "Note non trouvée" });

      await prisma.pastoralNote.delete({ where: { id: noteId } });

      res.json({ message: "Note supprimée" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
