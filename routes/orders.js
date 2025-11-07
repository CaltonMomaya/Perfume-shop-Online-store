const express = require('express');
const router = express.Router();
const firebaseService = require('../services/firebaseService');

// Create new order
router.post('/', async (req, res) => {
  try {
    const { customer, products, total } = req.body;

    console.log('Creating order with data:', { customer, products, total });

    if (!customer || !products || !total) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer, products, total'
      });
    }

    const result = await firebaseService.createOrder({
      customer,
      products,
      total
    });

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// Get order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await firebaseService.getOrder(orderId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving order'
    });
  }
});

// Get all orders
router.get('/', async (req, res) => {
  try {
    const result = await firebaseService.getAllOrders();
    res.json(result);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving orders'
    });
  }
});

module.exports = router;
