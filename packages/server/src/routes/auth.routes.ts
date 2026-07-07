import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as ctrl from "../controllers/auth.controller";
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const r = Router();
r.post("/register", ctrl.register);
r.post("/login", ctrl.login);
r.post("/check-email", ctrl.checkEmail);
r.post("/reset-password", ctrl.resetPassword);
r.post("/verify-email", ctrl.verifyEmail);
r.post("/resend-verification", ctrl.resendVerification);
r.get("/me", requireAuth, ctrl.me);
r.put("/me", requireAuth, ctrl.updateProfile);
r.post("/avatar", requireAuth, upload.single("avatar"), ctrl.uploadAvatar);
r.get("/users", requireAuth, ctrl.searchUsers);
export const authRouter = r;
