/* Developer: Patrick Agboka
   Project: CIS 485 E-commerce backend integration (Simplified)
   Date: Updated November 2025
*/

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const path = require("path");

const app = express();

// ===== Middleware setup =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

// ===== Session management =====
app.use(session({
  secret: "secureSecretKey",
  resave: false,
  saveUninitialized: true
}));

// ===== MongoDB connection =====
mongoose.connect("mongodb://localhost:27017/cis485", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.pluralize(null);
console.log("✅ Connected to MongoDB: cis485");

// ===== Schemas =====
const loginSchema = new mongoose.Schema({
  userid: String,
  password: String
});

const catalogSchema = new mongoose.Schema({
  itemid: String,
  itemname: String,
  itemdesc: String,
  itemqty: Number,
  itemprice: Number
});

const cartSchema = new mongoose.Schema({
  userid: String,
  itemid: String,
  itemqty: Number,
  itemprice: Number
});

// ===== Models =====
const User = mongoose.model("login", loginSchema);
const Catalog = mongoose.model("catalog", catalogSchema);
const Cart = mongoose.model("cart", cartSchema);

// ===== Auth middleware =====
function requireLogin(req, res, next) {
  if (!req.session.userid) return res.redirect("/login");
  next();
}

// ===== ROUTES =====

// Default route → login page
app.get("/", (req, res) => res.redirect("/login"));

// Login page
app.get("/login", (req, res) => res.render("login", { message: "" }));

// Register page
app.get("/register", (req, res) => res.render("register", { message: "" }));

// Handle registration
app.post("/register", async (req, res) => {
  const { userid, password } = req.body;
  const existing = await User.findOne({ userid });
  if (existing) return res.render("register", { message: "User already exists!" });

  const hashed = await bcrypt.hash(password, 10);
  await new User({ userid, password: hashed }).save();
  res.render("login", { message: "Registration successful! Please log in." });
});

// Handle login
app.post("/login", async (req, res) => {
  const { userid, password } = req.body;
  const user = await User.findOne({ userid });
  if (!user) return res.render("login", { message: "Invalid User ID" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.render("login", { message: "Incorrect password" });

  req.session.userid = userid;
  res.redirect("/shop");
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Shop page (requires login)
app.get("/shop", requireLogin, async (req, res) => {
  const products = await Catalog.find();
  res.render("shop", { products, userid: req.session.userid });
});

// ===== CART API ROUTES (built-in) =====

// Get current user's cart
app.get("/api/cart", requireLogin, async (req, res) => {
  const cart = await Cart.find({ userid: req.session.userid });
  res.json(cart);
});

// Add or update item in cart
app.post("/api/cart", requireLogin, async (req, res) => {
  const { itemid, itemprice, itemqty } = req.body;

  let existing = await Cart.findOne({ userid: req.session.userid, itemid });
  if (existing) {
    existing.itemqty += Number(itemqty);
    await existing.save();
  } else {
    await new Cart({ userid: req.session.userid, itemid, itemprice, itemqty }).save();
  }

  res.json({ message: "Item added to cart" });
});

// Remove one item
app.delete("/api/cart/:itemid", requireLogin, async (req, res) => {
  await Cart.deleteOne({ userid: req.session.userid, itemid: req.params.itemid });
  res.json({ message: "Item removed" });
});

// Clear all items
app.delete("/api/cart/clear", requireLogin, async (req, res) => {
  await Cart.deleteMany({ userid: req.session.userid });
  res.json({ message: "Cart cleared" });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
