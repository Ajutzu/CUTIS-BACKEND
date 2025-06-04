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

// Importing routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import articleRoutes from './routes/article.js';
import tokenRoutes from './routes/token.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';

// Importing middleware
import { verifyToken } from './middleware/guard.js';
import errorHandler from './middleware/fallback.js';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

dotenv.config();
const server = express();
const PORT = process.env.PORT || 3002;

// Middleware
server.use(cors({
    origin: [process.env.CORS_ORIGIN, 'https://cutis-client-user-ajutzus-projects.vercel.app'],
    credentials: true
}));
server.use(express.json());
server.use(cookieParser());
server.use(helmet());

// Routes
server.use('/api/auth', authRoutes);
server.use('/api/user', verifyToken, userRoutes);
server.use('/api/article', articleRoutes);
server.use('/api/token', tokenRoutes);
server.use('/api/ai', aiRoutes);
server.use('/api/chat/', chatRoutes);

server.use(errorHandler);

server.listen(PORT, () => {
    console.log(colors.green(`🚀 Server is running on port ${PORT}`));
});

connectToCutisDB();

