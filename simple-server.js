const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

console.log('🚀 Starting One Stop Shop Server...');

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
  },
  {
    id: 3,
    name: "Royal Jasmine",
    description: "Elegant floral fragrance with jasmine, rose, and white musk.",
    price: 5200,
    image: "https://images.unsplash.com/photo-1590736969955-1d0c97beb2b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "floral",
    isNew: false,
    stock: 0
  },
  {
    id: 4,
    name: "Desert Rose",
    description: "Warm and spicy with rose, saffron, and sandalwood.",
    price: 4900,
    image: "https://images.unsplash.com/photo-1547887535-1b4f8b8c8c8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "floral",
    isNew: false,
    stock: 2
  },
  {
    id: 5,
    name: "Mountain Air",
    description: "Crisp and clean with pine, cedar, and fresh ozone notes.",
    price: 4200,
    image: "https://images.unsplash.com/photo-1590736969955-1d0c97beb2b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "fresh",
    isNew: false,
    stock: 12
  },
  {
    id: 6,
    name: "Vanilla Dream",
    description: "Sweet and comforting with vanilla, tonka bean, and caramel.",
    price: 3600,
    image: "https://images.unsplash.com/photo-1547887535-1b4f8b8c8c8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "sweet",
    isNew: false,
    stock: 7
  },
  {
    id: 7,
    name: "Amber Night",
    description: "Warm amber with hints of vanilla and exotic spices.",
    price: 4800,
    image: "https://images.unsplash.com/photo-1590736969955-1d0c97beb2b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "woody",
    isNew: true,
    stock: 15
  },
  {
    id: 8,
    name: "Citrus Blossom",
    description: "Bright citrus notes blended with delicate white flowers.",
    price: 3900,
    image: "https://images.unsplash.com/photo-1547887535-1b4f8b8c8c8c?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    category: "fresh",
    isNew: true,
    stock: 0
  }
];

// In-memory storage
let orders = [];

