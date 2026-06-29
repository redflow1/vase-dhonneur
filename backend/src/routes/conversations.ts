import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / → user's conversations
router.get("/", async (req: Request, res: Response) => {
  try {
    const { userId, churchId } = (req as any).user;

    const conversations = await prisma.conversation.findMany({
      where: {
        churchId,
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      participants: c.participants.map((p: any) => p.user),
      lastMessage: c.messages[0] ?? null,
      updatedAt: c.updatedAt,
    }));

    res.json({ data });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// POST / → create conversation
router.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, churchId } = (req as any).user;
    const { participantIds, title, initialMessage } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ message: "Au moins un participant requis" });
    }

    const allIds = [...new Set([userId, ...participantIds])];

    const conversation = await prisma.conversation.create({
      data: {
        churchId,
        title: title ?? "",
        participants: {
          create: allIds.map((id: string) => ({ userId: id })),
        },
        ...(initialMessage
          ? { messages: { create: { senderId: userId, content: initialMessage } } }
          : {}),
      },
      include: {
        participants: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    const data = {
      ...conversation,
      participants: conversation.participants.map((p: any) => p.user),
    };

    res.status(201).json({ conversation: data });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// GET /:id/messages → get messages
router.get("/:id/messages", async (req: Request, res: Response) => {
  try {
    const { userId, churchId } = (req as any).user;
    const id = req.params.id as string;

    const conv = await prisma.conversation.findFirst({
      where: { id, churchId, participants: { some: { userId } } },
    });
    if (!conv) return res.status(404).json({ message: "Conversation non trouvée" });

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });

    res.json({ data: messages });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

// POST /:id/messages → send message
router.post("/:id/messages", async (req: Request, res: Response) => {
  try {
    const { userId, churchId } = (req as any).user;
    const id = req.params.id as string;
    const { content } = req.body;

    if (!content?.trim()) return res.status(400).json({ message: "Message vide" });

    const conv = await prisma.conversation.findFirst({
      where: { id, churchId, participants: { some: { userId } } },
    });
    if (!conv) return res.status(404).json({ message: "Conversation non trouvée" });

    const message = await prisma.message.create({
      data: { conversationId: id, senderId: userId, content },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
    });

    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });

    res.status(201).json({ message });
  } catch (error) { console.error(error); res.status(500).json({ message: "Erreur serveur" }); }
});

export default router;
