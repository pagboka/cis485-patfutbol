const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const apiRoutes = require('./routes/api');
const Product = require('./models/Product'); 
const fs = require('fs');
const csv = require('csv-parser');


const app = express();
const PORT = process.env.PORT || 3000;

// Mongo connection
mongoose.connect('mongodb://127.0.0.1:27017/cis485',
    {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error(err));


// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const csvFiles = [
  { file: 'bundesligaProducts.csv', league: 'bundesliga' },
  { file: 'laligaProducts.csv', league: 'laliga' },
  { file: 'premProducts.csv', league: 'prem' },
  { file: 'serieaProducts.csv', league: 'seriea' }
];

let products = [];

// Load all CSVs
function loadProducts() {
  products = []; // clear in case of reload
  let filesLoaded = 0;

  csvFiles.forEach(csvFile => {
    fs.createReadStream(csvFile.file)
      .pipe(csv())
      .on('data', (row) => {
        // add league to each product
        row.league = csvFile.league;
        products.push(row);
      })
      .on('end', () => {
        filesLoaded++;
        if (filesLoaded === csvFiles.length) {
          console.log('All CSVs loaded:', products.length, 'products');
        }
      });
  });
}

// Load CSVs at startup
loadProducts();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// API routes
app.use('/api', apiRoutes);


// Page routes
app.get('/', (req, res) => res.render('index'));

app.get('/bundesliga', async (req, res) => {
  const products = await Product.find({ league: 'bundesliga' });
  res.render('bundesliga', { products });
});

app.get('/laliga', async (req, res) => {
  const products = await Product.find({ league: 'laliga' });
  res.render('laliga', { products });
});

app.get('/prem', async (req, res) => {
  const products = await Product.find({ league: 'prem' });
  res.render('prem', { products });
});

app.get('/seriea', async (req, res) => {
  const products = await Product.find({ league: 'seriea' });
  res.render('seriea', { products });
});
app.listen(3000, () => console.log('Server running on port 3000'));
