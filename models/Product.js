const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  maxPrice: Number,
  oldPrice: Number,
  img: String,
  stars: Number,
  league: String  // 'bundesliga', 'laliga', 'prem', 'seriea'
});

module.exports = mongoose.model('Product', productSchema);
