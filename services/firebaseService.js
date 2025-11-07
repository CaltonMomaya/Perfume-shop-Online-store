const admin = require('./firebaseAdmin');   // ✅ FIXED — import initialized admin
const moment = require('moment');

const db = admin.firestore();

class FirebaseService {
  constructor() {
    this.ordersCollection = db.collection('orders');
    this.productsCollection = db.collection('products');
  }

  // Order Management
  async createOrder(orderData) {
    try {
      const orderId = 'OSS' + Date.now();
      const order = {
        orderId,
        ...orderData,
        status: 'pending',
        createdAt: moment().toISOString(),
        updatedAt: moment().toISOString()
      };

      await this.ordersCollection.doc(orderId).set(order);
      
      return {
        success: true,
        message: 'Order created successfully',
        order
      };
    } catch (error) {
      console.error('Create order error:', error);
      return {
        success: false,
        message: 'Error creating order',
        error: error.message
      };
    }
  }

  async getOrder(orderId) {
    try {
      const doc = await this.ordersCollection.doc(orderId).get();
      
      if (!doc.exists) {
        return {
          success: false,
          message: 'Order not found'
        };
      }

      return {
        success: true,
        order: doc.data()
      };
    } catch (error) {
      console.error('Get order error:', error);
      return {
        success: false,
        message: 'Error retrieving order'
      };
    }
  }

  async updateOrder(orderId, updates) {
    try {
      updates.updatedAt = moment().toISOString();
      await this.ordersCollection.doc(orderId).update(updates);
      
      return {
        success: true,
        message: 'Order updated successfully'
      };
    } catch (error) {
      console.error('Update order error:', error);
      return {
        success: false,
        message: 'Error updating order'
      };
    }
  }

  async getAllOrders() {
    try {
      const snapshot = await this.ordersCollection.orderBy('createdAt', 'desc').get();
      const orders = [];
      
      snapshot.forEach(doc => {
        orders.push(doc.data());
      });

      return {
        success: true,
        orders,
        count: orders.length
      };
    } catch (error) {
      console.error('Get orders error:', error);
      return {
        success: false,
        message: 'Error retrieving orders'
      };
    }
  }

  // Initialize sample products
  async initializeProducts() {
    try {
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

      for (const product of products) {
        await this.productsCollection.doc(product.id.toString()).set(product);
      }

      console.log('Sample products initialized');
      return { success: true, message: 'Products initialized' };
    } catch (error) {
      console.error('Initialize products error:', error);
      return { success: false, message: 'Error initializing products' };
    }
  }

  async getProducts() {
    try {
      const snapshot = await this.productsCollection.get();
      const products = [];

      snapshot.forEach(doc => {
        products.push(doc.data());
      });

      return {
        success: true,
        products,
        count: products.length
      };
    } catch (error) {
      console.error('Get products error:', error);
      return {
        success: false,
        message: 'Error retrieving products'
      };
    }
  }

  async getProduct(productId) {
    try {
      const doc = await this.productsCollection.doc(productId.toString()).get();
      
      if (!doc.exists) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      return {
        success: true,
        product: doc.data()
      };
    } catch (error) {
      console.error('Get product error:', error);
      return {
        success: false,
        message: 'Error retrieving product'
      };
    }
  }
}

module.exports = new FirebaseService();
