const express = require('express');
const router = express.Router();
const firebaseService = require('../services/firebaseService');

// Initialize products (run once)
router.post('/initialize', async (req, res) => {
  try {
    const result = await firebaseService.initializeProducts();
    res.json(result);
  } catch (error) {
    console.error('Initialize products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing products'
    });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const result = await firebaseService.getProducts();
    res.json(result);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving products'
    });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const result = await firebaseService.getProduct(productId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving product'
    });
  }
});

module.exports = router;
