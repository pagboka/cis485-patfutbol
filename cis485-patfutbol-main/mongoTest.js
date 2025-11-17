const mongoose = require("mongoose");

mongoose.connect("mongodb://127.0.0.1:27017/cis485?directConnection=true")
  .then(() => {
    console.log("✅ Connected!");
    return mongoose.connection.db.stats();
  })
  .then(stats => console.log(stats))
  .catch(err => console.error(err))
  .finally(() => mongoose.connection.close());
