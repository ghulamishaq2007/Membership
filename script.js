/* ==========================================================================
   ZENVORA SHOOP - Main Script (Pure Vanilla JS)
   Brand: ZENVORA SHOOP | WhatsApp: 03232974451
   ========================================================================== */

// --- Global Toast Notification Helper ---
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = '✓';
  if (type === 'danger') icon = '✕';
  if (type === 'warning') icon = '⚠';

  toast.innerHTML = `<span style="font-size: 1.1rem;">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

// --- Mobile Hamburger Menu & Drawer ---
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger-btn');
  const navMenu = document.getElementById('nav-menu');
  const navbar = document.querySelector('.navbar');

  if (hamburger && navMenu) {
    // Ensure .mobile-nav-header with close button exists
    if (!navMenu.querySelector('.mobile-nav-header')) {
      const headerLi = document.createElement('li');
      headerLi.className = 'mobile-nav-header';
      headerLi.innerHTML = `
        <span class="mobile-nav-title">ZENVORA <span>SHOOP</span></span>
        <button type="button" class="mobile-nav-close" id="mobile-nav-close" aria-label="Close navigation menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      `;
      navMenu.insertBefore(headerLi, navMenu.firstChild);
    }

    const openMenu = () => {
      hamburger.classList.add('active');
      navMenu.classList.add('active');
      document.body.classList.add('menu-open');
      hamburger.setAttribute('aria-expanded', 'true');
      hamburger.setAttribute('aria-label', 'Close navigation menu');
    };

    const closeMenu = () => {
      hamburger.classList.remove('active');
      navMenu.classList.remove('active');
      document.body.classList.remove('menu-open');
      hamburger.setAttribute('aria-expanded', 'false');
      hamburger.setAttribute('aria-label', 'Open navigation menu');
    };

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (navMenu.classList.contains('active')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close button (X) inside top-right of mobile menu
    navMenu.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.mobile-nav-close');
      if (closeBtn) {
        e.stopPropagation();
        closeMenu();
      }
    });

    // Close menu when clicking nav links
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        closeMenu();
      });
    });

    // Close when clicking outside menu
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('active') && !navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        closeMenu();
      }
    });

    // Close menu if window is resized above mobile breakpoint (768px)
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && navMenu.classList.contains('active')) {
        closeMenu();
      }
    }, { passive: true });
  }

  // Sticky Navbar shadow on scroll
  window.addEventListener('scroll', () => {
    if (navbar) {
      if (window.scrollY > 20) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // --- Category Filtering (on index.html) ---
  initCategoryFilter();

  // --- Product Quick Add Buttons on Grid ---
  initQuickAddButtons();

  // --- Testimonials Slider ---
  initTestimonialsSlider();

  // --- FAQ Accordion ---
  initFaqAccordion();
});

// Category filtering logic
function initCategoryFilter() {
  const filterButtons = document.querySelectorAll('.category-btn');
  const productCards = document.querySelectorAll('.product-card');

  if (!filterButtons.length || !productCards.length) return;

  const normalize = (value) =>
    String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function applyCategory(category, updateHash = false) {
    const selected = normalize(category);

    filterButtons.forEach((button) => {
      button.classList.toggle(
        'active',
        normalize(button.dataset.category) === selected
      );
    });

    productCards.forEach((card) => {
      const cardCategory = normalize(card.getAttribute('data-category'));
      const isNew = normalize(card.getAttribute('data-new')) === 'true';

      let show = false;

      switch (selected) {
        case 'all':
          show = true;
          break;
        case 'new-arrivals':
          show = isNew;
          break;
        case 'ladies suits':
          show = cardCategory === 'ladies suits';
          break;
        case 'gents suits':
          show = cardCategory === 'gents suits';
          break;
        case 'shoes':
          show = cardCategory === 'shoes';
          break;
        case 'sandals':
          show = cardCategory === 'sandals';
          break;
        default:
          show = cardCategory === selected;
      }

      card.hidden = !show;
      card.style.display = show ? '' : 'none';
      card.classList.toggle('category-hidden', !show);
    });

    if (updateHash) {
      history.replaceState(
        null,
        '',
        '#products?category=' + encodeURIComponent(category)
      );
    }
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      applyCategory(button.dataset.category || 'all', true);
    });
  });

  // Support direct links such as:
  // index.html?category=ladies%20suits
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const hashParams = hash.includes('?')
    ? new URLSearchParams(hash.split('?')[1])
    : null;

  const requested =
    params.get('category') ||
    (hashParams ? hashParams.get('category') : null);

  if (requested) {
    const match = Array.from(filterButtons).find(
      (button) =>
        normalize(button.dataset.category) === normalize(requested)
    );

    if (match) {
      applyCategory(match.dataset.category, false);
      setTimeout(() => {
        document.getElementById('products')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 50);
      return;
    }
  }

  // Initial state
  applyCategory('all', false);
}
// Quick Add to Cart button from Index Grid cards
function initQuickAddButtons() {
  const quickAddButtons = document.querySelectorAll('.btn-quick-add');
  quickAddButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const price = Number(btn.getAttribute('data-price'));
      const image = btn.getAttribute('data-image');
      const category = btn.getAttribute('data-category');
      const url = btn.getAttribute('data-url');

      if (typeof window.addToCart !== 'function') {
        console.error('ZENVORA: cart.js did not load. Check cart.js path/deployment.');
        showToast('Cart system could not load. Please refresh the page.', 'danger');
        return;
      }

      window.addToCart({
        id,
        name,
        price,
        image,
        category,
        url,
        size: 'Standard',
        color: 'Standard'
      }, 1);
    });
  });
}

