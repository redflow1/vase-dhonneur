import multer from "multer";
import path from "path";

function makeStorage(subfolder: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join("uploads", subfolder)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

export const photoUpload = multer({
  storage: makeStorage("photos"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Seules les images sont acceptees"));
  },
});

export const audioUpload = multer({
  storage: makeStorage("audio"),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Seuls les fichiers audio sont acceptes"));
  },
});

export const documentUpload = multer({
  storage: makeStorage("documents"),
  limits: { fileSize: 10 * 1024 * 1024 },
});
