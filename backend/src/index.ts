import dotenv from 'dotenv';
import sequelize from './config/database';
import app from './app';

dotenv.config();

const PORT = process.env['PORT'] || 3001;

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (in development)
    if (process.env['NODE_ENV'] === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized.');
    }
  } catch (error) {
    console.warn('⚠️  Database connection failed, starting without database:', (error as Error).message);
    console.log('⚠️  Some features may not work properly.');
  }

  // Start server regardless of database connection
  app.listen(PORT, () => {
    console.log(`🚀 XRPL Multi-Sign Manager API running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await sequelize.close();
  process.exit(0);
});

startServer(); 