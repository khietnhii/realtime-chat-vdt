import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import multer from "multer";
import path from "path";
import { env } from "../lib/env";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const r = Router();

r.post("/", requireAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  const name = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const size = req.file.size;

  const isImage = req.file.mimetype.startsWith("image/");
  const isVideo = req.file.mimetype.startsWith("video/");
  const isAudio = req.file.mimetype.startsWith("audio/");
  const type = isImage ? "IMAGE" : isVideo ? "VIDEO" : isAudio ? "AUDIO" : "FILE";

  res.json({ url, name, size, type });
});

export const uploadRouter = r;
