const express = require('express');
const cors = require('cors');
require('dotenv').config();
const firebaseService = require('./services/firebaseService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase and start server
const initializeApp = async () => {
  try {
    // Test Firebase connection by getting products
    await firebaseService.getProducts();
    console.log('✅ Firebase connected successfully');
    
    // Routes
    app.use('/api/mpesa', require('./routes/mpesa'));
    app.use('/api/orders', require('./routes/orders'));
    app.use('/api/products', require('./routes/products'));

    // Health check
    app.get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        message: 'One Stop Shop API is running with Firebase',
        timestamp: new Date().toISOString()
      });
    });

    // Initialize products (first time setup)
    app.get('/api/init-products', async (req, res) => {
      const result = await firebaseService.initializeProducts();
      res.json(result);
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔥 Database: Firebase Firestore`);
      console.log(`📱 M-Pesa Environment: ${process.env.MPESA_ENVIRONMENT || 'sandbox'}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
      console.log(`��️  Products API: http://localhost:${PORT}/api/products`);
      console.log(`📦 Initialize products: http://localhost:${PORT}/api/init-products`);
    });
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
    process.exit(1);
  }
};

initializeApp();
