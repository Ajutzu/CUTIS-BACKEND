// Impoting required modules
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import colors from 'colors';

// Importing database connection
import connectToCutisDB from './database/connection.js';

// Importing cache and normal storage models
import './models/article.js';
import './models/condition.js';
import './models/result.js';
import './models/maps.js';
import './models/conversation.js';
import './models/maps.js';

// Imoprting users storage functionalities
export { default as User } from './models/user.js';
export { default as ConditionHistory } from './models/condition-history.js';
export { default as SpecialistHistory } from './models/specialist-history.js';
export { default as ClinicHistory } from './models/clinic-history.js';
export { default as MedicalHistory } from './models/medical-history.js';
export { default as ActivityLog } from './models/activity-log.js';
export { default as RequestLog } from './models/request-log.js';

// Importing routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import articleRoutes from './routes/article.js';
import tokenRoutes from './routes/token.js';
import aiRoutes from './routes/ai.js';
import chatRoutes from './routes/chat.js';
import mapRoutes from './routes/maps.js';
import conversationRoutes from './routes/conversation.js';
import logsRoutes from './routes/logs.js';
import managementRoutes from './routes/management.js';
import dashboardRoutes from './routes/dashboard.js';

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
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
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
server.use('/api/chat', chatRoutes);
server.use('/api/maps', mapRoutes);
server.use('/api/conversation', conversationRoutes);
server.use('/api/logs', logsRoutes);
server.use('/api/management', managementRoutes);
server.use('/api/dashboard', dashboardRoutes);

server.use(errorHandler);

// Start 
server.listen(PORT, () => {
    console.log(colors.green(`🚀 Server is running on port ${PORT}`));
});

connectToCutisDB();

