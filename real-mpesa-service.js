const axios = require('axios');
const moment = require('moment');

class RealMpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY || 'YOUR_CONSUMER_KEY';
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET || 'YOUR_CONSUMER_SECRET';
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE || '174379';
    this.passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    this.callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://your-domain.com/api/mpesa/callback';
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
      
      console.log('🔐 Getting M-Pesa access token...');
      
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = moment().add(55, 'minutes');
      
      console.log('✅ M-Pesa access token obtained successfully');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Error getting M-Pesa access token:', error.response?.data || error.message);
      throw new Error(`Failed to get M-Pesa access token: ${error.response?.data?.error_message || error.message}`);
    }
  }

  // Generate password for STK Push
  generatePassword() {
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  // Format phone number to 254 format
  formatPhoneNumber(phoneNumber) {
    let formatted = phoneNumber.toString().trim();
    
    // Remove any spaces, dashes, etc.
    formatted = formatted.replace(/\D/g, '');
    
    // Convert to 254 format
    if (formatted.startsWith('0')) {
      formatted = '254' + formatted.substring(1);
    } else if (formatted.startsWith('7')) {
      formatted = '254' + formatted;
    } else if (formatted.startsWith('+254')) {
      formatted = formatted.substring(1);
    }
    
    // Ensure it's exactly 12 digits
    if (formatted.length !== 12) {
      throw new Error(`Invalid phone number format. Expected 12 digits, got ${formatted.length}`);
    }
    
    return formatted;
  }

  // Initiate REAL M-Pesa STK Push
  async initiateSTKPush(phoneNumber, amount, orderId) {
    try {
      console.log('🚀 Initiating REAL M-Pesa STK Push...');
      
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
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
        TransactionDesc: `Payment for order ${orderId}`
      };

      console.log('📱 M-Pesa Request Details:', {
        phone: formattedPhone,
        amount: amount,
        orderId: orderId,
        environment: this.environment
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

      console.log('✅ REAL M-Pesa STK Push initiated successfully:', response.data);

      if (response.data.ResponseCode === '0') {
        return {
          success: true,
          data: response.data,
          message: 'M-Pesa prompt has been sent to your phone. Please check your phone and enter your M-Pesa PIN to complete the payment.'
        };
      } else {
        return {
          success: false,
          error: response.data,
          message: response.data.ResponseDescription || 'Failed to initiate M-Pesa payment'
        };
      }
    } catch (error) {
      console.error('❌ REAL M-Pesa STK Push failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      
      let userMessage = 'Failed to initiate M-Pesa payment';
      
      if (error.response?.data?.errorMessage) {
        userMessage = error.response.data.errorMessage;
      } else if (error.response?.data?.error_code) {
        userMessage = `M-Pesa error: ${error.response.data.error_code}`;
      } else if (error.code === 'ECONNABORTED') {
        userMessage = 'M-Pesa request timeout. Please try again.';
      } else if (error.message.includes('Invalid phone number')) {
        userMessage = error.message;
      }

      return {
        success: false,
        error: error.response?.data || error.message,
        message: userMessage
      };
    }
  }

  // Check transaction status
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

module.exports = new RealMpesaService();
