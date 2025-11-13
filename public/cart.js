document.addEventListener("DOMContentLoaded", function () {
    const cartBadge = document.querySelector(".badge.bg-dark");
    const cartButton = document.getElementById("cartButton");
    const cartDropdown = document.getElementById("cartDropdown");
    const cartItemsList = document.getElementById("cartItemsList");
    const clearCartButton = document.getElementById("clearCartButton");
    const fullPageClearButton = document.getElementById("cart-clear-button");
    const addToCartButtons = document.querySelectorAll(".add-to-cart");

    let cart = [];

    // ===== Fetch cart from server =====
    async function fetchCart() {
        try {
            const res = await fetch("/api/cart");
            cart = await res.json();
            updateCartCounter();
            populateCartDropdown();
            populateCartPage();
        } catch (err) {
            console.error("Failed to fetch cart:", err);
        }
    }

    // ===== Add item to cart =====
    async function addToCart(userid, itemid, itemqty, itemprice) {
  try {
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid, itemid, itemqty, itemprice })
    });

    const data = await res.json();
    console.log('Added to cart:', data);
    alert('✅ Item added to cart!');
  } catch (err) {
    console.error('Error adding to cart:', err);
  }
}



    // ===== Remove item from cart =====
    async function removeFromCart(itemId) {
        try {
            await fetch(`/api/cart/${itemId}`, { method: "DELETE" });
            await fetchCart();
        } catch (err) {
            console.error("Error removing item:", err);
        }
    }

    // ===== Clear entire cart =====
    async function clearCart() {
        try {
            await fetch("/api/cart/clear", { method: "DELETE" });
            await fetchCart();
        } catch (err) {
            console.error("Error clearing cart:", err);
        }
    }

    // ===== Update cart badge =====
    function updateCartCounter() {
        const total = cart.reduce((sum, item) => sum + item.itemqty, 0);
        if (cartBadge) cartBadge.textContent = total;
    }

    // ===== Populate cart dropdown =====
    function populateCartDropdown() {
        if (!cartItemsList) return;
        cartItemsList.innerHTML = "";
        if (cart.length === 0) {
            cartItemsList.innerHTML = "<li class='text-muted text-center'>Cart is empty</li>";
            return;
        }

        cart.forEach(item => {
            const li = document.createElement("li");
            li.className = "d-flex justify-content-between align-items-center border-bottom pb-2 mb-2";
            li.innerHTML = `
                <div class="d-flex align-items-center">
                    <img src="${item.image || '#'}" style="width: 40px; height: 40px; object-fit: cover; margin-right: 8px; border-radius: 4px;">
                    <span>${item.itemid} x${item.itemqty}</span>
                    <span class="product-price">$<%= product.price %></span>

                </div>
                <button class="btn btn-sm btn-danger remove-item" data-id="${item.itemid}">X</button>
            `;
            cartItemsList.appendChild(li);
        });

        document.querySelectorAll(".remove-item").forEach(button => {
            button.addEventListener("click", () => removeFromCart(button.getAttribute("data-id")));
        });
    }

    // ===== Populate full cart page =====
    function populateCartPage() {
        const container = document.getElementById("cart-items-container");
        const subtotalDisplay = document.getElementById("cart-subtotal");
        const emptyMsg = document.getElementById("empty-cart-message");

        if (!container || !subtotalDisplay || !emptyMsg) return;

        container.innerHTML = "";
        if (cart.length === 0) {
            emptyMsg.style.display = "block";
            subtotalDisplay.textContent = "$0.00";
            return;
        }

        emptyMsg.style.display = "none";
        let subtotal = 0;

        cart.forEach(item => {
            const total = item.itemqty * item.itemprice;
            subtotal += total;

            const itemHTML = `
                <div class="d-flex flex-row justify-content-between align-items-center pt-4 pb-3 border-bottom cart-item">
                    <div class="col-5 d-flex align-items-center">
                        <img src="${item.image || '#'}" style="width: 60px; height: 60px; object-fit: cover; margin-right: 12px; border-radius: 6px;">
                        ${item.itemid}
                    </div>
                    <div class="col-2 text-center">$${item.itemprice.toFixed(2)}</div>
                    <div class="col-2 text-center">${item.itemqty}</div>
                    <div class="col-2 text-center">$${total.toFixed(2)}</div>
                    <div class="col-1 text-end item-remove" data-id="${item.itemid}">&times;</div>
                </div>
            `;
            container.innerHTML += itemHTML;
        });

        subtotalDisplay.textContent = `$${subtotal.toFixed(2)}`;

        document.querySelectorAll(".item-remove").forEach(button => {
            button.addEventListener("click", () => removeFromCart(button.getAttribute("data-id")));
        });
    }

    // ===== Navbar cart toggle =====
    if (cartButton && cartDropdown) {
        cartButton.addEventListener("click", e => {
            e.preventDefault();
            populateCartDropdown();
            cartDropdown.style.display = cartDropdown.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", e => {
            if (!cartButton.contains(e.target) && !cartDropdown.contains(e.target)) {
                cartDropdown.style.display = "none";
            }
        });
    }

    // ===== Clear buttons =====
    if (clearCartButton) clearCartButton.addEventListener("click", clearCart);
    if (fullPageClearButton) fullPageClearButton.addEventListener("click", clearCart);

    // ===== Hook into product cards =====
    addToCartButtons.forEach(button => {
    button.addEventListener("click", function () {
        const card = this.closest(".card");
        const itemId = card.querySelector(".product-id").textContent.trim();
        const itemPrice = parseFloat(card.querySelector(".product-price").textContent.replace('$',''));
        addToCart('user1', itemId, 1, itemPrice); // matches your addToCart definition
    });
});


    // Fetch cart from backend on page load
    fetchCart();
});
