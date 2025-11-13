const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ✅ Define schema
const cartSchema = new mongoose.Schema({
  userid: { type: String, required: true },
  itemid: { type: String, required: true },
  itemqty: { type: Number, default: 1 },
  itemprice: { type: Number, required: true }
});

// ✅ Define model (explicit collection name “cart”)
const Cart = mongoose.model("Cart", cartSchema, "cart");

// ✅ Add item to cart
router.post("/cart", async (req, res) => {
  try {
    const { userid, itemid, itemqty, itemprice } = req.body;
    if (!userid || !itemid || !itemprice)
      return res.status(400).json({ error: "Missing required fields" });

    // If item exists for same user, increment quantity instead of creating duplicate
    const existingItem = await Cart.findOne({ userid, itemid });
    if (existingItem) {
      existingItem.itemqty += Number(itemqty);
      await existingItem.save();
      return res.json({ message: "Item quantity updated", item: existingItem });
    }

    const newItem = await Cart.create({ userid, itemid, itemqty, itemprice });
    res.json({ message: "Item added to cart", item: newItem });
  } catch (err) {
    console.error("Error adding to cart:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Get all items in a user's cart
router.get("/cart/:userid", async (req, res) => {
  try {
    const items = await Cart.find({ userid: req.params.userid });
    res.json(items);
  } catch (err) {
    console.error("Error fetching cart:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Clear a user's cart
router.delete("/cart/:userid", async (req, res) => {
  try {
    await Cart.deleteMany({ userid: req.params.userid });
    res.json({ message: "Cart cleared" });
  } catch (err) {
    console.error("Error clearing cart:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
