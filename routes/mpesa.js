const express = require('express');
const router = express.Router();
const mpesaService = require('../services/mpesaService');
const Order = require('../models/Order');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'M-Pesa API is working!' });
});

// Initiate STK Push
router.post('/stkpush', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference } = req.body;

    console.log('STK Push request:', req.body);

    if (!phoneNumber || !amount || !accountReference) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, amount, accountReference'
      });
    }

    let formattedPhone = phoneNumber.toString().trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    const existingOrder = await Order.findOne({ orderId: accountReference });
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const result = await mpesaService.initiateSTKPush(
      formattedPhone,
      amount,
      accountReference
    );

    if (result.success) {
      existingOrder.checkoutRequestID = result.data.CheckoutRequestID;
      await existingOrder.save();

      res.json({
        success: true,
        message: 'STK Push initiated successfully',
        checkoutRequestID: result.data.CheckoutRequestID,
        response: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('STK Push endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// M-Pesa callback URL
router.post('/callback', async (req, res) => {
  try {
    console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
    
    const result = await mpesaService.handleCallback(req.body);
    
    res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });
  } catch (error) {
    console.error('Callback processing error:', error);
    res.json({
      ResultCode: 1,
      ResultDesc: "Failed"
    });
  }
});

// Check payment status
router.get('/status/:checkoutRequestID', async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;

    const order = await Order.findOne({ checkoutRequestID });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        paymentDetails: order.paymentDetails,
        total: order.total
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status'
    });
  }
});

module.exports = router;
