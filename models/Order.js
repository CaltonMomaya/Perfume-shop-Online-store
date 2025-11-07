const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
    address: String,
    city: String
  },
  products: [{
    id: Number,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'processing', 'shipped', 'delivered'],
    default: 'pending'
  },
  paymentDetails: {
    mpesaReceiptNumber: String,
    amount: Number,
    transactionDate: String,
    phoneNumber: String,
    checkoutRequestID: String,
    error: String
  },
  checkoutRequestID: String,
  paidAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