// Health endpoint
app.get('/api/health', (req, res) => {
  console.log('✅ Health check called');
  res.json({ 
    status: 'OK', 
    message: 'One Stop Shop API is running! 🎉',
    timestamp: new Date().toISOString()
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

// Initialize products (one-time setup)
app.get('/api/init-products', (req, res) => {
  console.log('✅ Init products called');
  res.json({
    success: true,
    message: 'Products are ready to use!',
    count: products.length
  });
});

// Create new order
app.post('/api/orders', (req, res) => {
  const { customer, products: orderProducts, total } = req.body;

  console.log('📦 Creating order:', { customer, total });

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

// M-Pesa simulation endpoints
app.post('/api/mpesa/stkpush', (req, res) => {
  const { phoneNumber, amount, accountReference } = req.body;
  
  console.log('💸 M-Pesa payment request:', { phoneNumber, amount, accountReference });
  
  // Simulate M-Pesa STK Push
  const checkoutRequestID = 'ws_CO_' + Date.now();
  
  // Find and update order
  const order = orders.find(o => o.orderId === accountReference);
  if (order) {
    order.checkoutRequestID = checkoutRequestID;
  }
  
  console.log('✅ STK Push initiated:', checkoutRequestID);
  
  res.json({
    success: true,
    message: 'STK Push initiated successfully',
    checkoutRequestID: checkoutRequestID,
    response: {
      MerchantRequestID: '1000-' + Date.now(),
      CheckoutRequestID: checkoutRequestID,
      ResponseCode: '0',
      ResponseDescription: 'Success',
      CustomerMessage: 'Success. Request accepted for processing'
    }
  });
});

app.get('/api/mpesa/status/:checkoutRequestID', (req, res) => {
  const { checkoutRequestID } = req.params;
  const order = orders.find(o => o.checkoutRequestID === checkoutRequestID);
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }

  // Simulate payment status (70% success rate for demo)
  const isPaid = Math.random() > 0.3;
  
  if (isPaid && order.status === 'pending') {
    order.status = 'paid';
    order.paymentDetails = {
      mpesaReceiptNumber: 'REC' + Date.now(),
      amount: order.total,
      transactionDate: new Date().toISOString(),
      phoneNumber: '254700000000'
    };
    order.paidAt = new Date().toISOString();
    console.log('✅ Payment successful for order:', order.orderId);
  } else if (order.status === 'pending') {
    order.status = 'failed';
    console.log('❌ Payment failed for order:', order.orderId);
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
});

app.get('/api/mpesa/test-auth', (req, res) => {
  console.log('✅ M-Pesa test called');
  res.json({
    success: true,
    message: 'M-Pesa API is working!',
    environment: 'development'
  });
});

// M-Pesa callback endpoint (for real integration)
app.post('/api/mpesa/callback', (req, res) => {
  console.log('📞 M-Pesa callback received:', JSON.stringify(req.body, null, 2));
  
  // Always return success to M-Pesa
  res.json({
    ResultCode: 0,
    ResultDesc: "Success"
  });
});

// Get all orders (for admin)
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    orders,
    count: orders.length
  });
});

// Get specific order
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

// Serve the main HTML file
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>One Stop Shop - Backend Running</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            h1 { color: #2c3e50; }
            .container { max-width: 800px; margin: 0 auto; }
            .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
            .success { color: #27ae60; font-weight: bold; }
            .test-btn { background: #3498db; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
            .test-btn:hover { background: #2980b9; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>✅ One Stop Shop Backend Server</h1>
            <p class="success">Server is successfully running! 🚀</p>
            
            <h2>📊 Available Endpoints:</h2>
            
            <div class="endpoint">
                <strong>GET /api/health</strong> - Server status check
                <button class="test-btn" onclick="testEndpoint('/api/health')">Test</button>
            </div>
            
            <div class="endpoint">
                <strong>GET /api/products</strong> - Get all products
                <button class="test-btn" onclick="testEndpoint('/api/products')">Test</button>
            </div>
            
            <div class="endpoint">
                <strong>POST /api/orders</strong> - Create new order
            </div>
            
            <div class="endpoint">
                <strong>POST /api/mpesa/stkpush</strong> - Initiate M-Pesa payment
            </div>
            
            <div class="endpoint">
                <strong>GET /api/mpesa/status/:id</strong> - Check payment status
            </div>
            
            <div id="test-result" style="margin-top: 20px; padding: 10px; border-radius: 4px; display: none;"></div>
            
            <p>Your frontend can now connect to these endpoints!</p>
        </div>

        <script>
            async function testEndpoint(endpoint) {
                try {
                    const response = await fetch(endpoint);
                    const data = await response.json();
                    document.getElementById('test-result').style.display = 'block';
                    document.getElementById('test-result').style.background = '#d4edda';
                    document.getElementById('test-result').innerHTML = '<strong>✅ Success:</strong><pre>' + JSON.stringify(data, null, 2) + '</pre>';
                } catch (error) {
                    document.getElementById('test-result').style.display = 'block';
                    document.getElementById('test-result').style.background = '#f8d7da';
                    document.getElementById('test-result').innerHTML = '<strong>❌ Error:</strong> ' + error.message;
                }
            }
        </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=========================================');
  console.log('🚀 ONE STOP SHOP SERVER STARTED!');
  console.log('=========================================');
  console.log('📍 Port: ' + PORT);
  console.log('🌐 Main URL: http://localhost:' + PORT);
  console.log('📊 Health: http://localhost:' + PORT + '/api/health');
  console.log('🛍️ Products: http://localhost:' + PORT + '/api/products');
  console.log('💳 M-Pesa: http://localhost:' + PORT + '/api/mpesa/test-auth');
  console.log('=========================================');
  console.log('💡 Test the endpoints in your browser!');
  console.log('=========================================');
});
