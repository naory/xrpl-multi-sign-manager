import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import healthRoutes from './routes/health';
import walletRoutes from './routes/wallet';
import { errorHandler, notFoundHandler } from './middleware/error/errorHandler';
import { LoggingService } from './services/LoggingService';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Logging middleware
if (process.env['NODE_ENV'] === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Request logging
app.use(LoggingService.logRequest);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check routes
app.use('/health', healthRoutes);

// Test route
app.get('/test', (_req, res) => {
  res.json({ message: 'App is working!' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/wallet', walletRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app; 