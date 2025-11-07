const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mpesaService = require('./mpesa-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sample products data
const products = [
  {
    id: 1,
    name: "Midnight Oud",
    description: "A rich and mysterious blend of oud, amber, and spices.",
    price: 4500,
    image: "https://images.unsplash.com/photo-1590736969955-1d0c97beb2b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "woody",
    isNew: false,
    stock: 5
  },
  {
    id: 2,
    name: "Ocean Breeze",
    description: "Fresh aquatic notes with hints of citrus and sea salt.",
    price: 3800,
    image: "https://images.unsplash.com/photo-1547887535-1b4f8b8c8c8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "fresh",
    isNew: false,
    stock: 8
  }
  // Add more products as needed...
];

// In-memory storage
let orders = [];

// Routes
app.get('/api/init-products', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Products are ready to use',
    count: products.length 
  });
});

app.get('/api/products', (req, res) => {
  res.json({ 
    success: true, 
    products, 
    count: products.length 
  });
});

app.post('/api/orders', (req, res) => {
  const { customer, products: orderProducts, total } = req.body;

  if (!customer || !orderProducts || !total) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: customer, products, total'
    });
  }

  const orderId = 'OSS' + Date.now();
  const order = {
    orderId,
    customer,
    products: orderProducts,
    total,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    order: {
      id: orderId,
      orderId: order.orderId,
      customer: order.customer,
      products: order.products,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt
    }
  });
});

app.get('/api/orders/:orderId', (req, res) => {
  const { orderId } = req.params;
  const order = orders.find(o => o.orderId === orderId);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  res.json({
    success: true,
    order
  });
});

// REAL M-Pesa STK Push Endpoint
app.post('/api/mpesa/stkpush', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference } = req.body;

    console.log('💸 STK Push request received:', { 
      phoneNumber, 
      amount, 
      accountReference 
    });

    // Validate required fields
    if (!phoneNumber || !amount || !accountReference) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, amount, accountReference'
      });
    }

    // Validate amount
    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least 1 KSH'
      });
    }

    // Find the order
    const existingOrder = orders.find(order => order.orderId === accountReference);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    console.log('🚀 Initiating real STK Push...');
    
    // Initiate real STK Push
    const result = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      accountReference
    );

    if (result.success) {
      // Update order with checkout request ID
      existingOrder.checkoutRequestID = result.data.CheckoutRequestID;
      existingOrder.merchantRequestID = result.data.MerchantRequestID;
      existingOrder.stkPushResponse = result.data;

      res.json({
        success: true,
        message: result.message,
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
    console.error('💥 STK Push endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// M-Pesa callback URL
app.post('/api/mpesa/callback', async (req, res) => {
  try {
    console.log('📞 M-Pesa Callback Received');
    
    const result = await mpesaService.handleCallback(req.body);
    
    // Always return success to M-Pesa (they will retry if we return failure)
    res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });

    // Log the result for debugging
    if (result.success) {
      console.log('✅ Callback processed successfully:', result.paymentDetails);
    } else {
      console.log('❌ Callback processing failed:', result.message);
    }
  } catch (error) {
    console.error('💥 Callback processing error:', error);
    // Still return success to M-Pesa to prevent retries
    res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });
  }
});

// Check payment status
app.get('/api/mpesa/status/:checkoutRequestID', async (req, res) => {
  try {
    const { checkoutRequestID } = req.params;

    const order = orders.find(o => o.checkoutRequestID === checkoutRequestID);
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
        total: order.total,
        checkoutRequestID: order.checkoutRequestID
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

// Test M-Pesa connectivity
app.get('/api/mpesa/test-auth', async (req, res) => {
  try {
    const token = await mpesaService.getAccessToken();
    res.json({
      success: true,
      message: 'M-Pesa authentication successful',
      hasToken: !!token
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'M-Pesa authentication failed',
      error: error.message
    });
  }
});

app.get('/api/mpesa/test', (req, res) => {
  res.json({ 
    message: 'M-Pesa API is working!',
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    businessShortCode: process.env.MPESA_BUSINESS_SHORT_CODE
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'One Stop Shop API with Real M-Pesa is running',
    timestamp: new Date().toISOString(),
    mpesaEnvironment: process.env.MPESA_ENVIRONMENT || 'sandbox'
  });
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server with REAL M-Pesa running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 M-Pesa Auth Test: http://localhost:${PORT}/api/mpesa/test-auth`);
  console.log(`📱 M-Pesa Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
  console.log(`🏢 Business ShortCode: ${process.env.MPESA_BUSINESS_SHORT_CODE}`);
  console.log('');
  console.log('📋 NEXT STEPS:');
  console.log('1. Get your M-Pesa credentials from: https://developer.safaricom.co.ke/');
  console.log('2. Update the .env file with your actual credentials');
  console.log('3. Test with phone: 254708374149 (sandbox test number)');
  console.log('4. Use PIN: 174379 (sandbox test PIN)');
});
