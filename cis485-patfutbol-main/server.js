/* Developer: Patrick Agboka
   Project: CIS 485 E-commerce full backend
   Date: November 2025
*/

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/public", requireLogin, express.static(path.join(__dirname, "public")));
app.use(session({
  secret: "secureSecretKey",
  resave: false,
  saveUninitialized: true
}));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ===== MongoDB =====
console.log("🔄 Attempting MongoDB connection...");
mongoose.connect("mongodb://127.0.0.1:27017/cis485")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => {
    console.error("❌ MongoDB connection failed:", err);
    console.log("⚠️  Server will continue without MongoDB");
    // Don't exit - continue without MongoDB
  });

// ===== Schemas =====
const userSchema = new mongoose.Schema({ userid: String, password: String });
const cartSchema = new mongoose.Schema({ userid: String, itemid: String, itemqty: Number, itemprice: Number });
const User = mongoose.model("User", userSchema);
const Cart = mongoose.model("Cart", cartSchema);

// ===== CSV Products =====
let products = [];
const csvFiles = [
  { file: "bundesligaProducts.csv", league: "bundesliga" },
  { file: "laligaProducts.csv", league: "laliga" },
  { file: "premProducts.csv", league: "prem" },
  { file: "serieaProducts.csv", league: "seriea" },
  { file: "homeProducts.csv", league: "home"}
];

// Load CSV products safely - FIXED VERSION
async function loadProducts() {
  console.log("🔄 Starting CSV load...");
  products = [];
  for (const csvFile of csvFiles) {
    const filePath = path.join(__dirname, csvFile.file); // ✅ FIXED: Full path
    
    console.log(`🔍 Looking for: ${filePath}`);
    
    // Check if file exists before trying to read
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  CSV file not found: ${filePath}`);
      continue; // Skip this file and continue with others
    }
    
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Timeout reading ${csvFile.file}`));
        }, 5000); // 5 second timeout per file
        
        fs.createReadStream(filePath) // ✅ FIXED: Use filePath instead of csvFile.file
          .pipe(csv())
          .on("data", row => { 
            row.league = csvFile.league; 
            products.push(row); 
          })
          .on("end", () => {
            clearTimeout(timeout);
            console.log(`✅ Loaded ${csvFile.file}`);
            resolve();
          })
          .on("error", (err) => {
            clearTimeout(timeout);
            console.error(`❌ Error loading ${csvFile.file}:`, err);
            reject(err);
          });
      });
    } catch (err) {
      console.error(`⚠️  Failed to load ${csvFile.file}, skipping:`, err.message);
    }
  }
  console.log(`📦 Total products loaded: ${products.length}`);
}

// Load products but don't block server startup
console.log("🔄 Initiating product load (non-blocking)...");
loadProducts()
  .then(() => console.log("✅ Product loading completed"))
  .catch(err => {
    console.error("⚠️  CSV load error:", err);
    console.log("⚠️  Server will continue without CSV products");
  });

// ===== Auth Middleware =====
function requireLogin(req, res, next) {
  if (!req.session.userid) return res.redirect("/auth");
  next();
}

// ===== Auth Routes =====
console.log("🔄 Setting up auth routes...");
app.get("/auth", (req, res) => {
  console.log("📥 GET /auth");
  res.render("auth", { loginMessage: "", registerMessage: "" });
});

