import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import * as ctrl from "../controllers/auth.controller";
import multer from "multer";
import { cloudinaryStorage } from "../lib/cloudinary";

const upload = multer({ storage: cloudinaryStorage });

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
