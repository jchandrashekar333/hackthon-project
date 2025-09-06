const express = require('express');
const { body, validationResult } = require('express-validator');
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/purchases
// @desc    Get user's purchase history
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const purchases = await Purchase.find({ buyer: req.user._id })
      .populate('product', 'title price images category')
      .populate('seller', 'username email')
      .sort({ purchaseDate: -1 });

    res.json(purchases);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/purchases/checkout
// @desc    Create purchase from cart
// @access  Private
router.post('/checkout', [
  auth,
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('paymentMethod').isIn(['Cash', 'Card', 'PayPal', 'Other']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { shippingAddress, paymentMethod } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('products.product');

    if (!cart || cart.products.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    const purchases = [];

    // Create a purchase for each product in cart
    for (const item of cart.products) {
      const product = item.product;
      
      // Check if product is still available and has enough quantity
      if (!product.isAvailable || product.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Product "${product.title}" is no longer available or insufficient quantity` 
        });
      }

      // Check if user is trying to buy their own product
      if (product.seller.toString() === req.user._id.toString()) {
        return res.status(400).json({ 
          message: `Cannot purchase your own product "${product.title}"` 
        });
      }

      const purchase = new Purchase({
        buyer: req.user._id,
        seller: product.seller,
        product: product._id,
        quantity: item.quantity,
        totalAmount: product.price * item.quantity,
        shippingAddress,
        paymentMethod
      });

      await purchase.save();
      await purchase.populate('product', 'title price images category');
      await purchase.populate('seller', 'username email');
      
      purchases.push(purchase);

      // Reduce product quantity
      product.quantity -= item.quantity;
      if (product.quantity <= 0) {
        product.isAvailable = false;
      }
      await product.save();
    }

    // Clear the cart
    cart.products = [];
    await cart.save();

    res.status(201).json({
      message: 'Purchase completed successfully',
      purchases
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/purchases/single
// @desc    Create single product purchase
// @access  Private
router.post('/single', [
  auth,
  body('productId').isMongoId().withMessage('Valid product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').isObject().withMessage('Shipping address is required'),
  body('paymentMethod').isIn(['Cash', 'Card', 'PayPal', 'Other']).withMessage('Invalid payment method')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity, shippingAddress, paymentMethod } = req.body;

    // Check if product exists and is available
    const product = await Product.findById(productId);
    if (!product || !product.isAvailable || product.quantity < quantity) {
      return res.status(404).json({ message: 'Product not found, not available, or insufficient quantity' });
    }

    // Check if user is trying to buy their own product
    if (product.seller.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot purchase your own product' });
    }

    const purchase = new Purchase({
      buyer: req.user._id,
      seller: product.seller,
      product: product._id,
      quantity,
      totalAmount: product.price * quantity,
      shippingAddress,
      paymentMethod
    });

    await purchase.save();
    await purchase.populate('product', 'title price images category');
    await purchase.populate('seller', 'username email');

    // Reduce product quantity
    product.quantity -= quantity;
    if (product.quantity <= 0) {
      product.isAvailable = false;
    }
    await product.save();

    res.status(201).json({
      message: 'Purchase completed successfully',
      purchase
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/purchases/sales
// @desc    Get user's sales history
// @access  Private
router.get('/sales', auth, async (req, res) => {
  try {
    const sales = await Purchase.find({ seller: req.user._id })
      .populate('product', 'title price images category')
      .populate('buyer', 'username email')
      .sort({ purchaseDate: -1 });

    res.json(sales);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
