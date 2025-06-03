// Impoting required modules
import mongoose from 'mongoose';

const { Schema } = mongoose;

// Define the Article Schema
const ArticleSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    tags: [{
        type: String
    }],
    category: {
        type: String,
        enum: ["Treatment", "Symptoms", "Prevention", "Myths", "Awareness"],
        default: "Awareness"
    },
    cover_image: {
        type: String
    },
    related_conditions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Condition"
    }],
    published_at: {
        type: Date,
        default: Date.now
    },
    is_published: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true 
});

const Article = mongoose.model('Article', ArticleSchema);
export default Article;