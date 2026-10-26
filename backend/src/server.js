const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./config/prisma');

// Handle BigInt serialization in JSON responses
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    message: 'THAI Please API is running',
    version: '2.0.0',
    features: ['AI Personalized Mission Generator', 'Gamification 5x5 Bingo', 'Social Impact Donations & Tokens'],
  });
});

// Import route modules
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const merchantRoutes = require('./routes/merchantRoutes');
const charityRoutes = require('./routes/charityRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Mount routes as per API Design Specification
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/charities', charityRoutes);
app.use('/api/v1/transactions', transactionRoutes);

// Alias
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/charities', charityRoutes);
app.use('/api/transactions', transactionRoutes);

// Test route
app.get('/api/roles', (req, res) => {
  res.json({
    success: true,
    data: [
      { role_code: 'CITIZEN', role_name: 'ประชาชน' },
      { role_code: 'MERCHANT', role_name: 'ร้านค้าผู้ประกอบการ' },
      { role_code: 'ADMIN', role_name: 'ผู้ดูแลระบบ' },
      { role_code: 'GOV_EXECUTIVE', role_name: 'ผู้บริหารภาครัฐ' },
    ],
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
