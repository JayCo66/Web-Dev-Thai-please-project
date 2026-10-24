const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/v1/merchants/register
router.post('/register', authController.registerMerchant);

// GET /api/v1/merchants/categories
router.get('/categories', (req, res) => {
  const categories = [
    { category_id: 1, category_name: 'อาหารและเครื่องดื่ม' },
    { category_id: 2, category_name: 'สินค้าทั่วไปและของใช้' },
    { category_id: 3, category_name: 'สินค้า OTOP และวิสาหกิจชุมชน' },
    { category_id: 4, category_name: 'บริการชุมชนและสุขภาพ' },
  ];
  return res.json({ success: true, data: categories });
});

module.exports = router;
