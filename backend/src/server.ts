// backend/src/server.ts
import app from './app';
import { env } from './config/env';

const startServer = async () => {
  try {
    app.listen(env.PORT, () => {
      console.log(`🚀 FaceAttend Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start the server:', error);
    process.exit(1);
  }
};

startServer();