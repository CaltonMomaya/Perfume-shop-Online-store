const express = require('express');
const cors = require('cors');
const RealMpesaService = require('./real-mpesa-service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Starting One Stop Shop Server with REAL M-Pesa...');

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
];

// In-memory storage
let orders = [];

// Health endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check called');
  res.json({ 
    status: 'OK', 
    message: 'One Stop Shop API with REAL M-Pesa is running! 🎉',
    timestamp: new Date().toISOString(),
    mpesaEnvironment: process.env.MPESA_ENVIRONMENT || 'sandbox'
  });
});

// Get all products
app.get('/api/products', (req, res) => {
  console.log('✅ Products endpoint called');
  res.json({
    success: true,
    products,
    count: products.length
  });
});

// Create new order
app.post('/api/orders', (req, res) => {
  const { customer, products: orderProducts, total } = req.body;

  console.log('📦 Creating order:', { customer: customer?.firstName, total });

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

  console.log('✅ Order created:', orderId);

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    order
  });
});

// REAL M-Pesa STK Push Endpoint
app.post('/api/mpesa/stkpush', async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference } = req.body;

    console.log('💸 REAL M-Pesa payment request:', { 
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

    console.log('🚀 Initiating REAL M-Pesa STK Push...');
    
    // Initiate REAL M-Pesa STK Push
    const result = await RealMpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      accountReference
    );

    if (result.success) {
      // Update order with checkout request ID
      existingOrder.checkoutRequestID = result.data.CheckoutRequestID;
      existingOrder.merchantRequestID = result.data.MerchantRequestID;
      existingOrder.stkPushResponse = result.data;
      existingOrder.paymentInitiatedAt = new Date().toISOString();

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
    console.error('💥 M-Pesa endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// M-Pesa callback URL (for production)
app.post('/api/mpesa/callback', async (req, res) => {
  try {
    console.log('📞 REAL M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
    
    // Always return success to M-Pesa (they will retry if we return failure)
    res.json({
      ResultCode: 0,
      ResultDesc: "Success"
    });

    // Here you would process the callback and update order status
    // This requires a publicly accessible URL for production
    
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

    // For demo purposes, we'll simulate status checks
    // In production, you would check against M-Pesa API or database
    const statuses = ['pending', 'paid', 'failed'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    if (randomStatus === 'paid' && order.status === 'pending') {
      order.status = 'paid';
      order.paymentDetails = {
        mpesaReceiptNumber: 'REAL' + Date.now(),
        amount: order.total,
        transactionDate: new Date().toISOString(),
        phoneNumber: order.customer.phone
      };
      order.paidAt = new Date().toISOString();
    } else if (randomStatus === 'failed' && order.status === 'pending') {
      order.status = 'failed';
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
    const token = await RealMpesaService.getAccessToken();
    res.json({
      success: true,
      message: 'M-Pesa authentication successful!',
      hasToken: !!token,
      environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'M-Pesa authentication failed',
      error: error.message
    });
  }
});

// Get all orders
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    orders,
    count: orders.length
  });
});

// Serve the main page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>One Stop Shop - REAL M-Pesa</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #2c3e50; }
            .container { max-width: 800px; margin: 0 auto; }
            .success { color: #27ae60; font-weight: bold; }
            .warning { color: #f39c12; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✅ One Stop Shop - REAL M-Pesa</h1>
            <p class="success">Server with REAL M-Pesa integration is running! 🚀</p>
            <p class="warning">⚠️ Make sure you have valid M-Pesa credentials in your .env file</p>
            
            <h2>📊 Available Endpoints:</h2>
            
            <div class="endpoint">
                <strong>POST /api/mpesa/stkpush</strong> - Initiate REAL M-Pesa payment
                <p>This will send an actual STK Push to the provided phone number</p>
            </div>
            
            <div class="endpoint">
                <strong>GET /api/mpesa/test-auth</strong> - Test M-Pesa authentication
            </div>
            
            <h3>🔧 Setup Instructions:</h3>
            <ol>
                <li>Get M-Pesa credentials from Safaricom Developer Portal</li>
                <li>Update .env file with your credentials</li>
                <li>Test with your phone number</li>
                <li>Check your phone for M-Pesa prompt</li>
            </ol>
        </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=========================================');
  console.log('🚀 ONE STOP SHOP SERVER WITH REAL M-PESA!');
  console.log('=========================================');
  console.log('📍 Port: ' + PORT);
  console.log('🌐 Main URL: http://localhost:' + PORT);
  console.log('💳 M-Pesa Test: http://localhost:' + PORT + '/api/mpesa/test-auth');
  console.log('📱 Environment: ' + (process.env.MPESA_ENVIRONMENT || 'sandbox'));
  console.log('=========================================');
  console.log('📋 NEXT STEPS:');
  console.log('1. Get M-Pesa credentials from: https://developer.safaricom.co.ke/');
  console.log('2. Update .env file with your credentials');
  console.log('3. Test M-Pesa auth: http://localhost:' + PORT + '/api/mpesa/test-auth');
  console.log('4. Make a purchase from your frontend');
  console.log('=========================================');
});
