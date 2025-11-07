const axios = require('axios');
const moment = require('moment');
const firebaseService = require('./firebaseService');

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

  async getAccessToken() {
    try {
      if (this.accessToken && this.tokenExpiry && moment().isBefore(this.tokenExpiry)) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = moment().add(55, 'minutes');
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  generatePassword() {
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  async initiateSTKPush(phoneNumber, amount, orderId, callbackUrl = null) {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      
      const requestData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: phoneNumber,
        PartyB: this.businessShortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: callbackUrl || this.callbackUrl,
        AccountReference: orderId,
        TransactionDesc: `Payment for order ${orderId}`
      };

      console.log('Initiating STK Push with data:', requestData);

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
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
        data: response.data,
        message: 'STK Push initiated successfully'
      };
    } catch (error) {
      console.error('STK Push error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to initiate STK Push'
      };
    }
  }

  async handleCallback(callbackData) {
    try {
      console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));
      
      const resultCode = callbackData.Body.stkCallback.ResultCode;
      const resultDesc = callbackData.Body.stkCallback.ResultDesc;
      const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;
      
      // Find order by checkoutRequestID
      const allOrders = await firebaseService.getAllOrders();
      const order = allOrders.orders.find(o => o.checkoutRequestID === checkoutRequestID);
      
      if (!order) {
        console.error('Order not found for CheckoutRequestID:', checkoutRequestID);
        return { success: false, message: 'Order not found' };
      }

      if (resultCode === 0) {
        const callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata;
        const items = callbackMetadata.Item;
        
        const amount = items.find(item => item.Name === 'Amount').Value;
        const mpesaReceiptNumber = items.find(item => item.Name === 'MpesaReceiptNumber').Value;
        const transactionDate = items.find(item => item.Name === 'TransactionDate').Value;
        const phoneNumber = items.find(item => item.Name === 'PhoneNumber').Value;

        await firebaseService.updateOrder(order.orderId, {
          status: 'paid',
          paymentDetails: {
            mpesaReceiptNumber,
            amount,
            transactionDate,
            phoneNumber,
            checkoutRequestID
          },
          paidAt: moment().toISOString()
        });
        
        console.log(`Payment successful for order ${order.orderId}: ${mpesaReceiptNumber}`);
        
        return { 
          success: true, 
          message: 'Payment processed successfully',
          orderId: order.orderId
        };
      } else {
        await firebaseService.updateOrder(order.orderId, {
          status: 'failed',
          paymentDetails: {
            error: resultDesc,
            checkoutRequestID
          }
        });
        
        console.log(`Payment failed for order ${order.orderId}: ${resultDesc}`);
        
        return { 
          success: false, 
          message: `Payment failed: ${resultDesc}`,
          orderId: order.orderId
        };
      }
    } catch (error) {
      console.error('Error processing callback:', error);
      return { success: false, message: 'Error processing callback' };
    }
  }
}

module.exports = new MpesaService();