// --- Product Detail Page Initializer ---
function initProductDetailPage(config) {
  const {
    id,
    name,
    price,
    originalPrice,
    category,
    images = [],
    sizes = [],
    colors = [],
    description = '',
    url = window.location.pathname.split('/').pop() || 'product.html'
  } = config;

  let selectedSize = sizes.length > 0 ? sizes[0] : 'Standard';
  let selectedColor = colors.length > 0 ? colors[0].name : 'Standard';
  let selectedColorImage = colors.length > 0 && colors[0].image ? colors[0].image : (images[0] || '');
  let selectedQty = 1;

  // Cache product controls before attaching handlers.
  // These were previously referenced without being declared, which stopped
  // product-page initialization before the Add to Cart handler was attached.
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const qtyInput = document.getElementById('product-qty-input') || document.getElementById('quantity-input');
  const addToCartBtn = document.getElementById('btn-add-to-cart');
  const buyNowBtn = document.getElementById('btn-buy-now');

  // 1. Populate UI text
  const titleEl = document.getElementById('product-title');
  if (titleEl) titleEl.textContent = name;

  const categoryEl = document.getElementById('product-category');
  if (categoryEl) categoryEl.textContent = category;

  const priceEl = document.getElementById('product-price');
  if (priceEl) priceEl.textContent = 'Rs. ' + Number(price).toLocaleString('en-PK');

  const oldPriceEl = document.getElementById('product-old-price');
  if (oldPriceEl) {
    if (originalPrice && originalPrice > price) {
      oldPriceEl.textContent = 'Rs. ' + Number(originalPrice).toLocaleString('en-PK');
      oldPriceEl.style.display = 'inline';
    } else {
      oldPriceEl.style.display = 'none';
    }
  }

  const descEl = document.getElementById('product-description');
  if (descEl) descEl.textContent = description;

  // 2. Image Gallery Setup
  const mainImage = document.getElementById('gallery-main-img');
  const thumbnailsContainer = document.getElementById('gallery-thumbnails');

  if (mainImage && images.length > 0) {
    mainImage.src = images[0];
    mainImage.alt = name;
  }

  if (thumbnailsContainer && images.length > 0) {
    thumbnailsContainer.innerHTML = '';
    images.forEach((imgSrc, index) => {
      const thumbBtn = document.createElement('button');
      thumbBtn.className = `thumbnail-btn ${index === 0 ? 'active' : ''}`;
      thumbBtn.type = 'button';
      thumbBtn.innerHTML = `<img src="${imgSrc}" alt="${name} view ${index + 1}" onerror="this.src='https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80'">`;
      
      thumbBtn.addEventListener('click', () => {
        document.querySelectorAll('.thumbnail-btn').forEach(b => b.classList.remove('active'));
        thumbBtn.classList.add('active');
        if (mainImage) {
          mainImage.style.opacity = '0.4';
          setTimeout(() => {
            mainImage.src = imgSrc;
            mainImage.style.opacity = '1';
          }, 150);
        }
      });

      thumbnailsContainer.appendChild(thumbBtn);
    });
  }

  // 4. Size Selector Setup
  const sizeContainer = document.getElementById('size-selector-container');
  const selectedSizeLabel = document.getElementById('selected-size-label');
  if (sizeContainer && sizes.length > 0) {
    sizeContainer.innerHTML = '';
    sizes.forEach((sizeOption, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `size-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = sizeOption;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSize = sizeOption;
        if (selectedSizeLabel) selectedSizeLabel.textContent = sizeOption;
      });

      sizeContainer.appendChild(btn);
    });
    if (selectedSizeLabel) selectedSizeLabel.textContent = selectedSize;
  }

  // 5. Color Selector Setup
  const colorContainer = document.getElementById('color-selector-container');
  const selectedColorLabel = document.getElementById('selected-color-label');
  if (colorContainer && colors.length > 0) {
    colorContainer.innerHTML = '';
    colors.forEach((col, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `color-swatch-btn ${idx === 0 ? 'active' : ''}`;
      btn.style.backgroundColor = col.hex || '#000000';
      btn.title = col.name;

      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedColor = col.name;
        selectedColorImage = col.image || images[0] || '';
        if (selectedColorLabel) selectedColorLabel.textContent = col.name;

        // If a color has its own product image (e.g. handbags), show it immediately.
        if (mainImage && col.image) {
          mainImage.style.opacity = '0.4';
          setTimeout(() => {
            mainImage.src = col.image;
            mainImage.alt = `${name} - ${col.name}`;
            mainImage.style.opacity = '1';
          }, 120);
        }
      });

      colorContainer.appendChild(btn);
    });
    if (selectedColorLabel) selectedColorLabel.textContent = selectedColor;
  }
  // 6. Quantity Handler
  if (qtyMinus && qtyPlus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      if (selectedQty > 1) {
        selectedQty--;
        qtyInput.value = selectedQty;
      }
    });

    qtyPlus.addEventListener('click', () => {
      selectedQty++;
      qtyInput.value = selectedQty;
    });
  }

  // 7. Add to Cart Handler
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {

      const productPayload = {
        id,
        name,
        price: Number(price),
        image: selectedColorImage || (images.length > 0 ? images[0] : ''),
        category,
        size: selectedSize,
        color: selectedColor,
        url
      };

      addToCart(productPayload, selectedQty);
    });
  }

  // 8. Buy Now Handler (save to localStorage, then open cart.html)
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {

      if (typeof addToCart !== 'function') {
        showToast('Cart system could not be loaded. Please refresh the page.', 'danger');
        console.error('addToCart() is not available. Make sure cart.js is loaded before script.js.');
        return;
      }

      const productPayload = {
        id: String(id),
        name: String(name),
        price: Number(price),
        image: selectedColorImage || (images.length > 0 ? images[0] : ''),
        category: String(category || 'Fashion'),
        size: selectedSize || 'Standard',
        color: selectedColor || 'Standard',
        url: url || (window.location.pathname.split('/').pop() || 'index.html')
      };

      const success = addToCart(productPayload, selectedQty);

      if (success) {
        // Resolve the cart URL from the current page instead of relying on
        // the browser's current relative path.
        const cartUrl = new URL('cart.html', document.baseURI).href;
        window.location.assign(cartUrl);
      }
    });
  }

  // 9. Tab Switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePane = document.getElementById(`tab-${target}`);
      if (activePane) activePane.classList.add('active');
    });
  });
}

// 10. Testimonials Slider
function initTestimonialsSlider() {
  const track = document.getElementById('testimonials-track');
  const prevBtn = document.getElementById('testimonial-prev-btn');
  const nextBtn = document.getElementById('testimonial-next-btn');
  const dotsContainer = document.getElementById('testimonial-dots');

  if (!track) return;

  const cards = track.querySelectorAll('.testimonial-card');
  if (!cards.length) return;

  // Build pagination dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    cards.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.className = `testimonial-dot ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('type', 'button');
      dot.setAttribute('aria-label', `Go to testimonial ${idx + 1}`);
      dot.addEventListener('click', () => {
        const targetCard = cards[idx];
        if (targetCard) {
          track.scrollTo({
            left: targetCard.offsetLeft - track.offsetLeft,
            behavior: 'smooth'
          });
        }
      });
      dotsContainer.appendChild(dot);
    });
  }

  const updateControls = () => {
    const scrollLeft = track.scrollLeft;
    let closestIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, idx) => {
      const distance = Math.abs((card.offsetLeft - track.offsetLeft) - scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = idx;
      }
    });

    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.testimonial-dot');
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === closestIndex);
      });
    }

    if (prevBtn) {
      prevBtn.disabled = track.scrollLeft <= 10;
    }
    if (nextBtn) {
      const maxScroll = track.scrollWidth - track.clientWidth - 10;
      nextBtn.disabled = track.scrollLeft >= maxScroll;
    }
  };

  let scrollTimeout = null;
  track.addEventListener('scroll', () => {
    if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
    scrollTimeout = requestAnimationFrame(updateControls);
  }, { passive: true });

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const card = cards[0];
      const step = card ? card.offsetWidth + 20 : 300;
      track.scrollBy({ left: -step, behavior: 'smooth' });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const card = cards[0];
      const step = card ? card.offsetWidth + 20 : 300;
      track.scrollBy({ left: step, behavior: 'smooth' });
    });
  }

  updateControls();
  window.addEventListener('resize', updateControls, { passive: true });
}

