const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

mongoose.connect('mongodb://localhost:27017/cis485', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const productSchema = new mongoose.Schema({
  id: String,
  league: String,       // 'bundesliga', 'laliga', 'prem', 'seriea', 'home'
  name: String,
  price: Number,
  maxPrice: Number,
  oldPrice: Number,
  image: String,
  rating: Number
});


const Product = mongoose.model('Product', productSchema);

async function importCSV(filePath, leagueName) {
  return new Promise((resolve, reject) => {
    const products = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', row => {
        products.push({
          league: leagueName,
          name: row.name,
          price: parseFloat(row.price),
          image: row.image,
          description: row.description
        });
      })
      .on('end', async () => {
        await Product.deleteMany({ league: leagueName });
        await Product.insertMany(products);
        console.log(`✅ Imported ${products.length} ${leagueName} products`);
        resolve();
      })
      .on('error', reject);
  });
}

(async () => {
  await importCSV('bundesligaProducts.csv', 'bundesliga');
  await importCSV('laligaProducts.csv', 'laliga');
  await importCSV('premProducts.csv', 'prem');
  await importCSV('serieaProducts.csv', 'seriea');
  await importCSV('homeProducts.csv', 'home');

  mongoose.connection.close();
})();
