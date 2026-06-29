import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import arbreRoutes from "./routes/arbre";
import membresRoutes from "./routes/membres";
import espaceRoutes from "./routes/espace";
import culteRoutes from "./routes/culte";
import louangeRoutes from "./routes/louange";
import communicationRoutes from "./routes/communication";
import spirituelRoutes from "./routes/spirituel";
import visiteursRoutes from "./routes/visiteurs";
import financesRoutes from "./routes/finances";
import evenementsRoutes from "./routes/evenements";
import sallesRoutes from "./routes/salles";
import cellulesRoutes from "./routes/cellules";
import pastoralRoutes from "./routes/pastoral";
import certificatsRoutes from "./routes/certificats";
import analytiqueRoutes from "./routes/analytique";
import reseauRoutes from "./routes/reseau";
import postsRoutes from "./routes/posts";
import tribesRoutes from "./routes/tribes";
import departmentsRoutes from "./routes/departments";
import notificationsRoutes from "./routes/notifications";
import conversationsRoutes from "./routes/conversations";
import tasksRoutes from "./routes/tasks";
import { authMiddleware } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Public routes
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Protected routes (require JWT)
app.use("/api/arbre", authMiddleware, arbreRoutes);
app.use("/api/membres", authMiddleware, membresRoutes);
app.use("/api/espace", authMiddleware, espaceRoutes);
app.use("/api/culte", authMiddleware, culteRoutes);
app.use("/api/louange", authMiddleware, louangeRoutes);
app.use("/api/communication", authMiddleware, communicationRoutes);
app.use("/api/spirituel", authMiddleware, spirituelRoutes);
app.use("/api/visiteurs", authMiddleware, visiteursRoutes);
app.use("/api/finances", authMiddleware, financesRoutes);
app.use("/api/evenements", authMiddleware, evenementsRoutes);
app.use("/api/salles", authMiddleware, sallesRoutes);
app.use("/api/cellules", authMiddleware, cellulesRoutes);
app.use("/api/pastoral", authMiddleware, pastoralRoutes);
app.use("/api/certificats", authMiddleware, certificatsRoutes);
app.use("/api/analytique", authMiddleware, analytiqueRoutes);
app.use("/api/reseau", authMiddleware, reseauRoutes);
app.use("/api/posts", authMiddleware, postsRoutes);
app.use("/api/tribes", authMiddleware, tribesRoutes);
app.use("/api/departments", authMiddleware, departmentsRoutes);
app.use("/api/notifications", authMiddleware, notificationsRoutes);
app.use("/api/conversations", authMiddleware, conversationsRoutes);
app.use("/api/tasks", authMiddleware, tasksRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
