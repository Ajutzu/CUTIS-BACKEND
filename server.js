// Impoting required modules
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import colors from 'colors';

// Importing database connection
import connectToCutisDB from './database/connection.js';

// Importing models
import './models/article.js';
import './models/condition.js';
import './models/user.js';
import './models/result.js';
import './models/maps.js';

// Importing routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import articleRoutes from './routes/article.js';
import tokenRoutes from './routes/token.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';
import mapRoutes from './routes/maps.js';

// Importing middleware
import errorHandler from './middleware/fallback.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

dotenv.config();
const server = express();
const PORT = process.env.PORT || 3002;

// For Render
server.set('trust proxy', 1);

// Middleware
server.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
server.use(express.json());
server.use(cookieParser());
server.use(helmet());

// Routes
server.use('/api/auth', authRoutes);
server.use('/api/user', userRoutes);
server.use('/api/article', articleRoutes);
server.use('/api/token', tokenRoutes);
server.use('/api/ai', aiRoutes);
server.use('/api/chat/', chatRoutes);
server.use('/api/maps', mapRoutes);

server.use(errorHandler);

// Start 
server.listen(PORT, () => {
    console.log(colors.green(`🚀 Server is running on port ${PORT}`));
});

connectToCutisDB();

