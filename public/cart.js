document.addEventListener("DOMContentLoaded", () => {
  const cartCount = document.getElementById("cart-count");
  const addButtons = document.querySelectorAll(".add-to-cart");
  const cartDropdown = document.getElementById("cartItemsList");

  // ===== Update cart counter + dropdown =====
  async function updateCart() {
    try {
      const res = await fetch("/api/cart");
      const cart = await res.json();

      // Counter
      const totalQty = cart.reduce((sum, item) => sum + Number(item.itemqty || 0), 0);
      if (cartCount) cartCount.textContent = totalQty;

      // Dropdown
      if (cartDropdown) {
        cartDropdown.innerHTML = "";
        cart.forEach(item => {
          const li = document.createElement("li");
          li.className = "d-flex align-items-center mb-2";

          const img = document.createElement("img");
          img.src = `/pics/${item.league}/${item.image}`;
          img.alt = item.itemid;
          img.style.width = "40px";
          img.style.height = "40px";
          img.style.objectFit = "cover";
          img.className = "me-2 rounded";

          li.appendChild(img);
          li.appendChild(document.createTextNode(`${item.itemid} x${item.itemqty}`));
          cartDropdown.appendChild(li);
        });
      }

    } catch (err) {
      console.error("Error updating cart:", err);
    }
  }

  // ===== Add to cart =====
  addButtons.forEach(btn => {
    btn.addEventListener("click", async e => {
      e.preventDefault();
      const card = btn.closest(".card");
      if (!card) return;

      const itemid = card.querySelector(".product-name").textContent.trim();
      const itemprice = parseFloat(card.querySelector(".product-price").textContent.replace("$","").trim());
      const itemqty = 1;
      const league = card.dataset.league;
      const image = card.dataset.image;

      try {
        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Adding...";

        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemid, 
            itemprice, 
            itemqty, 
            league: card.dataset.league, 
            image: card.dataset.image })
        });

        if (!res.ok) throw new Error("Failed to add to cart");

        btn.textContent = "Added!";
        btn.classList.remove("btn-outline-dark");
        btn.classList.add("btn-success");

        await updateCart();

        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove("btn-success");
          btn.classList.add("btn-outline-dark");
          btn.disabled = false;
        }, 1200);

      } catch (err) {
        console.error("Add to cart error:", err);
        btn.disabled = false;
        btn.textContent = "Add to Cart";
        alert("Failed to add item to cart.");
      }
    });
  });

  // ===== Initialize =====
  updateCart();
});
