const express = require('express');
const cors = require('cors');
require('dotenv').config();
const prisma = require('./config/prisma');

// Handle BigInt serialization in JSON responses (Prisma MySQL uses BigInt)
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const app = express();

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'THAI Please API is running' });
});

// Test route to check database connectivity
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await prisma.roles.findMany();
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
