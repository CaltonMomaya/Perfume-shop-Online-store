const axios = require('axios');
const moment = require('moment');
require('dotenv').config();

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get M-Pesa access token
  async getAccessToken() {
    try {
      // Check if token is still valid (55 minutes)
      if (this.accessToken && this.tokenExpiry && moment().isBefore(this.tokenExpiry)) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      console.log('Getting access token from:', `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`);
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = moment().add(55, 'minutes');
      
      console.log('Access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error getting access token:', error.response?.data || error.message);
      throw new Error(`Failed to get M-Pesa access token: ${error.response?.data?.error_message || error.message}`);
    }
  }

  // Generate password for STK Push
  generatePassword() {
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  // Initiate real STK Push
  async initiateSTKPush(phoneNumber, amount, orderId) {
    try {
      console.log('🔐 Getting access token...');
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      
      // Format phone number (ensure it starts with 254)
      let formattedPhone = phoneNumber.toString().trim();
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '254' + formattedPhone.substring(1);
      } else if (!formattedPhone.startsWith('254')) {
        formattedPhone = '254' + formattedPhone;
      }

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: orderId.substring(0, 12), // Max 12 chars
        TransactionDesc: `Order ${orderId}`
      };

      console.log('📱 Initiating STK Push with data:', {
        ...requestData,
        Password: '***', // Hide password in logs
        PhoneNumber: formattedPhone
      });

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('✅ STK Push initiated successfully:', response.data);

      return {
        success: true,
        data: response.data,
        message: 'STK Push initiated successfully. Check your phone for M-Pesa prompt.'
      };
    } catch (error) {
      console.error('❌ STK Push error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let userMessage = 'Failed to initiate payment';
      
      if (error.response?.data?.errorMessage) {
        userMessage = error.response.data.errorMessage;
      } else if (error.response?.data?.error_code) {
        userMessage = `M-Pesa error: ${error.response.data.error_code}`;
      } else if (error.code === 'ECONNABORTED') {
        userMessage = 'Payment request timeout. Please try again.';
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        message: userMessage
      };
    }
  }

  // Handle M-Pesa callback
  async handleCallback(callbackData) {
    try {
      console.log('📞 M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));
      
      if (!callbackData.Body || !callbackData.Body.stkCallback) {
        throw new Error('Invalid callback data structure');
      }

      const resultCode = callbackData.Body.stkCallback.ResultCode;
      const resultDesc = callbackData.Body.stkCallback.ResultDesc;
      const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;
      const merchantRequestID = callbackData.Body.stkCallback.MerchantRequestID;

      console.log(`🔄 Processing callback: ResultCode=${resultCode}, CheckoutRequestID=${checkoutRequestID}`);

      // In a real application, you would:
      // 1. Find the order by checkoutRequestID in your database
      // 2. Update the order status based on resultCode
      
      if (resultCode === 0) {
        // Payment successful
        const callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata;
        if (!callbackMetadata || !callbackMetadata.Item) {
          throw new Error('Missing callback metadata for successful payment');
        }

        const items = callbackMetadata.Item;
        
        const amountItem = items.find(item => item.Name === 'Amount');
        const receiptItem = items.find(item => item.Name === 'MpesaReceiptNumber');
        const dateItem = items.find(item => item.Name === 'TransactionDate');
        const phoneItem = items.find(item => item.Name === 'PhoneNumber');

        if (!amountItem || !receiptItem || !dateItem || !phoneItem) {
          throw new Error('Missing required payment details in callback');
        }

        const paymentDetails = {
          mpesaReceiptNumber: receiptItem.Value,
          amount: amountItem.Value,
          transactionDate: dateItem.Value,
          phoneNumber: phoneItem.Value,
          checkoutRequestID,
          merchantRequestID
        };

        console.log('✅ Payment successful:', paymentDetails);
        
        // Here you would update your order in the database
        // await updateOrderStatus(checkoutRequestID, 'paid', paymentDetails);

        return { 
          success: true, 
          message: 'Payment processed successfully',
          paymentDetails
        };
      } else {
        // Payment failed
        console.log('❌ Payment failed:', resultDesc);
        
        const errorDetails = {
          error: resultDesc,
          checkoutRequestID,
          merchantRequestID,
          resultCode
        };

        // Here you would update your order in the database
        // await updateOrderStatus(checkoutRequestID, 'failed', errorDetails);

        return { 
          success: false, 
          message: `Payment failed: ${resultDesc}`,
          error: errorDetails
        };
      }
    } catch (error) {
      console.error('💥 Error processing callback:', error);
      return { 
        success: false, 
        message: 'Error processing payment callback',
        error: error.message 
      };
    }
  }

  // Check transaction status (optional)
  async checkTransactionStatus(checkoutRequestID) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestID
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        requestData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Transaction status check error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = new MpesaService();
