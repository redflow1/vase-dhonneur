import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// GET / → certificates list
router.get(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const certificates = await prisma.certificate.findMany({
        where: { churchId },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.json({ data: certificates });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST / → generate certificate
router.post(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const { userId, type, data } = req.body;

      if (!type) return res.status(400).json({ message: "Type de certificat requis" });
      if (!userId) return res.status(400).json({ message: "userId requis" });

      const certificate = await prisma.certificate.create({
        data: {
          churchId,
          userId,
          type,
          data: data ?? {},
          issueDate: new Date(),
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.status(201).json({ certificate });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id/pdf → generate and pipe PDF
router.get(
  "/:id/pdf",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const id = req.params.id as string;

      const certificate = await prisma.certificate.findFirst({
        where: { id, churchId },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          church: { select: { name: true } },
        },
      });

      if (!certificate) return res.status(404).json({ message: "Certificat non trouvé" });

      try {
        const PDFDocument = require("pdfkit");
        const doc = new PDFDocument({ size: "A4", margin: 60 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=certificat-${id}.pdf`
        );
        doc.pipe(res);

        // Certificate design
        doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke();
        doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70).stroke();

        doc.moveDown(3);
        doc.fontSize(28).font("Helvetica-Bold").text("CERTIFICAT", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(18).font("Helvetica").text((certificate as any).type ?? "", { align: "center" });
        doc.moveDown(2);

        if ((certificate as any).church?.name) {
          doc
            .fontSize(14)
            .text(`Délivré par : ${(certificate as any).church.name}`, { align: "center" });
          doc.moveDown(1);
        }

        if ((certificate as any).user) {
          const fullName = `${(certificate as any).user.firstName} ${(certificate as any).user.lastName}`;
          doc.fontSize(16).font("Helvetica-Bold").text(`Décerné à : ${fullName}`, { align: "center" });
          doc.moveDown(1);
        }

        // Custom data fields
        const certData = (certificate as any).data as Record<string, string> | null;
        if (certData && typeof certData === "object") {
          Object.entries(certData).forEach(([key, value]) => {
            doc.fontSize(12).font("Helvetica").text(`${key} : ${value}`, { align: "center" });
          });
          doc.moveDown(1);
        }

        doc
          .fontSize(12)
          .font("Helvetica")
          .text(
            `Date d'émission : ${new Date((certificate as any).issueDate).toLocaleDateString("fr-FR")}`,
            { align: "center" }
          );

        doc.moveDown(4);
        doc.fontSize(11).text("_______________________", { align: "center" });
        doc.fontSize(10).text("Signature & Cachet", { align: "center" });

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
