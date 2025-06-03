import express from "express";
import {createArticle, updateArticle, deleteArticle, getAllArticles, getArticleById} from "../controllers/article.js";
import { isAdmin, verifyToken } from '../middleware/guard.js';
import { apiLimiter } from '../middleware/limiter.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post("/", verifyToken, apiLimiter, isAdmin, upload.single('cover_image'), createArticle);
router.put("/:id", verifyToken, apiLimiter, isAdmin, upload.single('cover_image'), updateArticle);
router.delete("/:id", verifyToken, apiLimiter, isAdmin, deleteArticle);
router.get("/", apiLimiter, getAllArticles);
router.get("/:id", apiLimiter, getArticleById);

export default router;
