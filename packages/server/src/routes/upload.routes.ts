import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import multer from "multer";
import { cloudinaryStorage } from "../lib/cloudinary";

const upload = multer({
  storage: cloudinaryStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const r = Router();

r.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // multer-storage-cloudinary returns the Cloudinary URL in req.file.path
  const url = req.file.path;
  const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const size = req.file.size;

  const isImage = req.file.mimetype.startsWith("image/");
  const isVideo = req.file.mimetype.startsWith("video/");
  const isAudio = req.file.mimetype.startsWith("audio/");
  const type = isImage ? "IMAGE" : isVideo ? "VIDEO" : isAudio ? "AUDIO" : "FILE";

  res.json({ url, name, size, type });
});

export const uploadRouter = r;
