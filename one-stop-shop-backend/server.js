const express = require('express');
const axios = require('axios');
const cors = require('cors');
const nodemailer = require("nodemailer");
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// M-Pesa Configuration
const MPESA_CONFIG = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    businessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    callbackURL: process.env.MPESA_CALLBACK_URL || `${process.env.BASE_URL}/api/mpesa/callback`,
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
};

const MPESA_BASE_URL = MPESA_CONFIG.environment === 'production' 
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

// Storage
let orders = [];
let paymentStatus = {};
// Nodemailer transporter (Gmail App Password required)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.OTP_EMAIL_USER,
        pass: process.env.OTP_EMAIL_PASS
    }
});


// Health check
app.get('/api/health', (req, res) => {
    console.log('🏥 Health check requested');
    res.json({ 
        status: 'OK', 
        message: 'One Stop Shop Backend is running! 🎉',
        environment: MPESA_CONFIG.environment
    });
});

// Test configuration
app.get('/api/test/config', (req, res) => {
    console.log('⚙️ Config check requested');
    res.json({
        success: true,
        config: {
            port: PORT,
            mpesa_environment: MPESA_CONFIG.environment,
            business_shortcode: MPESA_CONFIG.businessShortCode
        }
    });
});

// Test M-Pesa credentials
app.get('/api/mpesa/test-token', async (req, res) => {
    try {
        console.log('🔐 Testing M-Pesa credentials...');
        
        const credentials = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
        
        const response = await axios.get(
            `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            }
        );
        
        console.log('✅ M-Pesa token test successful!');
        res.json({
            success: true,
            message: 'M-Pesa credentials are valid!',
            access_token: response.data.access_token
        });
        
    } catch (error) {
        console.error('❌ M-Pesa token test failed:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'M-Pesa credentials test failed'
        });
    }
});

// Get M-Pesa Access Token
async function getMpesaAccessToken() {
    try {
        console.log('🔑 Getting M-Pesa access token...');
        const credentials = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
        
        const response = await axios.get(
            `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
            {
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            }
        );

        console.log('✅ Access token received');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ Error getting access token:', error.response?.data || error.message);
        throw new Error('Failed to get M-Pesa access token');
    }
}
// ==========================
// SEND OTP EMAIL
// ==========================
app.post("/api/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        await transporter.sendMail({
            from: process.env.OTP_EMAIL_USER,
            to: email,
            subject: "One Stop Shop Login OTP",
            html: `
                <div style="font-family: Arial; padding: 20px;">
                    <h2>Your OTP Code</h2>
                    <p>Use the code below to verify your login:</p>
                    <h1 style="font-size: 40px; letter-spacing: 4px;">${otp}</h1>
                    <p>This code expires in 10 minutes.</p>
                </div>
            `
        });

        console.log("📧 OTP sent to:", email);

        res.json({
            success: true,
            message: "OTP sent successfully",
            otp  // remove this when live
        });

    } catch (error) {
        console.error("Email Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP",
            error: error.message
        });
    }
});

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        console.log('📦 Creating new order...', req.body);
        const { customer, products, total } = req.body;

        const order = {
            orderId: 'OSS' + Date.now(),
            customer,
            products,
            total,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        orders.push(order);

        console.log('✅ Order created:', order.orderId);
        res.json({
            success: true,
            message: 'Order created successfully',
            order
        });

    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// STK Push - WITH EXTENSIVE LOGGING
app.post('/api/mpesa/stkpush', async (req, res) => {
    console.log('🚀 ========== STK PUSH REQUEST RECEIVED ==========');
    console.log('📱 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
        const { phoneNumber, amount, accountReference } = req.body;

        console.log('🎯 Processing STK Push for:');
        console.log('   Phone:', phoneNumber);
        console.log('   Amount:', amount);
        console.log('   Order:', accountReference);

        // Format phone number
        let formattedPhone = phoneNumber.toString().trim();
        console.log('📞 Original phone:', phoneNumber);
        
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('+254')) {
            formattedPhone = formattedPhone.substring(1);
        }
        console.log('📞 Formatted phone:', formattedPhone);

        console.log('🔑 Getting access token...');
        const accessToken = await getMpesaAccessToken();
        console.log('✅ Access token received');

        // TIMESTAMP GENERATION
        console.log('🕒 Generating timestamp...');
        const now = new Date();
        const timestamp = 
            now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        
        console.log('📅 Timestamp:', timestamp);

        const password = Buffer.from(
            MPESA_CONFIG.businessShortCode + 
            MPESA_CONFIG.passkey + 
            timestamp
        ).toString('base64');

        console.log('🔐 Password generated');

        const stkPayload = {
            BusinessShortCode: MPESA_CONFIG.businessShortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: MPESA_CONFIG.businessShortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: MPESA_CONFIG.callbackURL,
            AccountReference: accountReference,
            TransactionDesc: "One Stop Shop Purchase"
        };

        console.log('📤 STK Payload:', JSON.stringify(stkPayload, null, 2));
        console.log('🌐 Sending request to M-Pesa...');

        const stkResponse = await axios.post(
            `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
            stkPayload,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const responseData = stkResponse.data;
        console.log('📥 M-Pesa Response:', JSON.stringify(responseData, null, 2));

        if (responseData.ResponseCode === "0") {
            paymentStatus[responseData.CheckoutRequestID] = {
                status: 'pending',
                orderId: accountReference,
                phoneNumber: formattedPhone,
                amount: amount,
                createdAt: new Date().toISOString()
            };

            console.log('✅ ✅ ✅ STK Push SUCCESSFUL!');
            console.log('✅ CheckoutRequestID:', responseData.CheckoutRequestID);
            console.log('✅ Response:', responseData.ResponseDescription);
            
            res.json({
                success: true,
                message: 'M-Pesa prompt sent successfully',
                checkoutRequestID: responseData.CheckoutRequestID
            });
        } else {
            console.log('❌ ❌ ❌ STK Push FAILED:', responseData.ResponseDescription);
            res.json({
                success: false,
                message: responseData.ResponseDescription || 'Failed to initiate payment'
            });
        }

    } catch (error) {
        console.error('💥 💥 💥 STK Push ERROR:');
        console.error('💥 Status:', error.response?.status);
        console.error('💥 Data:', error.response?.data);
        console.error('💥 Message:', error.message);
        
        res.status(500).json({
            success: false,
            message: 'Failed to initiate M-Pesa payment',
            error: error.response?.data || error.message
        });
    }
    
    console.log('🚀 ========== STK PUSH REQUEST COMPLETED ==========');
});

// Payment Status Check
app.get('/api/mpesa/status/:checkoutRequestID', (req, res) => {
    console.log('🔍 Checking payment status for:', req.params.checkoutRequestID);
    const { checkoutRequestID } = req.params;
    const payment = paymentStatus[checkoutRequestID];

    if (!payment) {
        console.log('❌ Payment not found:', checkoutRequestID);
        return res.status(404).json({
            success: false,
            message: 'Payment not found'
        });
    }

    const order = orders.find(o => o.orderId === payment.orderId);
    console.log('✅ Payment status:', payment.status, 'for order:', payment.orderId);

    res.json({
        success: true,
        checkoutRequestID,
        status: payment.status,
        order: order || null
    });
});

// M-Pesa Callback
app.post('/api/mpesa/callback', (req, res) => {
    console.log('📨 M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
    try {
        const callbackData = req.body;
        const resultCode = callbackData.Body?.stkCallback?.ResultCode;
        const checkoutRequestID = callbackData.Body?.stkCallback?.CheckoutRequestID;

        if (resultCode === 0 && paymentStatus[checkoutRequestID]) {
            paymentStatus[checkoutRequestID].status = 'paid';
            
            const orderId = paymentStatus[checkoutRequestID].orderId;
            const order = orders.find(o => o.orderId === orderId);
            if (order) {
                order.status = 'paid';
            }
            console.log('✅ Payment successful for order:', orderId);
        } else if (paymentStatus[checkoutRequestID]) {
            paymentStatus[checkoutRequestID].status = 'failed';
            console.log('❌ Payment failed for checkoutRequestID:', checkoutRequestID);
        }

        res.json({
            ResultCode: 0,
            ResultDesc: "Success"
        });

    } catch (error) {
        console.error('💥 Callback error:', error);
        res.json({
            ResultCode: 1,
            ResultDesc: "Failed"
        });
    }
});

// List all orders
app.get('/api/orders', (req, res) => {
    console.log('📋 Orders list requested');
    res.json({
        success: true,
        count: orders.length,
        orders: orders
    });
});
const mpesaRoutes = require("./mpesa");
app.use("/api/mpesa", mpesaRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔗 Test M-Pesa: http://localhost:${PORT}/api/mpesa/test-token`);
});
