/* ==========================================================================
   ZENVORA SHOOP - Cart & WhatsApp Order Management (Vanilla JS)
   Brand: ZENVORA SHOOP | WhatsApp: 03232974451
   ========================================================================== */

// Unified single localStorage key for entire website
const CART_KEY = "zenvoraCart";
const WHATSAPP_NUMBER = "923232974451"; // International format for 03232974451

// Canonical product URLs. Also repairs older cart entries saved with the
// previous product filenames/IDs.
const PRODUCT_URLS = {
  "girl-leather-textured-hand-bag": "girl-leather-textured-hand-bag.html",
  "printed-lawn-3": "printed-lawn-3.html",
  "cotton-lawn": "cotton-lawn.html",
  "red-arabic-lawn": "red-arabic-lawn.html",
  "arabic-lawn": "arabic-lawn.html",
  "brown-embroidered-3-piece": "brown-embroidered-3-piece.html",
  "printed-lawn-suit-white": "printed-lawn-suit-white.html",
  "men-cotton-unstitched-suit-light-brown-summer": "men-cotton-unstitched-suit-light-brown-summer.html",
  "gents-peshawari-chappal": "gents-peshawari-chappal.html",
  "black-wash-wear-men-suit-fabric-for-all-season": "black-wash-wear-men-suit-fabric-for-all-season.html",
  "men-blue-suit": "men-blue-suit.html",
  "men-wash-&-wear-plain-suit-brown": "men-wash-&-wear-plain-suit-brown.html",
  "mens-grey": "mens-grey.html",
  "men-khaddar-plain-blue-suit-summer": "men-khaddar-plain-blue-suit-summer.html",
  "tan-leather-shoes": "tan-leather-shoes.html",
  "gents-peshawari-chappal": "gents-peshawari-chappal.html"

};

function resolveProductUrl(item) {
  const id = String(item?.id || "").trim();
  return PRODUCT_URLS[id] || String(item?.url || "").trim() || "index.html";
}

// --- Core Cart Data Functions ---
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const cart = raw ? JSON.parse(raw) : [];

    // Repair old URLs already stored in this browser's cart.
    let changed = false;
    cart.forEach(item => {
      const resolvedUrl = resolveProductUrl(item);
      if (item.url !== resolvedUrl) {
        item.url = resolvedUrl;
        changed = true;
      }
    });
    if (changed) localStorage.setItem(CART_KEY, JSON.stringify(cart));

    return cart;
  } catch (e) {
    console.error("Error loading cart from localStorage:", e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadges();
  } catch (e) {
    console.error("Error saving cart to localStorage:", e);
  }
}

function getCartCount() {
  const cart = getCart();
  return cart.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
}

function getCartTotal() {
  const cart = getCart();
  return cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);
}

// Update all cart count badges across all pages
function updateCartBadges() {
  const count = getCartCount();
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(badge => {
    badge.textContent = count;
  });
}

// Format Pakistani Rupee Currency
function formatPKR(amount) {
  return 'Rs. ' + Number(amount || 0).toLocaleString('en-PK');
}

// Validate Pakistani Mobile Number (supports 03XXXXXXXXX, +923XXXXXXXXX, 923XXXXXXXXX)
function validatePakistaniPhone(phone) {
  const clean = phone.replace(/[\s\-\(\)]/g, '');
  const pkRegex = /^(03[0-9]{9}|\+923[0-9]{9}|923[0-9]{9})$/;
  return pkRegex.test(clean);
}