app.post("/auth", async (req, res) => {
  const { action, userid, password } = req.body;
  if (!userid || !password) {
    const msg = "Please fill in all fields.";
    return res.render("auth", { 
      loginMessage: action === "login" ? msg : "", 
      registerMessage: action === "register" ? msg : "" 
    });
  }

  try {
    if (action === "register") {
      const existing = await User.findOne({ userid });
      if (existing) {
        return res.render("auth", { 
          loginMessage: "", 
          registerMessage: "User already exists!" 
        });
      }

      const hashed = await bcrypt.hash(password, 10);
      await new User({ userid, password: hashed }).save();

      // Merge guest cart
      if (req.session.cart?.length) {
        for (const item of req.session.cart) {
          const existingItem = await Cart.findOne({ userid, itemid: item.itemid });
          if (existingItem) {
            existingItem.itemqty += item.itemqty;
            await existingItem.save();
          } else {
            await new Cart({ userid, ...item }).save();
          }
        }
        req.session.cart = [];
      }

      return res.render("auth", { 
        loginMessage: "", 
        registerMessage: "Account created successfully! Please login." 
      });
    }

    if (action === "login") {
      const user = await User.findOne({ userid });
      if (!user) {
        return res.render("auth", { 
          loginMessage: "Invalid User ID", 
          registerMessage: "" 
        });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.render("auth", { 
          loginMessage: "Incorrect password", 
          registerMessage: "" 
        });
      }

      // Merge guest cart
      if (req.session.cart?.length) {
        for (const item of req.session.cart) {
          const existingItem = await Cart.findOne({ userid, itemid: item.itemid });
          if (existingItem) {
            existingItem.itemqty += item.itemqty;
            await existingItem.save();
          } else {
            await new Cart({ userid, ...item }).save();
          }
        }
        req.session.cart = [];
      }

      req.session.userid = userid;
      return res.redirect("/index");
    }

    return res.render("auth", { 
      loginMessage: "", 
      registerMessage: "Invalid action." 
    });
  } catch (err) {
    console.error("Auth error:", err);
    return res.render("auth", { 
      loginMessage: "Server error. Try again later.", 
      registerMessage: "" 
    });
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/auth");
});

// ===== Shop Pages =====
console.log("🔄 Setting up shop page routes...");
app.get("/index", requireLogin, async (req, res) => {
  console.log("📥 GET /index");
  try {
    // If you have a Product model, use it. Otherwise use CSV products
    const homeProducts = products.filter(p => p.league === "home");
    res.render("index", { 
      products: homeProducts, 
      userid: req.session.userid 
    });
  } catch (err) {
    console.error("Index page error:", err);
    res.render("index", { 
      products: [], 
      userid: req.session.userid 
    });
  }
});

app.get("/contact", requireLogin, (req, res) => {
  res.render("contact", { userid: req.session.userid });
});

// League pages
["bundesliga", "laliga", "prem", "seriea"].forEach(league => {
  app.get(`/${league}`, requireLogin,(req, res) => {
    const leagueProducts = products.filter(p => p.league === league);
    res.render(league, { 
      products: leagueProducts, 
      userid: req.session.userid 
    });
  });
});

app.get("/cart", requireLogin, (req, res) => {
  res.render("cart", { userid: req.session.userid });
});

// ===== CART API =====
async function getCart(req) {
  if (req.session.userid) {
    return await Cart.find({ userid: req.session.userid });
  }
  req.session.cart ||= [];
  return req.session.cart;
}

async function saveCartItem(req, item) {
  if (req.session.userid) {
    let existing = await Cart.findOne({ 
      userid: req.session.userid, 
      itemid: item.itemid 
    });
    if (existing) {
      existing.itemqty += item.itemqty;
      await existing.save();
    } else {
      await new Cart({ userid: req.session.userid, ...item }).save();
    }
  } else {
    req.session.cart ||= [];
    const index = req.session.cart.findIndex(i => i.itemid === item.itemid);
    if (index >= 0) {
      req.session.cart[index].itemqty += item.itemqty;
    } else {
      req.session.cart.push(item);
    }
  }
}

async function deleteCartItem(req, itemid) {
  if (req.session.userid) {
    await Cart.deleteOne({ userid: req.session.userid, itemid });
  } else {
    req.session.cart = req.session.cart.filter(i => i.itemid !== itemid);
  }
}

async function clearCart(req) {
  if (req.session.userid) {
    await Cart.deleteMany({ userid: req.session.userid });
  } else {
    req.session.cart = [];
  }
}

app.get("/api/cart", async (req, res) => {
  try {
    const cart = await getCart(req);
    res.json(cart);
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Failed to get cart" });
  }
});

app.post("/api/cart", async (req, res) => {
  try {
    const { itemid, itemprice, itemqty, league, image } = req.body;
    if (!itemid || !itemprice || !itemqty) {
      return res.status(400).json({ error: "Invalid item data" });
    }
    await saveCartItem(req, { itemid, itemprice, itemqty, league, image });
    res.json({ message: "Item added to cart" });
  } catch (err) {
    console.error("Add to cart error:", err);
    res.status(500).json({ error: "Failed to add item" });
  }
});

app.delete("/api/cart/:itemid", async (req, res) => {
  try {
    await deleteCartItem(req, req.params.itemid);
    res.json({ message: "Item removed" });
  } catch (err) {
    console.error("Remove item error:", err);
    res.status(500).json({ error: "Failed to remove item" });
  }
});

app.delete("/api/cart/clear", async (req, res) => {
  try {
    await clearCart(req);
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

// ===== Test Route =====
app.get("/test", (req, res) => {
  res.json({ 
    message: "✅ Server is running!",
    productsLoaded: products.length,
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// ===== Start Server =====
console.log("🔄 Starting Express server...");
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🚀 SERVER READY!`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📍 Routes available:`);
  console.log(`   - /auth (login/register)`);
  console.log(`   - /index (home)`);
  console.log(`   - /contact`);
  console.log(`   - /cart`);
  console.log(`   - /bundesliga, /laliga, /prem, /seriea`);
  console.log(`   - /test (server status)`);
  console.log(`${"=".repeat(50)}\n`);
});