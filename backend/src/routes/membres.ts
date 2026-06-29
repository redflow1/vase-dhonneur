import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/roleCheck";

const router = Router();

// Rôles qu'un ADMIN peut assigner (pas SUPER_ADMIN ni ADMIN)
const ADMIN_ASSIGNABLE_ROLES = [
  "PASTEUR", "GDC", "COM", "LOUANGE", "JEUNESSE",
  "FEMMES", "HOMMES", "INTERCESSION", "ACCUEIL",
  "EVA", "MRS", "MEMBRE",
];

// Helper: manual CSV row
function toCSVRow(values: (string | number | null | undefined)[]): string {
  return values
    .map((v) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    })
    .join(",");
}

// GET / → paginated members list with search
router.get(
  "/",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;
      const search = (req.query.search as string) ?? "";
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
      const skip = (page - 1) * limit;
      const minimal = req.query.minimal === "true";

      const where: any = {
        churchId,
        isActive: true,
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const select = minimal
        ? { id: true, firstName: true, lastName: true }
        : {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            birthDate: true,
            address: true,
            role: true,
            isActive: true,
            createdAt: true,
            tribeId: true,
            tribe: { select: { id: true, name: true } },
            userDepartments: { select: { department: { select: { id: true, name: true } } } },
          };

      const [total, members] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({ where, skip, take: limit, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], select }),
      ]);

      // get notes count for each member
      const memberIds = members.map((m: any) => m.id);
      const notesCounts = await prisma.pastoralNote.groupBy({
        by: ["memberId"],
        where: { memberId: { in: memberIds } },
        _count: { id: true },
      });
      const notesCountMap = new Map(notesCounts.map((n: any) => [n.memberId, n._count.id]));

      const data = members.map((m: any) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        ...(!minimal && {
          email: m.email,
          phone: m.phone,
          birthDate: m.birthDate,
          address: m.address,
          role: m.role,
          isActive: m.isActive,
          createdAt: m.createdAt,
        }),
        prenom: m.firstName,
        nom: m.lastName,
        notesCount: notesCountMap.get(m.id) ?? 0,
        tribeId: m.tribeId,
        tribe: m.tribe ?? null,
        departments: m.userDepartments?.map((ud: any) => ud.department) ?? [],
      }));

      res.json({
        data,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /annuaire → public directory for all members
router.get("/annuaire", async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const tribeId = req.query.tribeId as string;
    const departmentId = req.query.departmentId as string;

    const where: any = { churchId, isActive: true };
    if (tribeId) where.tribeId = tribeId;
    if (departmentId) where.userDepartments = { some: { departmentId } };

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, role: true, phone: true, email: true,
        tribeId: true,
        tribe: { select: { id: true, name: true } },
        userDepartments: { select: { department: { select: { id: true, name: true } } } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const data = members.map((m: any) => ({
      ...m,
      departments: m.userDepartments?.map((ud: any) => ud.department) ?? [],
      userDepartments: undefined,
    }));

    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /anniversaires → birthdays in next 30 days
router.get(
  "/anniversaires",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const members = await prisma.user.findMany({
        where: { churchId, isActive: true, birthDate: { not: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          phone: true,
          email: true,
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
        return getNext(new Date(a.birthDate!)).getTime() - getNext(new Date(b.birthDate!)).getTime();
      });

      res.json({ data: upcoming });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /export/csv → CSV export
router.get(
  "/export/csv",
  requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"),
  async (req: Request, res: Response) => {
    try {
      const { churchId } = (req as any).user;

      const members = await prisma.user.findMany({
        where: { churchId, isActive: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          birthDate: true,
          address: true,
          role: true,
          createdAt: true,
        },
      });

      let csv: string;
      try {
        const { stringify } = require("csv-stringify/sync");
        const rows = members.map((m) => ({
          ID: m.id,
          Prénom: m.firstName,
          Nom: m.lastName,
          Email: m.email ?? "",
          Téléphone: m.phone ?? "",
          "Date de naissance": m.birthDate ? new Date(m.birthDate).toLocaleDateString("fr-FR") : "",
          Adresse: m.address ?? "",
          Rôle: m.role ?? "",
          "Membre depuis": new Date(m.createdAt).toLocaleDateString("fr-FR"),
        }));
        csv = stringify(rows, { header: true });
      } catch {
        // Manual CSV fallback
        const header = toCSVRow(["ID", "Prénom", "Nom", "Email", "Téléphone", "Date de naissance", "Adresse", "Rôle", "Membre depuis"]);
        const rows = members.map((m) =>
          toCSVRow([
            m.id,
            m.firstName,
            m.lastName,
            m.email,
            m.phone,
            m.birthDate ? new Date(m.birthDate).toLocaleDateString("fr-FR") : "",
            m.address,
            m.role,
            new Date(m.createdAt).toLocaleDateString("fr-FR"),
          ])
        );
        csv = [header, ...rows].join("\n");
      }

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=membres.csv");
      res.send("\uFEFF" + csv); // BOM for Excel
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// GET /:id → single member detail
router.get("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const member = await prisma.user.findFirst({
      where: { id, churchId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        photoUrl: true, birthDate: true, address: true, department: true,
        role: true, isActive: true, churchId: true, cellId: true, createdAt: true,
      },
    });

    if (!member) return res.status(404).json({ message: "Membre non trouvé" });
    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST / → create member (creates User)
router.post("/", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const { firstName, lastName, email, phone, birthDate, address, role, password } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: "Prénom et nom requis" });
    }

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // Valider le rôle (ADMIN ne peut pas créer d'autres ADMIN ou SUPER_ADMIN)
    const targetRole = role ?? "MEMBRE";
    const userRole = (req as any).user?.role;
    if (userRole === "ADMIN" && !ADMIN_ASSIGNABLE_ROLES.includes(targetRole)) {
      return res.status(403).json({ message: "Vous ne pouvez pas assigner ce rôle" });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 12);

    const member = await prisma.user.create({
      data: {
        churchId,
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone: phone ?? null,
        birthDate: birthDate ? new Date(birthDate) : null,
        address: address ?? null,
        role: targetRole,
        isActive: true,
      },
    });

    res.status(201).json({ member });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// PUT /:id → update member
router.put("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;
    const { firstName, lastName, email, phone, birthDate, address, role } = req.body;

    const existing = await prisma.user.findFirst({ where: { id, churchId, isActive: true } });
    if (!existing) return res.status(404).json({ message: "Membre non trouvé" });

    // Valider le rôle si modifié (ADMIN ne peut pas promouvoir)
    const userRole = (req as any).user?.role;
    if (role !== undefined && userRole === "ADMIN" && !ADMIN_ASSIGNABLE_ROLES.includes(role)) {
      return res.status(403).json({ message: "Vous ne pouvez pas assigner ce rôle" });
    }

    const member = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
        ...(address !== undefined && { address }),
        ...(role !== undefined && { role }),
      },
    });

    res.json({ member });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// DELETE /:id → soft delete
router.delete("/:id", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const existing = await prisma.user.findFirst({ where: { id, churchId } });
    if (!existing) return res.status(404).json({ message: "Membre non trouvé" });

    await prisma.user.update({ where: { id }, data: { isActive: false } });

    res.json({ message: "Membre désactivé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// GET /:id/presences → attendance history
router.get("/:id/presences", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;

    const member = await prisma.user.findFirst({ where: { id, churchId } });
    if (!member) return res.status(404).json({ message: "Membre non trouvé" });

    const attendances = await prisma.attendance.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
    });

    res.json({ data: attendances });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /:id/presences → record attendance
router.post("/:id/presences", requireRole("SUPER_ADMIN", "ADMIN", "PASTEUR"), async (req: Request, res: Response) => {
  try {
    const { churchId } = (req as any).user;
    const id = req.params.id as string;
    const { date, serviceType } = req.body;

    const member = await prisma.user.findFirst({ where: { id, churchId } });
    if (!member) return res.status(404).json({ message: "Membre non trouvé" });

    const attendance = await prisma.attendance.create({
      data: {
        userId: id,
        churchId,
        date: date ? new Date(date) : new Date(),
        serviceType: serviceType ?? null,
      },
    });

    res.status(201).json({ attendance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