// Add to Cart
function addToCart(product, quantityToAdd = 1) {
  let cart = getCart();
  const qty = Number(quantityToAdd) || 1;

  // Find existing item matching id and variants (if size/color specified)
  const existingProduct = cart.find(item =>
    item.id === product.id &&
    (!product.size || (item.size || 'Standard') === (product.size || 'Standard')) &&
    (!product.color || (item.color || 'Standard') === (product.color || 'Standard'))
  );

  if (existingProduct) {
    existingProduct.quantity = (Number(existingProduct.quantity) || 0) + qty;
    if (product.price) existingProduct.price = Number(product.price);
    if (product.image) existingProduct.image = product.image;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image,
      quantity: qty,
      category: product.category || 'Fashion',
      size: product.size || 'Standard',
      color: product.color || 'Standard',
      url: product.url || 'index.html'
    });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadges();

  if (typeof showToast === 'function') {
    showToast('Product added to cart!', 'success');
  }

  renderCart();
  return true;
}

// Modify item quantity in cart
function updateCartItemQuantity(index, delta) {
  let cart = getCart();
  if (index < 0 || index >= cart.length) return;

  const item = cart[index];
  const currentQty = Number(item.quantity) || 1;
  const newQty = currentQty + delta;

  if (newQty <= 0) {
    removeCartItem(index);
    return;
  }

  item.quantity = newQty;
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadges();
  renderCart();
}

// Remove item from cart
function removeCartItem(index) {
  let cart = getCart();
  if (index < 0 || index >= cart.length) return;

  const removedName = cart[index].name;
  cart.splice(index, 1);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadges();
  renderCart();

  if (typeof showToast === 'function') {
    showToast(`Removed "${removedName}" from cart`, 'warning');
  }
}

// Render Cart in cart.html
function renderCart() {
  const cartContainer = document.getElementById('cart-items-container');
  const emptyCartState = document.getElementById('empty-cart-state');
  const cartLayout = document.getElementById('cart-active-layout');
  const summarySubtotal = document.getElementById('summary-subtotal');
  const summaryTotal = document.getElementById('summary-total');

  if (!cartContainer) return; // Not on cart.html

  const cart = getCart();

  if (cart.length === 0) {
    if (cartLayout) cartLayout.style.display = 'none';
    if (emptyCartState) emptyCartState.style.display = 'block';
    if (summarySubtotal) summarySubtotal.textContent = formatPKR(0);
    if (summaryTotal) summaryTotal.textContent = formatPKR(0);
    return;
  }

  if (cartLayout) cartLayout.style.display = 'grid';
  if (emptyCartState) emptyCartState.style.display = 'none';

  let html = '';
  let subtotal = 0;

  cart.forEach((item, index) => {
    const itemPrice = Number(item.price) || 0;
    const itemQty = Number(item.quantity) || 1;
    const itemSubtotal = itemPrice * itemQty;
    subtotal += itemSubtotal;

    html += `
      <div class="cart-row" data-index="${index}">
        <div class="cart-item-product">
          <img src="${item.image}" alt="${item.name}" class="cart-item-img" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'">
          <div class="cart-item-meta">
            <h4><a href="${resolveProductUrl(item)}" style="color: inherit;">${item.name}</a></h4>
            <p>
              ${item.size && item.size !== 'Standard' ? '<span>Size: ' + item.size + '</span>' : ''}
              ${item.color && item.color !== 'Standard' ? (item.size && item.size !== 'Standard' ? ' • ' : '') + '<span>Color: ' + item.color + '</span>' : ''}
            </p>
          </div>
        </div>

        <div class="cart-item-price">
          ${formatPKR(itemPrice)}
        </div>

        <div>
          <div class="quantity-picker" style="height: 36px;">
            <button type="button" class="qty-btn" style="width: 32px; height: 36px; font-size: 1rem;" onclick="updateCartItemQuantity(${index}, -1)" aria-label="Decrease quantity">−</button>
            <input type="text" class="qty-input" style="width: 40px; height: 36px; font-size: 0.9rem;" value="${itemQty}" readonly>
            <button type="button" class="qty-btn" style="width: 32px; height: 36px; font-size: 1rem;" onclick="updateCartItemQuantity(${index}, 1)" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div class="cart-item-subtotal">
          ${formatPKR(itemSubtotal)}
        </div>

        <button type="button" class="btn-remove-item" title="Remove item" onclick="removeCartItem(${index})" aria-label="Remove item">
          ✕
        </button>
      </div>
    `;
  });

  cartContainer.innerHTML = html;

  const total = cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0);

  if (summarySubtotal) summarySubtotal.textContent = formatPKR(total);
  if (summaryTotal) summaryTotal.textContent = formatPKR(total);
}

