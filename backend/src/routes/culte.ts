import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / → services list
router.get(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const services = await prisma.service.findMany({
        where: { churchId },
        orderBy: { date: "desc" },
        select: {
          id: true,
          title: true,
          date: true,
          status: true,
          theme: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      });

      res.json({ data: services });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST / → create service
router.post(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { title, date, theme } = req.body;

      if (!title || !date) {
        return res.status(400).json({ message: "Titre et date requis" });
      }

      const service = await prisma.service.create({
        data: {
          churchId,
          title,
          date: new Date(date),
          theme: theme ?? null,
          status: "BROUILLON",
        },
      });

      res.status(201).json({ service });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id → service with items
router.get(
  "/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const service = await prisma.service.findFirst({
        where: { id, churchId },
        include: {
          items: { orderBy: { order: "asc" } },
        },
      });

      if (!service) return res.status(404).json({ message: "Service non trouvé" });
      res.json({ service });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /:id → update service
router.put(
  "/:id",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { title, date, theme, status } = req.body;

      const existing = await prisma.service.findFirst({ where: { id, churchId } });
      if (!existing) return res.status(404).json({ message: "Service non trouvé" });

      const service = await prisma.service.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(date !== undefined && { date: new Date(date) }),
          ...(theme !== undefined && { theme }),
          ...(status !== undefined && { status }),
        },
      });

      res.json({ service });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /:id/items → add service item
router.post(
  "/:id/items",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const { role, userId, duration, notes, order } = req.body;

      const service = await prisma.service.findFirst({ where: { id, churchId } });
      if (!service) return res.status(404).json({ message: "Service non trouvé" });

      // Get next order if not provided
      let itemOrder = order;
      if (itemOrder === undefined) {
        const lastItem = await prisma.serviceItem.findFirst({
          where: { serviceId: id },
          orderBy: { order: "desc" },
        });
        itemOrder = (lastItem?.order ?? 0) + 1;
      }

      const item = await prisma.serviceItem.create({
        data: {
          serviceId: id,
          role: role ?? "AUTRE",
          userId: userId ?? null,
          duration: duration ?? null,
          notes: notes ?? null,
          order: itemOrder,
        },
      });

      res.status(201).json({ item });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// DELETE /:id/items/:itemId → remove item
router.delete(
  "/:id/items/:itemId",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;
      const itemId = req.params.itemId as string;

      const service = await prisma.service.findFirst({ where: { id, churchId } });
      if (!service) return res.status(404).json({ message: "Service non trouvé" });

      const item = await prisma.serviceItem.findFirst({ where: { id: itemId, serviceId: id } });
      if (!item) return res.status(404).json({ message: "Élément non trouvé" });

      await prisma.serviceItem.delete({ where: { id: itemId } });

      res.json({ message: "Élément supprimé" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PATCH /:id/valider → set status VALIDE (PASTEUR only)
router.patch(
  "/:id/valider",
  requireRole("PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const service = await prisma.service.findFirst({ where: { id, churchId } });
      if (!service) return res.status(404).json({ message: "Service non trouvé" });

      const updated = await prisma.service.update({
        where: { id },
        data: { status: "VALIDE" },
      });

      res.json({ service: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id/pdf → generate PDF with pdfkit
router.get(
  "/:id/pdf",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const service = await prisma.service.findFirst({
        where: { id, churchId },
        include: {
          items: { orderBy: { order: "asc" } },
        },
      });

      if (!service) return res.status(404).json({ message: "Service non trouvé" });

      try {
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({ margin: 50 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=service-${id}.pdf`
        );
        doc.pipe(res);

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text("Programme du Culte", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(14).font("Helvetica").text((service as any).title ?? "", { align: "center" });
        doc.fontSize(12).text(new Date((service as any).date).toLocaleDateString("fr-FR"), { align: "center" });
        doc.moveDown(1);

        if ((service as any).theme) {
          doc.fontSize(12).font("Helvetica-BoldOblique").text(`Thème : ${(service as any).theme}`);
          doc.moveDown(0.5);
        }

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Items
        (service as any).items.forEach((item: any, i: number) => {
          doc.fontSize(12).font("Helvetica-Bold").text(`${i + 1}. ${item.role}`);
          if (item.notes) {
            doc.fontSize(11).font("Helvetica").text(`   ${item.notes}`);
          }
          if (item.duration) {
            doc.fontSize(10).fillColor("gray").text(`   Durée : ${item.duration} min`);
            doc.fillColor("black");
          }
          doc.moveDown(0.4);
        });

        doc.end();
      } catch {
        res.status(500).json({ message: "PDF generation non disponible" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

export default router;
