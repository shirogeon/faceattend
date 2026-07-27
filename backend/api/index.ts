// backend/api/index.ts
import serverless from 'serverless-http';
import app from '../src/app';

// This wraps our Express app so Vercel's serverless infrastructure can execute it.
export const handler = serverless(app);