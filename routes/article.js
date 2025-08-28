import express from "express";
import {createArticle, updateArticle, deleteArticle, getAllArticles, getArticleById} from "../controllers/article.js";
import { isAdmin, verifyToken } from '../middleware/guard.js';
import { apiLimiter } from '../middleware/limiter.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.use(apiLimiter);
router.get("/", getAllArticles);
router.get("/:id", getArticleById);

// Apply middleware only to routes below (protected routes)
router.use(verifyToken);
router.use(isAdmin);

// Protected routes with upload middleware
router.post("/", upload.single('cover_image'), createArticle);
router.put("/:id", upload.single('cover_image'), updateArticle);
router.delete("/:id", deleteArticle);

export default router;
