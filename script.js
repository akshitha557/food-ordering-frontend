
const API_BASE = "http://localhost:8080/api";

// Cart data
let cart = [];

// Load data when page opens
document.addEventListener("DOMContentLoaded", () => {
    loadRestaurants();
    loadFoods();

    document
        .getElementById("clear-cart-button")
        ?.addEventListener("click", clearCart);

    document
        .getElementById("checkout-button")
        ?.addEventListener("click", placeOrder);

    renderCart();
});

// -------------------------------
// Load Restaurants
// -------------------------------
async function loadRestaurants() {
    const container = document.getElementById("restaurants-list");

    if (!container) return;

    container.innerHTML = "<p>Loading restaurants...</p>";

    try {
        const response = await fetch(`${API_BASE}/restaurants`);

        if (!response.ok) {
            throw new Error("Failed to load restaurants");
        }

        const restaurants = await response.json();

        if (!restaurants.length) {
            container.innerHTML = "<p>No restaurants found.</p>";
            return;
        }

        container.innerHTML = restaurants.map(restaurant => `
            <div class="restaurant-card">
                <h3>${escapeHTML(restaurant.name)}</h3>
                <p>${escapeHTML(restaurant.address || "Address not available")}</p>
                <p>Phone: ${escapeHTML(restaurant.phone || "N/A")}</p>
            </div>
        `).join("");

    } catch (error) {
        console.error("Restaurant error:", error);
        container.innerHTML =
            "<p>Unable to load restaurants. Please check your backend.</p>";
    }
}

// -------------------------------
// Load Food Items
// -------------------------------
async function loadFoods() {
    const container = document.getElementById("foods-list");

    if (!container) return;

    container.innerHTML = "<p>Loading delicious food...</p>";

    try {
        const response = await fetch(`${API_BASE}/foods`);

        if (!response.ok) {
            throw new Error("Failed to load food items");
        }

        const foods = await response.json();

        if (!foods.length) {
            container.innerHTML = "<p>No food items available.</p>";
            return;
        }

        container.innerHTML = foods.map(food => `
            <div class="food-card">
                <h3>${escapeHTML(food.name)}</h3>
                <p>Restaurant: ${
                    escapeHTML(food.restaurant?.name || "Restaurant")
                }</p>
                <p class="food-price">${formatMoney(food.price)}</p>
                <button type="button"
                    onclick="addToCart(${Number(food.id)})">
                    Add to Cart
                </button>
            </div>
        `).join("");

    } catch (error) {
        console.error("Food error:", error);
        container.innerHTML =
            "<p>Unable to load food. Please check your backend.</p>";
    }
}

// -------------------------------
// Add Food to Cart
// -------------------------------
function addToCart(foodId) {
    foodId = Number(foodId);

    const existingItem = cart.find(item => item.foodId === foodId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            foodId: foodId,
            quantity: 1
        });
    }

    renderCart();
    showMessage("Food added to cart!", "success");
}

// -------------------------------
// Increase Quantity
// -------------------------------
function increaseQuantity(foodId) {
    const item = cart.find(item => item.foodId === Number(foodId));

    if (item) {
        item.quantity++;
        renderCart();
    }
}

// -------------------------------
// Decrease Quantity
// -------------------------------
function decreaseQuantity(foodId) {
    const item = cart.find(item => item.foodId === Number(foodId));

    if (!item) return;

    if (item.quantity > 1) {
        item.quantity--;
    } else {
        cart = cart.filter(item => item.foodId !== Number(foodId));
    }

    renderCart();
}

// -------------------------------
// Remove Item from Cart
// -------------------------------
function removeCartItem(foodId) {
    cart = cart.filter(item => item.foodId !== Number(foodId));
    renderCart();
}

// -------------------------------
// Clear Cart
// -------------------------------
function clearCart() {
    cart = [];
    renderCart();
    showMessage("Cart cleared.", "info");
}

// -------------------------------
// Display Cart
// -------------------------------
async function renderCart() {
    const container = document.getElementById("cart-items");
    const totalElement = document.getElementById("cart-total");

    if (!container || !totalElement) return;

    if (cart.length === 0) {
        container.innerHTML = "<p>Your cart is empty.</p>";
        totalElement.textContent = formatMoney(0);
        return;
    }

    container.innerHTML = "<p>Updating cart...</p>";

    try {
        const response = await fetch(`${API_BASE}/foods`);

        if (!response.ok) {
            throw new Error("Unable to retrieve food prices");
        }

        const foods = await response.json();

        let total = 0;

        container.innerHTML = cart.map(item => {
            const food = foods.find(
                food => Number(food.id) === item.foodId
            );

            if (!food) return "";

            const subtotal = Number(food.price) * item.quantity;
            total += subtotal;

            return `
                <div class="cart-item">
                    <div>
                        <h4>${escapeHTML(food.name)}</h4>
                        <p>${formatMoney(food.price)} each</p>
                        <p>Subtotal: ${formatMoney(subtotal)}</p>
                    </div>

                    <div class="quantity-controls">
                        <button type="button"
                            onclick="decreaseQuantity(${item.foodId})">
                            -
                        </button>

                        <span>${item.quantity}</span>

                        <button type="button"
                            onclick="increaseQuantity(${item.foodId})">
                            +
                        </button>

                        <button type="button"
                            onclick="removeCartItem(${item.foodId})">
                            Remove
                        </button>
                    </div>
                </div>
            `;
        }).join("");

        totalElement.textContent = formatMoney(total);

    } catch (error) {
        console.error("Cart error:", error);
        container.innerHTML =
            "<p>Unable to display your cart. Please try again.</p>";
    }
}

// -------------------------------
// Place Order
// -------------------------------
async function placeOrder() {
    const checkoutButton = document.getElementById("checkout-button");

    if (cart.length === 0) {
        showMessage("Please add food to your cart first.", "error");
        return;
    }

    // Use an existing customer from the database.
    // Customer ID 1 must exist in the customer table.
    const customerId = 1;

    if (checkoutButton) {
        checkoutButton.disabled = true;
        checkoutButton.textContent = "Placing Order...";
    }

    try {
        // Submit each cart item to the backend.
        for (const item of cart) {
            const response = await fetch(`${API_BASE}/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    customerId: customerId,
                    foodId: item.foodId,
                    quantity: item.quantity
                })
            });

            if (!response.ok) {
                const errorText = await response.text();

                throw new Error(
                    errorText || `Order failed (${response.status})`
                );
            }
        }

        // Clear cart only after all requests succeed.
        cart = [];
        await renderCart();

        showMessage(
            "Order placed successfully! Customer ID: " + customerId,
            "success"
        );

    } catch (error) {
        console.error("Order error:", error);

        showMessage(
            "Could not place order: " + error.message,
            "error"
        );

    } finally {
        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = "Place Order";
        }
    }
}

// -------------------------------
// Display Messages
// -------------------------------
function showMessage(message, type = "info") {
    const messageElement = document.getElementById("checkout-message");

    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = "message " + type;
    } else {
        alert(message);
    }
}

// -------------------------------
// Format Price
// -------------------------------
function formatMoney(amount) {
    return "₹" + Number(amount || 0).toFixed(2);
}

// -------------------------------
// Escape HTML
// -------------------------------
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}
