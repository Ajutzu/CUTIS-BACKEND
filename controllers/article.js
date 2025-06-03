import Article from "../models/article.js";
import { logUserActivityAndRequest } from "../middleware/logger.js";

// Create a new article
export const createArticle = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.cover_image = req.file.path; 
    }
    const article = new Article(req.body);
    await article.save();
    await logUserActivityAndRequest({
      userId: req.user.id,
      action: "Create Article",
      module: "Article",
      status: "Success",
      req,
    });
    res.status(201).json({ message: "Article created successfully." });
  } catch (error) {
    next(error);
  }
};

// Update an article
export const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedArticle = await Article.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedArticle) {
      return res.status(404).json({ message: "Article not found." });
    }
    await logUserActivityAndRequest({
      userId: req.user.id,
      action: "Update Article",
      module: "Article",
      status: "Success",
      req,
    });
    res.json({ message: "Article updated successfully." });
  } catch (error) {
    next(error);
  }
};

// Delete an article
export const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Article.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Article not found." });
    }
    await logUserActivityAndRequest({
      userId: req.user.id,
      action: "Delete Article",
      module: "Article",
      status: "Success",
      req,
    });
    res.json({ message: "Article deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// Get all articles
export const getAllArticles = async (req, res, next) => {
  try {
    const articles = await Article.find({}, "-content").populate(
      "related_conditions"
    );
    res.json(articles);
  } catch (error) {
    next(error);
  }
};

// Get a single article by ID
export const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id).populate("related_conditions");
    if (!article) {
      return res.status(404).json({ message: "Article not found." });
    }
    res.json(article);
  } catch (error) {
    next(error);
  }
};
