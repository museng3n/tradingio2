import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
// import mongoSanitize from 'express-mongo-sanitize'; // Disabled - not compatible with Express 5
import hpp from 'hpp';
import morgan from 'morgan';

import { apiLimiter } from './middlewares/rate-limit.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - Allow all origins for development (including file://)
app.use(cors({
  origin: true,  // Reflect the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
}));

// app.use(mongoSanitize()); // Disabled - not compatible with Express 5
app.use(hpp());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting
app.use('/api', apiLimiter);

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

export default app;
