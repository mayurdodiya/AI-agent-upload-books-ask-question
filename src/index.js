require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const uploadRoutes = require('./routes/upload');
const queryRoutes = require('./routes/query');
const bookRoutes = require('./routes/books');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/books', bookRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Book Q&A API is running!' });
});

// Root - serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong',
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Book Q&A Server running at http://localhost:${PORT}`);
  console.log(`📚 Upload books at POST /api/upload`);
  console.log(`❓ Ask questions at POST /api/query\n`);
});