// Alias for renderCartPage for backwards-compatibility
const renderCartPage = renderCart;

// WhatsApp Order Submission Handler
function handleWhatsAppOrder(e) {
  if (e) e.preventDefault();

  const cart = getCart();
  if (cart.length === 0) {
    if (typeof showToast === 'function') {
      showToast('Your cart is empty! Please add products before checking out.', 'danger');
    } else {
      alert('Your cart is empty! Please add products before checking out.');
    }
    return;
  }

  const nameInput = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const areaSelect = document.getElementById('delivery-area');
  const addressInput = document.getElementById('customer-address');

  let hasError = false;

  // Clear previous errors
  document.querySelectorAll('.form-error-msg').forEach(el => el.classList.remove('show'));

  // Validate Name
  const name = nameInput ? nameInput.value.trim() : '';
  if (!name) {
    const err = document.getElementById('error-name');
    if (err) err.classList.add('show');
    hasError = true;
  }

  // Validate Phone
  const phone = phoneInput ? phoneInput.value.trim() : '';
  if (!phone || !validatePakistaniPhone(phone)) {
    const err = document.getElementById('error-phone');
    if (err) {
      err.textContent = phone ? 'Please enter a valid Pakistani mobile number (e.g. 03232974451)' : 'Phone number is required';
      err.classList.add('show');
    }
    hasError = true;
  }

  // Validate Delivery Area
  const area = areaSelect ? areaSelect.value.trim() : '';
  if (!area) {
    const err = document.getElementById('error-area');
    if (err) err.classList.add('show');
    hasError = true;
  }

  // Validate Address
  const address = addressInput ? addressInput.value.trim() : '';
  if (!address) {
    const err = document.getElementById('error-address');
    if (err) err.classList.add('show');
    hasError = true;
  }

  if (hasError) {
    if (typeof showToast === 'function') {
      showToast('Please fill in all required delivery fields correctly.', 'danger');
    }
    return;
  }

  // Generate the formatted WhatsApp Order Message
  let message = `NEW ORDER — ZENVORA SHOOP\n\n`;
  message += `Customer Name:\n${name}\n\n`;
  message += `Phone:\n${phone}\n\n`;
  message += `Delivery Area:\n${area}\n\n`;
  message += `Address:\n${address}\n\n`;
  message += `ORDER DETAILS:\n\n`;

  let total = 0;
  cart.forEach((item, i) => {
    const itemSubtotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
    total += itemSubtotal;
    let variants = [];
    if (item.size && item.size !== 'Standard') variants.push(`Size: ${item.size}`);
    if (item.color && item.color !== 'Standard') variants.push(`Color: ${item.color}`);
    const variantStr = variants.length > 0 ? ` (${variants.join(', ')})` : '';

    message += `${i + 1}. ${item.name}${variantStr}\n`;
    message += `   Quantity: ${item.quantity}\n`;
    message += `   Price: ${formatPKR(item.price)}\n`;
    message += `   Subtotal: ${formatPKR(itemSubtotal)}\n\n`;
  });

  message += `TOTAL:\n${formatPKR(total)}\n\n`;
  message += `Please confirm my order.`;

  // Encode message for WhatsApp URL
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

  if (typeof showToast === 'function') {
    showToast('Redirecting to WhatsApp to complete your order...', 'success');
  }

  // Open WhatsApp
  setTimeout(() => {
    window.location.href = whatsappUrl;
  }, 400);
}

// Auto Initialize Badges & Cart UI on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();
  renderCart();

  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', handleWhatsAppOrder);
  }
});
