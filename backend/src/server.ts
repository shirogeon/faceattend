import app from './app';

const PORT = process.env.PORT || 5000;

// app.listen HANYA jalan di komputer lokal lu, bukan di Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// INI BARIS WAJIB UNTUK VERCEL SERVERLESS
export default app;