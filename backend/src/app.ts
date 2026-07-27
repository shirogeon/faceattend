// backend/src/app.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import employeeRoutes from './routes/employeeRoutes';
import attendanceRoutes from './routes/attendanceRoutes'; // <-- Tambahkan import ini
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middlewares/errorHandler';

const app: Application = express();

// 1. Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// 2. Body Parsers
app.use(express.json({ limit: '5mb' })); 
app.use(express.urlencoded({ extended: true }));

// 3. Global Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// 4. Health Check Route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'FaceAttend API is operational',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// 5. API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/attendance', attendanceRoutes); // <-- Hapus tanda // di sini

// 6. 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API Route Not Found' });
});

// 7. Global Error Handling
app.use(errorHandler);

export default app;