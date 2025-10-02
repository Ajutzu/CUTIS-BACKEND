// Impoting required modules
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import colors from 'colors';
import { createServer } from 'http';
import { Server } from 'socket.io';

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
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      return callback(null, true);
    },
    credentials: true,
  },
});

const PORT = process.env.PORT || 3002;

// For Render
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    return callback(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/article', articleRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/maps', mapRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(errorHandler);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(colors.blue(`🔌 Admin client connected: ${socket.id}`));
    
    // Handle room joining
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(colors.cyan(`📱 Client ${socket.id} joined room: ${room}`));
    });
    
    socket.on('disconnect', () => {
        console.log(colors.red(`🔌 Admin client disconnected: ${socket.id}`));
    });
});

// Make io available globally for use in controllers
global.io = io;

// Start 
server.listen(PORT, () => {
    console.log(colors.green(`🚀 Server is running on port ${PORT}`));
    console.log(colors.cyan(`🔌 Socket.IO server is ready for connections`));
});

connectToCutisDB();

