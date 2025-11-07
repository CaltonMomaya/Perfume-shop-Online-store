const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

console.log('�� Initializing server...');

// Test endpoint - Simple health check
app.get('/api/health', (req, res) => {
    console.log('✅ Health check endpoint hit!');
    res.json({ 
        status: 'OK', 
        message: 'Server is running perfectly! 🚀',
        timestamp: new Date().toISOString(),
        port: 5000
    });
});

// M-Pesa test endpoint
app.get('/api/mpesa/test-auth', (req, res) => {
    console.log('✅ M-Pesa test endpoint hit!');
    res.json({
        success: true,
        message: 'M-Pesa authentication endpoint is working!',
        environment: 'development'
    });
});

// Products endpoint
app.get('/api/products', (req, res) => {
    const products = [
        {
            id: 1,
            name: "Midnight Oud",
            price: 4500,
            stock: 5
        },
        {
            id: 2, 
            name: "Ocean Breeze",
            price: 3800,
            stock: 8
        }
    ];
    res.json({ 
        success: true, 
        products,
        count: products.length 
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>One Stop Shop - Server Running</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; }
                h1 { color: #2c3e50; }
                ul { list-style-type: none; padding: 0; }
                li { margin: 10px 0; }
                a { color: #3498db; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>✅ One Stop Shop Server is Running!</h1>
            <p>Your backend server is successfully running on port 5000.</p>
            <p>Test these endpoints:</p>
            <ul>
                <li>📊 <a href="/api/health">/api/health</a> - Server status</li>
                <li>📱 <a href="/api/mpesa/test-auth">/api/mpesa/test-auth</a> - M-Pesa test</li>
                <li>🛍️ <a href="/api/products">/api/products</a> - Products list</li>
            </ul>
            <p>You can now test with curl commands or use these links.</p>
        </body>
        </html>
    `);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('=========================================');
    console.log('🚀 ONE STOP SHOP SERVER STARTED!');
    console.log('=========================================');
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌐 Local: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`📱 M-Pesa: http://localhost:${PORT}/api/mpesa/test-auth`);
    console.log(`🛍️ Products: http://localhost:${PORT}/api/products`);
    console.log('=========================================');
    console.log('💡 Open your browser and visit the links above!');
    console.log('=========================================');
});

// Handle server errors
app.on('error', (error) => {
    console.error('❌ Server error:', error);
});