// FAQ Accordion functionality
function initFaqAccordion() {
  const accordion = document.getElementById('faq-accordion');
  if (!accordion) return;

  const items = accordion.querySelectorAll('.faq-item');
  if (!items.length) return;

  items.forEach((item) => {
    const btn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');

    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isCurrentlyActive = item.classList.contains('active');

      // Close all other items (only one open at a time)
      items.forEach((otherItem) => {
        if (otherItem !== item && otherItem.classList.contains('active')) {
          const otherBtn = otherItem.querySelector('.faq-question');
          const otherAns = otherItem.querySelector('.faq-answer');
          const otherIcon = otherItem.querySelector('.faq-icon');

          otherItem.classList.remove('active');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          if (otherAns) {
            otherAns.style.maxHeight = '0px';
            otherAns.style.opacity = '0';
          }
          if (otherIcon) otherIcon.textContent = '+';
        }
      });

      // Toggle current item
      if (isCurrentlyActive) {
        item.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        answer.style.maxHeight = '0px';
        answer.style.opacity = '0';
        if (icon) icon.textContent = '+';
      } else {
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
        answer.style.maxHeight = answer.scrollHeight + 'px';
        answer.style.opacity = '1';
        if (icon) icon.textContent = '−';
      }
    });
  });

  // Responsive: dynamically adjust maxHeight on window resize if an item is active
  window.addEventListener('resize', () => {
    const activeItem = accordion.querySelector('.faq-item.active');
    if (activeItem) {
      const activeAns = activeItem.querySelector('.faq-answer');
      if (activeAns) {
        activeAns.style.maxHeight = activeAns.scrollHeight + 'px';
      }
    }
  }, { passive: true });
}


