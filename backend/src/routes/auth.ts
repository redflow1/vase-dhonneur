import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { signToken, authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/roleCheck";

const router = Router();
const prisma = new PrismaClient();

// GET /api/auth/churches - Liste des eglises pour le dropdown
router.get("/churches", async (_req: Request, res: Response) => {
  try {
    const churches = await prisma.church.findMany({
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });
    res.json(churches);
  } catch (error) {
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// POST /api/auth/register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, churchName, churchCity, parentChurchId } = req.body;

    // Verifier si l'email existe
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Cet email est deja utilise" });
    }

    // Creer ou trouver l'eglise
    let church = await prisma.church.findFirst({
      where: { name: churchName, city: churchCity },
    });

    if (!church) {
      church = await prisma.church.create({
        data: {
          name: churchName,
          city: churchCity,
          parentId: parentChurchId || null,
        },
      });
    }

    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 12);

    // Creer l'utilisateur (forcé à MEMBRE — seuls les SuperAdmin peuvent créer des rôles supérieurs)
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        role: "VISITEUR",
        churchId: church.id,
      },
    });

    const token = signToken({
      userId: user.id,
      role: user.role,
      churchId: user.churchId,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        churchId: user.churchId,
        churchName: church.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
});

// POST /api/auth/create-admin — Réservé SUPER_ADMIN
router.post(
  "/create-admin",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, password, churchName, churchCity, parentChurchId } = req.body;

      if (!firstName || !lastName || !email || !password || !churchName || !churchCity) {
        return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: "Cet email est déjà utilisé" });
      }

      let church = await prisma.church.findFirst({
        where: { name: churchName, city: churchCity },
      });

      if (!church) {
        church = await prisma.church.create({
          data: {
            name: churchName,
            city: churchCity,
            parentId: parentChurchId || null,
          },
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          role: "ADMIN",
          churchId: church.id,
        },
      });

      res.status(201).json({
        message: "Admin créé avec succès",
        admin: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          churchId: user.churchId,
          churchName: church.name,
          churchCity: church.city,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur lors de la création de l'admin" });
    }
  }
);

// GET /api/auth/admins — Liste des admins (SuperAdmin)
router.get(
  "/admins",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  async (_req: Request, res: Response) => {
    try {
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          churchId: true,
          church: { select: { name: true, city: true, parentId: true } },
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ data: admins });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// PUT /api/auth/admins/:id/disable — Désactiver un admin
router.put(
  "/admins/:id/disable",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const admin = await prisma.user.findFirst({
        where: { id, role: "ADMIN" },
      });

      if (!admin) {
        return res.status(404).json({ message: "Admin non trouvé" });
      }

      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      res.json({ message: "Admin désactivé avec succès" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur" });
    }
  }
);

// POST /api/auth/login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { church: { select: { name: true } } },
    });

    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      churchId: user.churchId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        churchId: user.churchId,
        churchName: user.church.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur lors de la connexion" });
  }
});

export default router;
