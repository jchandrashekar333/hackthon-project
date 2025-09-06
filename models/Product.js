const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Clothing', 'Furniture', 'Books', 'Sports', 'Home & Garden', 'Toys', 'Beauty', 'Automotive', 'Other']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String,
    default: ''
  }],
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor']
  },
  location: {
    type: String,
    required: true,
    maxlength: 100
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update dateUpdated on save
productSchema.pre('save', function(next) {
  this.dateUpdated = new Date();
  next();
});

module.exports = mongoose.model('Product', productSchema);
