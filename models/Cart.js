const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalAmount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Calculate total amount before saving
cartSchema.pre('save', async function(next) {
  if (this.products.length === 0) {
    this.totalAmount = 0;
    return next();
  }

  try {
    const Product = mongoose.model('Product');
    let total = 0;
    
    for (const item of this.products) {
      const product = await Product.findById(item.product);
      if (product) {
        total += product.price * item.quantity;
      }
    }
    
    this.totalAmount = total;
    this.lastUpdated = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Cart', cartSchema);
