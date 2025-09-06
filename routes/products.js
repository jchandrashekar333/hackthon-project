const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products with filtering and search
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;
    
    let query = { isAvailable: true };
    
    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }
    
    // Search by title
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }
    
    const products = await Product.find(query)
      .populate('seller', 'username email')
      .sort({ dateCreated: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Product.countDocuments(query);
    
    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'username email location phone');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', [
  auth,
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isIn(['Electronics', 'Clothing', 'Furniture', 'Books', 'Sports', 'Home & Garden', 'Toys', 'Beauty', 'Automotive', 'Other']).withMessage('Invalid category'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('condition').isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid condition'),
  body('location').notEmpty().withMessage('Location is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, price, quantity, condition, location, images } = req.body;

    const product = new Product({
      title,
      description,
      category,
      price,
      quantity,
      condition,
      location,
      images: images || [],
      seller: req.user._id
    });

    await product.save();
    await product.populate('seller', 'username email');

    res.status(201).json(product);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', [
  auth,
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('description').optional().notEmpty().withMessage('Description cannot be empty'),
  body('category').optional().isIn(['Electronics', 'Clothing', 'Furniture', 'Books', 'Sports', 'Home & Garden', 'Toys', 'Beauty', 'Automotive', 'Other']).withMessage('Invalid category'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('condition').optional().isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Invalid condition')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user owns the product
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        product[key] = updates[key];
      }
    });

    await product.save();
    await product.populate('seller', 'username email');

    res.json(product);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user owns the product
    if (product.seller.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/user/me
// @desc    Get current user's products
// @access  Private
router.get('/user/me', auth, async (req, res) => {
  try {
    const products = await Product.find({ 
      seller: req.user._id
    })
    .populate('seller', 'username email')
    .sort({ dateCreated: -1 });

    res.json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/products/user/:userId
// @desc    Get products by user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const products = await Product.find({ 
      seller: req.params.userId, 
      isAvailable: true 
    })
    .populate('seller', 'username email')
    .sort({ dateCreated: -1 });

    res.json(products);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
