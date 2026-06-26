import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "vases-dhonneur-secret-key-2024";

export interface AuthPayload {
  userId: string;
  role: string;
  churchId: string;
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET) as AuthPayload;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Token invalide" });
  }
}
