/* ===========================================================
   Oma's Store — script.js (v2)
   Handles: product data, accounts (signup/login/logout),
   cart storage, gated access, and rendering.
   Uses localStorage (with a safe in-memory fallback) — this is
   a front-end demo, no server.

   IMAGES: each product points to a file inside an "images"
   folder next to these files, e.g. images/p1.jpg. Until that
   file exists, a soft placeholder with the product name shows
   instead — as soon as a matching image file is added, it
   appears automatically. No code changes needed to add photos.
   =========================================================== */

/* ---------------- Product catalog generator ----------------
   Writing 1,000 products by hand isn't practical, so they're
   built from combinations of brand names + product types per
   category. The randomness is "seeded" (a fixed starting number)
   so the exact same 1,000 products, prices and ratings come out
   the same way every time the page loads — nothing shifts around
   or breaks the cart between visits. */

function seededRandom(seed) {
  // mulberry32 — small deterministic pseudo-random generator
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function roundPrice(n) {
  const step = n < 20000 ? 100 : n < 100000 ? 500 : 1000;
  return Math.round(n / step) * step;
}

const BRANDS = [
  "Nova", "Aero", "Urban", "Pure", "Swift", "Heritage", "Prime", "Crest", "Vela", "Zenith",
  "Bright", "True", "Everyday", "Classic", "Trend", "Nimbus", "Solace", "Vantage", "Loom", "Marble",
  "Cascade", "Ember", "Halcyon", "Verve", "Orbit", "Meridian", "Lumen", "Rustic", "Bloom", "Anchor"
];

const CATEGORY_DEFS = [
  { name: "Electronics", priceMin: 5000, priceMax: 500000, types: [
    "Wireless Headphones", "Bluetooth Speaker", "Power Bank 20000mAh", "Smart Watch", 'LED TV 32-inch',
    'Laptop 14-inch', 'Monitor 24-inch', "Wi-Fi Router", "Action Camera", "Gaming Controller",
    "Wireless Earbuds", "External Hard Drive 1TB", "USB Flash Drive 64GB", "Smart Plug",
    "LED Ring Light", "Mini Projector", "Webcam HD", "Graphics Tablet"
  ]},
  { name: "Phones & Tablets", priceMin: 3000, priceMax: 600000, types: [
    "Smartphone 128GB", "Smartphone 64GB", "Smartphone 256GB", 'Tablet 10.5-inch', 'Tablet 8-inch',
    "Phone Case", "Tempered Glass Screen Protector", "Phone Charger 65W", "USB-C Cable 2m",
    "Phone Holder Stand", "Selfie Stick Tripod", "Power Bank for Phones", "Wireless Charger Pad",
    "SIM Card Ejector Tool Kit"
  ]},
  { name: "Fashion", priceMin: 3000, priceMax: 60000, types: [
    "Ankara Print Dress", "Denim Jacket", "Cotton T-Shirt", "Polo Shirt", "Palazzo Trousers",
    "Kaftan", "Wrist Watch", "Sunglasses", "Leather Belt", "Running Sneakers", "Formal Shoes",
    "Ankle Boots", "Hoodie", "Cardigan Sweater", "Maxi Skirt", "Blazer Jacket", "Track Suit", "Swimwear Set"
  ]},
  { name: "Bags", priceMin: 4000, priceMax: 45000, types: [
    "Everyday Backpack", "Leather Handbag", "Duffel Bag", 'Laptop Sleeve 14-inch', "Tote Bag",
    "Travel Organizer Pouch", "Crossbody Sling Bag", "School Backpack", "Wallet & Card Holder",
    "Gym Sports Bag", "Waist Bag", "Weekend Travel Suitcase"
  ]},
  { name: "Home & Kitchen", priceMin: 3000, priceMax: 120000, types: [
    "Kitchen Blender", "Cookware Set 5-piece", "Bedsheet Set Queen", "Electric Kettle", "Standing Fan",
    "Knife Set", "Storage Container Set", "Throw Pillow Set", "LED Desk Lamp", "Room Diffuser",
    "Non-stick Frying Pan", "Dinner Set 12-piece", "Curtain Set", "Laundry Basket", "Wall Clock",
    "Mattress Protector", "Bath Towel Set", "Cutting Board Set"
  ]},
  { name: "Beauty", priceMin: 1500, priceMax: 25000, types: [
    "Facial Care Set", "Shea Butter Cream", "Hair Serum", "Vitamin C Serum", "Lipstick Set",
    "Body Spray 3-pack", "Makeup Mirror", "Baby Shampoo", "Razor Kit", "Manicure Set",
    "Perfume 50ml", "Face Mask Set", "Hair Straightener", "Nail Polish Set", "Sunscreen SPF50", "Body Lotion 500ml"
  ]},
  { name: "Sports", priceMin: 2500, priceMax: 60000, types: [
    "Yoga Mat", "Dumbbell Set 10kg", "Jump Rope", "Hiking Backpack", "Sports Water Bottle",
    "Football", "Resistance Bands Set", "Cycling Gloves", "Gym Shorts", "Badminton Racket Set",
    "Mini Treadmill", "Boxing Gloves", "Camping Tent 2-Person", "Football Boots"
  ]},
  { name: "Groceries", priceMin: 1000, priceMax: 30000, types: [
    "Rice 10kg", "Vegetable Oil 5L", "Spaghetti Pack 5-pack", "Ground Coffee 500g", "Cereal Family Pack",
    "Multivitamin Tablets", "Bottled Water 12-pack", "Flour 5kg", "Baking Set", "Tea Bags 100-pack",
    "Noodles Carton", "Sugar 2kg", "Beans 5kg", "Milk Powder 900g"
  ]},
  { name: "Baby & Kids", priceMin: 2000, priceMax: 40000, types: [
    "Baby Diapers Pack", "Baby Wipes 80-pack", "Feeding Bottle Set", "Baby Stroller", "Baby Car Seat",
    "Kids Backpack", "Toy Building Blocks Set", "Baby Carrier Wrap", "Kids Sneakers", "Baby Blanket Set",
    "Baby Monitor", "Kids Puzzle Set", "Baby Bath Tub", "Kids Study Table"
  ]},
  { name: "Furniture", priceMin: 15000, priceMax: 350000, types: [
    "Office Chair", "Study Desk", "3-Seater Sofa", "Bookshelf 5-tier", "Bed Frame Queen",
    "Wardrobe 3-door", "Center Table", "Dining Table Set 6-seater", "TV Stand", "Bar Stool Set of 2",
    "Shoe Rack", "Bedside Table"
  ]}
];

const PRODUCTS_PER_CATEGORY = 100;

function generateProducts() {
  const products = [];
  let idCounter = 1;

  CATEGORY_DEFS.forEach((cat, catIndex) => {
    const rand = seededRandom(1000 + catIndex * 97);

    // Every (brand, type) combination for this category, then take a
    // shuffled slice — guarantees no repeated name within a category.
    const pairs = [];
    cat.types.forEach((t, tIdx) => {
      BRANDS.forEach((b, bIdx) => pairs.push([tIdx, bIdx]));
    });
    const shuffled = seededShuffle(pairs, rand);
    const count = Math.min(PRODUCTS_PER_CATEGORY, shuffled.length);

    for (let i = 0; i < count; i++) {
      const [tIdx, bIdx] = shuffled[i];
      const name = `${BRANDS[bIdx]} ${cat.types[tIdx]}`;
      const price = roundPrice(cat.priceMin + rand() * (cat.priceMax - cat.priceMin));
      const hasDiscount = rand() < 0.3;
      const oldPrice = hasDiscount ? roundPrice(price / (1 - (0.1 + rand() * 0.2))) : null;
      const rating = Math.round((3.8 + rand() * 1.1) * 10) / 10;
      const id = "p" + idCounter++;

      products.push({
        id, name, price, oldPrice, category: cat.name, rating,
        img: `images/${id}.jpg`,
        // Up to 3 photos per product — the main one plus two extra
        // angles. Same fallback rule: shows a placeholder until a
        // matching file is added, then appears automatically.
        gallery: [`images/${id}.jpg`, `images/${id}-2.jpg`, `images/${id}-3.jpg`]
      });
    }
  });

  return products;
}

const PRODUCTS = generateProducts();

const CATEGORIES = ["All", ...CATEGORY_DEFS.map(c => c.name)];

/* ---------------- Safe storage ----------------
   Some mobile HTML preview apps block real localStorage for
   files opened this way. These wrappers fall back to a plain
   in-memory store instead of crashing the whole page — accounts
   and cart just won't be remembered after a full app restart
   in that case, but everything still works while you're using it. */

const memoryStore = {};

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
}
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    memoryStore[key] = value;
  }
}
function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    delete memoryStore[key];
  }
}

/* ---------------- Accounts ---------------- */

function getUsers() {
  try {
    const raw = safeGet("omaUsers");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveUsers(users) {
  safeSet("omaUsers", JSON.stringify(users));
}
function getCurrentUser() {
  const email = safeGet("omaCurrentUser");
  if (!email) return null;
  return getUsers().find(u => u && u.email === email) || null;
}
function setCurrentUser(email) {
  safeSet("omaCurrentUser", email);
}
function logout() {
  safeRemove("omaCurrentUser");
  window.location.href = "login.html";
}

/* ---------------- Account settings: name & password ---------------- */

function updateUserName(newName) {
  const user = getCurrentUser();
  if (!user) return;
  const users = getUsers();
  const u = users.find(x => x.email === user.email);
  if (u) {
    u.name = newName;
    saveUsers(users);
  }
}
function changePassword(oldPass, newPass) {
  const user = getCurrentUser();
  if (!user) return { ok: false, msg: "You're not logged in." };
  const users = getUsers();
  const u = users.find(x => x.email === user.email);
  if (!u) return { ok: false, msg: "Account not found." };
  if (u.password !== oldPass) return { ok: false, msg: "Current password is incorrect." };
  u.password = newPass;
  saveUsers(users);
  return { ok: true };
}

/* ---------------- Account settings: saved addresses ---------------- */

function addressesKey() {
  const user = getCurrentUser();
  return user ? "omaAddresses_" + user.email : null;
}
function getAddresses() {
  const key = addressesKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveAddresses(list) {
  const key = addressesKey();
  if (!key) return;
  safeSet(key, JSON.stringify(list));
}
function getDefaultAddress() {
  const list = getAddresses();
  return list.find(a => a.isDefault) || list[0] || null;
}
function addAddress(label, address, phone) {
  const list = getAddresses();
  list.push({ id: "a" + Date.now(), label, address, phone, isDefault: list.length === 0 });
  saveAddresses(list);
}
function removeAddress(id) {
  let list = getAddresses().filter(a => a.id !== id);
  if (list.length > 0 && !list.some(a => a.isDefault)) list[0].isDefault = true;
  saveAddresses(list);
  renderSettingsPage();
  showToast("Address removed");
}
function setDefaultAddress(id) {
  const list = getAddresses().map(a => ({ ...a, isDefault: a.id === id }));
  saveAddresses(list);
  renderSettingsPage();
  showToast("Default address updated");
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("su-name").value.trim();
  const email = document.getElementById("su-email").value.trim().toLowerCase();
  const password = document.getElementById("su-password").value;
  const securityQuestion = document.getElementById("su-security-question").value;
  const securityAnswer = document.getElementById("su-security-answer").value.trim().toLowerCase();
  const msg = document.getElementById("su-msg");

  if (!name || !email || !password || !securityAnswer) {
    showMsg(msg, "Please fill in every field.", "error");
    return;
  }
  if (password.length < 4) {
    showMsg(msg, "Password should be at least 4 characters.", "error");
    return;
  }
  const users = getUsers();
  if (users.some(u => u.email === email)) {
    showMsg(msg, "An account with this email already exists. Please log in.", "error");
    return;
  }

  const referralCode = generateReferralCode(name, email);
  const refInput = getQueryParam("ref");
  const referrer = refInput ? users.find(u => u.referralCode === refInput.toUpperCase()) : null;

  users.push({ name, email, password, referralCode, referredBy: referrer ? referrer.email : null, securityQuestion, securityAnswer });
  saveUsers(users);
  setCurrentUser(email);

  if (referrer) {
    addPointsForEmail(referrer.email, REFERRAL_BONUS, `Referral bonus — ${name} joined`);
    const referrals = getReferrals();
    referrals.push({ referrerEmail: referrer.email, newUserEmail: email, newUserName: name, date: Date.now() });
    saveReferrals(referrals);
  }

  showMsg(msg, "Account created! Taking you to the store...", "success");
  setTimeout(() => { window.location.href = "index.html"; }, 700);
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("li-email").value.trim().toLowerCase();
  const password = document.getElementById("li-password").value;
  const msg = document.getElementById("li-msg");

  const users = getUsers();
  if (users.length === 0) {
    showMsg(msg, "No account found yet. Please create one first.", "error");
    return;
  }
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    showMsg(msg, "That email and password don't match any account.", "error");
    return;
  }
  setCurrentUser(email);
  showMsg(msg, "Welcome back! Taking you to the store...", "success");
  setTimeout(() => { window.location.href = "index.html"; }, 500);
}

function showMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = "form-msg show " + type;
}

/* ---------------- Forgot password ----------------
   There's no real backend to email a reset link, so recovery
   works via a security question set at signup instead — enter
   your email, answer your question correctly, then set a new
   password. Everything stays on this device, same as the rest
   of the app. */

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite food?"
];

let forgotUserEmail = null;

function handleForgotStep1(e) {
  e.preventDefault();
  const email = document.getElementById("fp-email").value.trim().toLowerCase();
  const msg = document.getElementById("fp-msg1");
  const user = getUsers().find(u => u.email === email);

  if (!user) {
    showMsg(msg, "No account found with that email.", "error");
    return;
  }
  if (!user.securityQuestion) {
    showMsg(msg, "This account has no recovery question set up. Please contact support.", "error");
    return;
  }
  forgotUserEmail = email;
  document.getElementById("fp-question-text").textContent = user.securityQuestion;
  document.getElementById("fp-step-1").style.display = "none";
  document.getElementById("fp-step-2").style.display = "block";
}

function handleForgotStep2(e) {
  e.preventDefault();
  const answer = document.getElementById("fp-answer").value.trim().toLowerCase();
  const msg = document.getElementById("fp-msg2");
  const user = getUsers().find(u => u.email === forgotUserEmail);

  if (!user || answer !== (user.securityAnswer || "")) {
    showMsg(msg, "That answer doesn't match. Try again.", "error");
    return;
  }
  document.getElementById("fp-step-2").style.display = "none";
  document.getElementById("fp-step-3").style.display = "block";
}

function handleForgotStep3(e) {
  e.preventDefault();
  const newPass = document.getElementById("fp-new-pass").value;
  const confirmPass = document.getElementById("fp-confirm-pass").value;
  const msg = document.getElementById("fp-msg3");

  if (newPass.length < 4) {
    showMsg(msg, "Password should be at least 4 characters.", "error");
    return;
  }
  if (newPass !== confirmPass) {
    showMsg(msg, "Passwords don't match.", "error");
    return;
  }
  const users = getUsers();
  const user = users.find(u => u.email === forgotUserEmail);
  if (!user) {
    showMsg(msg, "Something went wrong — please start over.", "error");
    return;
  }
  user.password = newPass;
  saveUsers(users);
  showMsg(msg, "Password reset! Taking you to login...", "success");
  setTimeout(() => { window.location.href = "login.html"; }, 900);
}

/* ---------------- Settings page handlers (settings.html) ---------------- */

function handleUpdateName(e) {
  e.preventDefault();
  const val = document.getElementById("set-name").value.trim();
  const msg = document.getElementById("name-msg");
  if (!val) {
    showMsg(msg, "Name can't be empty.", "error");
    return;
  }
  updateUserName(val);
  showMsg(msg, "Name updated!", "success");
  paintAccountLabel();
}

function handleChangePassword(e) {
  e.preventDefault();
  const oldPass = document.getElementById("set-old-pass").value;
  const newPass = document.getElementById("set-new-pass").value;
  const confirmPass = document.getElementById("set-confirm-pass").value;
  const msg = document.getElementById("pass-msg");

  if (newPass.length < 4) {
    showMsg(msg, "New password should be at least 4 characters.", "error");
    return;
  }
  if (newPass !== confirmPass) {
    showMsg(msg, "New passwords don't match.", "error");
    return;
  }
  const result = changePassword(oldPass, newPass);
  if (!result.ok) {
    showMsg(msg, result.msg, "error");
    return;
  }
  showMsg(msg, "Password changed successfully.", "success");
  document.getElementById("password-form").reset();
}

function handleAddAddress(e) {
  e.preventDefault();
  const label = document.getElementById("addr-label").value.trim();
  const address = document.getElementById("addr-full").value.trim();
  const phone = document.getElementById("addr-phone").value.trim();
  const msg = document.getElementById("addr-msg");

  if (!label || !address || !phone) {
    showMsg(msg, "Please fill in every field.", "error");
    return;
  }
  addAddress(label, address, phone);
  document.getElementById("address-form").reset();
  showMsg(msg, "Address saved!", "success");
  renderSettingsPage();
}

function renderSettingsPage() {
  const nameInput = document.getElementById("set-name");
  if (!nameInput) return;
  const user = getCurrentUser();
  if (!user) return;

  nameInput.value = user.name;

  const listEl = document.getElementById("address-list");
  const addresses = getAddresses();
  if (addresses.length === 0) {
    listEl.innerHTML = `<p style="color:var(--muted); font-size:0.85rem;">No saved addresses yet.</p>`;
    return;
  }
  listEl.innerHTML = addresses.map(a => `
    <div class="address-card">
      <div class="address-top">
        <span class="address-label">${a.label}${a.isDefault ? ' <span class="default-tag">Default</span>' : ""}</span>
      </div>
      <div class="address-text">${a.address}</div>
      <div class="address-phone">${a.phone}</div>
      <div class="address-actions">
        ${!a.isDefault ? `<span class="link-action" onclick="setDefaultAddress('${a.id}')">Set as default</span>` : ""}
        <span class="link-action remove" onclick="removeAddress('${a.id}')">Delete</span>
      </div>
    </div>
  `).join("");
}

/* ---------------- Cart ---------------- */

function getCart() {
  try {
    const raw = safeGet("omaCart");
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(c => c && typeof c.id === "string" && Number.isFinite(c.qty));
  } catch (e) {
    return [];
  }
}
function saveCart(cart) {
  safeSet("omaCart", JSON.stringify(cart));
  updateCartCount();
}
function addToCart(id) {
  const cart = getCart();
  const line = cart.find(c => c.id === id);
  if (line) line.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart(cart);
}
function changeQty(id, delta) {
  let cart = getCart();
  const line = cart.find(c => c.id === id);
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter(c => c.id !== id);
  saveCart(cart);
  renderCartPage();
}
function removeFromCart(id) {
  const cart = getCart().filter(c => c.id !== id);
  saveCart(cart);
  renderCartPage();
}
function cartItemCount() {
  const n = getCart().reduce((sum, c) => sum + c.qty, 0);
  return Number.isFinite(n) ? n : 0;
}
function updateCartCount() {
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = cartItemCount();
  });
}
/* ---------------- Currency & language ----------------
   All prices are stored in Naira everywhere (orders, cart math,
   etc.) — only the display formatting changes here, so nothing
   else in the app needs to know about currency conversion. */

const CURRENCIES = {
  NGN: { symbol: "₦", rate: 1, decimals: 0 },
  USD: { symbol: "$", rate: 1 / 1600, decimals: 2 },
  GBP: { symbol: "£", rate: 1 / 2000, decimals: 2 }
};
function getCurrency() {
  return safeGet("omaCurrency") || "NGN";
}
function setCurrency(code) {
  safeSet("omaCurrency", code);
  location.reload();
}
function formatNaira(n) {
  const code = getCurrency();
  const c = CURRENCIES[code] || CURRENCIES.NGN;
  const converted = n * c.rate;
  const formatted = c.decimals === 0
    ? Math.round(converted).toLocaleString("en-NG")
    : converted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return c.symbol + formatted;
}

const LANG = {
  en: {
    shop_now: "Shop Now", see_deals: "See Deals", browse_all: "Browse All",
    hero1_title: "Everything your home needs, delivered to your door.",
    hero1_sub: "Phones, fashion, home essentials and more — shop trusted products at prices that make sense.",
    hero2_title: "Today's deals are live 🔥",
    hero2_sub: "Save on electronics, fashion, and more — for a limited time only.",
    hero3_title: "1,000+ products across 10 categories",
    hero3_sub: "From groceries to furniture — whatever you need, Oma's Store has it.",
    todays_deals: "🔥 Today's Deals", deals_sub: "Limited-time discounts",
    popular_now: "Popular right now", recently_viewed: "Recently Viewed",
    load_more: "Load More", add_to_cart: "Add to Cart", checkout: "Checkout",
    footer_customer_care: "Customer Care", footer_about: "About", footer_my_account: "My Account",
    footer_preferences: "Preferences", compare_add: "+ Compare", compare_added: "✓ Comparing",
    search_placeholder: "Search products, brands and categories",
    cat_All: "All", cat_Groceries: "Chop Things", cat_Home_Kitchen: "House & Kitchen", cat_Baby_Kids: "Baby & Kids"
  },
  pcm: {
    shop_now: "Shop Now Sharp Sharp", see_deals: "Check Sale", browse_all: "See Everything",
    hero1_title: "Everything wey your house need, we go bring am come your door.",
    hero1_sub: "Phone, fashion, house things and pass — buy correct products for price wey make sense.",
    hero2_title: "Today sale don land 🔥",
    hero2_sub: "Save money for electronics, fashion, and pass — na for small time only.",
    hero3_title: "1,000+ products for 10 different category",
    hero3_sub: "From chop things to furniture — anything wey you need, Oma's Store get am.",
    todays_deals: "🔥 Today Sale", deals_sub: "Na for small time only",
    popular_now: "Wetin Dey Hot Now", recently_viewed: "Wetin You Don Check",
    load_more: "Show Me More", add_to_cart: "Put for Basket", checkout: "Pay Now",
    footer_customer_care: "Customer Help", footer_about: "About Us", footer_my_account: "My Account",
    footer_preferences: "Settings", compare_add: "+ Compare", compare_added: "✓ Dey Compare",
    search_placeholder: "Find products, brands and categories",
    cat_All: "All", cat_Groceries: "Chop Things", cat_Home_Kitchen: "House & Kitchen", cat_Baby_Kids: "Pikin Things"
  }
};
function getLanguage() {
  return safeGet("omaLanguage") || "en";
}
function setLanguage(code) {
  safeSet("omaLanguage", code);
  location.reload();
}
function t(key) {
  const lang = getLanguage();
  return (LANG[lang] && LANG[lang][key]) || LANG.en[key] || key;
}
function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const curSelect = document.getElementById("currency-select");
  if (curSelect) curSelect.value = getCurrency();
  const langSelect = document.getElementById("language-select");
  if (langSelect) langSelect.value = getLanguage();
}

/* ---------------- Wishlist ---------------- */
/* Saved per account (keyed by the logged-in user's email), so
   each customer sees only their own saved items. */

function wishlistKey() {
  const user = getCurrentUser();
  return user ? "omaWishlist_" + user.email : null;
}
function getWishlistIds() {
  const key = wishlistKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveWishlistIds(ids) {
  const key = wishlistKey();
  if (!key) return;
  safeSet(key, JSON.stringify(ids));
  updateWishlistCount();
}
function isInWishlist(id) {
  return getWishlistIds().includes(id);
}
function toggleWishlist(id) {
  let ids = getWishlistIds();
  const nowSaved = !ids.includes(id);
  ids = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
  saveWishlistIds(ids);
  renderProducts(null, null, false);
  renderWishlistPage();
  renderProductDetailPage();
  showToast(nowSaved ? "Saved to wishlist ♥" : "Removed from wishlist");
}
function wishlistCount() {
  return getWishlistIds().length;
}
function updateWishlistCount() {
  document.querySelectorAll(".wishlist-count").forEach(el => {
    el.textContent = wishlistCount();
  });
}

/* ---------------- Product comparison ----------------
   Saved per account, capped at 3 items. A floating bar shows on
   every page whenever at least one item is selected. */

const MAX_COMPARE = 3;

function compareKey() {
  const user = getCurrentUser();
  return user ? "omaCompare_" + user.email : null;
}
function getCompareIds() {
  const key = compareKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveCompareIds(ids) {
  const key = compareKey();
  if (!key) return;
  safeSet(key, JSON.stringify(ids));
}
function isInCompare(id) {
  return getCompareIds().includes(id);
}
function toggleCompare(id) {
  let ids = getCompareIds();
  if (ids.includes(id)) {
    ids = ids.filter(x => x !== id);
  } else {
    if (ids.length >= MAX_COMPARE) {
      showToast(`You can compare up to ${MAX_COMPARE} products — remove one first.`);
      return;
    }
    ids = [...ids, id];
  }
  saveCompareIds(ids);
  renderProducts(null, null, false);
  renderWishlistPage();
  renderProductDetailPage();
  renderCompareBar();
  renderComparePage();
}
function removeFromCompare(id) {
  saveCompareIds(getCompareIds().filter(x => x !== id));
  renderCompareBar();
  renderComparePage();
}
function clearCompare() {
  saveCompareIds([]);
  renderCompareBar();
  renderComparePage();
}
function renderCompareBar() {
  let bar = document.getElementById("compare-bar");
  const ids = getCompareIds();
  const items = ids.map(getProductById).filter(Boolean);

  if (items.length === 0) {
    if (bar) bar.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "compare-bar";
    bar.className = "compare-bar";
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    <div class="compare-bar-thumbs">
      ${items.map(p => `<div class="compare-bar-thumb"><div class="img-placeholder"></div><img src="${p.img}" onerror="this.style.display='none'"></div>`).join("")}
    </div>
    <a href="compare.html" class="btn-primary" style="border:none; padding:8px 16px; font-size:0.82rem;">Compare (${items.length})</a>
    <span class="link-action remove" onclick="clearCompare()" style="margin-left:8px;">Clear</span>
  `;
}
function renderComparePage() {
  const wrap = document.getElementById("compare-table");
  if (!wrap) return;
  const items = getCompareIds().map(getProductById).filter(Boolean);

  if (items.length === 0) {
    wrap.innerHTML = `<div class="empty-cart">No products selected yet. <br><a href="index.html" style="color:var(--clay-dark); font-weight:600;">Browse products →</a></div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="compare-grid" style="grid-template-columns: repeat(${items.length}, 1fr);">
      ${items.map(p => {
        const avg = getAverageRating(p);
        return `
          <div class="compare-col">
            <span class="link-action remove" role="button" tabindex="0" aria-label="Remove from comparison" style="float:right;" onclick="removeFromCompare('${p.id}')">✕</span>
            <div class="product-img" style="max-width:120px; margin:0 auto 8px;">
              <div class="img-placeholder">${p.name}</div>
              <img src="${p.img}" alt="${p.name}" onerror="this.style.display='none'">
            </div>
            <div class="compare-name">${p.name}</div>
            <div class="compare-row"><span>Price</span><strong>${formatNaira(p.price)}</strong></div>
            <div class="compare-row"><span>Rating</span><strong>${avg} ★</strong></div>
            <div class="compare-row"><span>Category</span><strong>${p.category}</strong></div>
            <button class="add-to-cart" style="margin-top:8px;" onclick="addToCart('${p.id}'); this.textContent='Added ✓';">${t("add_to_cart")}</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/* ---------------- Product lookup ---------------- */

function getProductById(id) {
  return PRODUCTS.find(p => p.id === id) || null;
}
function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

/* ---------------- Reviews ----------------
   Reviews are stored per product. Each product's generated rating
   (from the catalog) counts as a starting baseline — like a store
   already having some sales history — so the average shifts
   gradually as real reviews come in, instead of jumping wildly
   after just one review. */

const BASELINE_REVIEW_WEIGHT = 20;

function reviewsKey(productId) {
  return "omaReviews_" + productId;
}
function getReviews(productId) {
  try {
    const raw = safeGet(reviewsKey(productId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveReviews(productId, reviews) {
  safeSet(reviewsKey(productId), JSON.stringify(reviews));
}
function getAverageRating(p) {
  const reviews = getReviews(p.id);
  if (reviews.length === 0) return p.rating;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const avg = (p.rating * BASELINE_REVIEW_WEIGHT + sum) / (BASELINE_REVIEW_WEIGHT + reviews.length);
  return Math.round(avg * 10) / 10;
}
function submitReview(productId) {
  const user = getCurrentUser();
  if (!user) return;
  const starEls = document.querySelectorAll("#review-stars .star");
  const selected = document.querySelectorAll("#review-stars .star.selected").length;
  const commentEl = document.getElementById("review-comment");
  const msgEl = document.getElementById("review-msg");
  const comment = commentEl ? commentEl.value.trim() : "";

  if (!selected) {
    showMsg(msgEl, "Please select a star rating.", "error");
    return;
  }
  if (!comment) {
    showMsg(msgEl, "Please write a short comment.", "error");
    return;
  }

  const reviews = getReviews(productId);
  reviews.push({ name: user.name, rating: selected, comment, date: Date.now() });
  saveReviews(productId, reviews);

  if (commentEl) commentEl.value = "";
  if (starEls) starEls.forEach(s => s.classList.remove("selected"));
  showMsg(msgEl, "Thanks for your review!", "success");
  renderProductDetailPage();
}

/* ---------------- Rendering: product grid (index.html) ---------------- */

function productImgMarkup(p) {
  // Placeholder shows first; the <img> sits on top and covers it
  // automatically once a real photo exists at that path.
  return `
    <div class="product-img">
      <div class="img-placeholder">${p.name}</div>
      <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
      <button class="wish-btn ${isInWishlist(p.id) ? "active" : ""}" onclick="event.preventDefault(); event.stopPropagation(); toggleWishlist('${p.id}')" aria-label="Save to wishlist">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${isInWishlist(p.id) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
      </button>
    </div>
  `;
}

function renderProductCard(p) {
  const avg = getAverageRating(p);
  return `
    <div class="product-card">
      <a class="product-link" href="product.html?id=${p.id}">
        ${productImgMarkup(p)}
        ${p.oldPrice ? `<div class="discount-badge">-${Math.round((1 - p.price / p.oldPrice) * 100)}%</div>` : ""}
        <div class="product-info">
          <div class="product-category">${p.category}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-rating">${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))} <span style="color:var(--muted)">(${avg})</span></div>
          <div class="product-price">${formatNaira(p.price)}${p.oldPrice ? `<span class="old">${formatNaira(p.oldPrice)}</span>` : ""}</div>
        </div>
      </a>
      <button class="add-to-cart" onclick="addToCart('${p.id}'); this.textContent='Added ✓'; setTimeout(()=>{this.textContent=t('add_to_cart')}, 1200);">${t("add_to_cart")}</button>
      <button class="compare-toggle ${isInCompare(p.id) ? "active" : ""}" onclick="toggleCompare('${p.id}')">${isInCompare(p.id) ? t("compare_added") : t("compare_add")}</button>
    </div>
  `;
}

const PAGE_SIZE = 48;
let currentFilteredList = [];
let visibleCount = PAGE_SIZE;
let currentSort = "popularity";
let currentPriceMin = null;
let currentPriceMax = null;

function renderProducts(filterText, filterCategory, resetPaging) {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const text = (filterText || "").toLowerCase();

  if (resetPaging !== false) {
    currentFilteredList = PRODUCTS.filter(p => {
      const matchesText = !text || p.name.toLowerCase().includes(text);
      const matchesCat = !filterCategory || filterCategory === "All" || p.category === filterCategory;
      const matchesMin = currentPriceMin == null || p.price >= currentPriceMin;
      const matchesMax = currentPriceMax == null || p.price <= currentPriceMax;
      return matchesText && matchesCat && matchesMin && matchesMax;
    });

    if (currentSort === "price-asc") currentFilteredList.sort((a, b) => a.price - b.price);
    else if (currentSort === "price-desc") currentFilteredList.sort((a, b) => b.price - a.price);
    else if (currentSort === "rating") currentFilteredList.sort((a, b) => b.rating - a.rating);

    visibleCount = PAGE_SIZE;
  }

  const list = currentFilteredList.slice(0, visibleCount);

  grid.innerHTML = list.map(renderProductCard).join("");

  if (currentFilteredList.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--muted); padding:30px 0;">No products match your search.</p>`;
  }

  const loadMoreBtn = document.getElementById("load-more-btn");
  const countLabel = document.getElementById("shown-count");
  if (loadMoreBtn) {
    loadMoreBtn.style.display = visibleCount < currentFilteredList.length ? "inline-block" : "none";
  }
  if (countLabel) {
    countLabel.textContent = `Showing ${list.length} of ${currentFilteredList.length}`;
  }
}

function loadMoreProducts() {
  visibleCount += PAGE_SIZE;
  renderProducts(null, null, false);
}

function setupCategoryChips() {
  const chips = document.querySelectorAll(".chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyAllFilters();
    });
  });
}

function setupSearch() {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.addEventListener("input", () => applyAllFilters());
}

function setupSortAndPriceFilter() {
  const sortSelect = document.getElementById("sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", () => {
      currentSort = sortSelect.value;
      applyAllFilters();
    });
  }
  const applyBtn = document.getElementById("price-apply-btn");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      const minVal = document.getElementById("price-min").value;
      const maxVal = document.getElementById("price-max").value;
      currentPriceMin = minVal ? Number(minVal) : null;
      currentPriceMax = maxVal ? Number(maxVal) : null;
      applyAllFilters();
    });
  }
}

function applyAllFilters() {
  const activeChip = document.querySelector(".chip.active");
  const cat = activeChip ? activeChip.dataset.category : "All";
  const searchVal = document.getElementById("search-input") ? document.getElementById("search-input").value : "";
  renderProducts(searchVal, cat);
}


/* ---------------- Rendering: cart page (cart.html) ---------------- */

/* ---------------- Coupons ---------------- */

const COUPONS = {
  WELCOME10: { type: "percent", value: 10, label: "10% off your order" },
  SAVE2000: { type: "fixed", value: 2000, label: "₦2,000 off your order" },
  FREESHIP: { type: "freeship", value: 0, label: "Free delivery" }
};

function getAppliedCoupon() {
  return safeGet("omaCoupon");
}
function setAppliedCoupon(code) {
  safeSet("omaCoupon", code);
}
function clearAppliedCoupon() {
  safeRemove("omaCoupon");
}
function computeCartTotals(subtotal) {
  const couponCode = getAppliedCoupon();
  const coupon = couponCode ? COUPONS[couponCode] : null;
  let shipping = subtotal > 0 ? 2000 : 0;
  let couponDiscount = 0;
  if (coupon) {
    if (coupon.type === "percent") couponDiscount = Math.round(subtotal * coupon.value / 100);
    else if (coupon.type === "fixed") couponDiscount = Math.min(coupon.value, subtotal);
    else if (coupon.type === "freeship") shipping = 0;
  }
  const remainingAfterCoupon = Math.max(0, subtotal - couponDiscount);
  const user = getCurrentUser();
  const pointsAvailable = user ? getPointsForEmail(user.email) : 0;
  const pointsToRedeem = Math.min(checkoutRedeemPoints, pointsAvailable, remainingAfterCoupon);
  const discount = couponDiscount + pointsToRedeem;
  const total = Math.max(0, subtotal - discount) + shipping;
  const pointsEarned = Math.floor(Math.max(0, subtotal - discount) / 100);
  return { couponCode, coupon, shipping, discount, couponDiscount, pointsToRedeem, total, pointsEarned };
}
function applyCoupon() {
  const input = document.getElementById("coupon-input");
  const msg = document.getElementById("coupon-msg");
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) {
    showMsg(msg, "Enter a coupon code.", "error");
    return;
  }
  if (!COUPONS[code]) {
    showMsg(msg, "Invalid or expired coupon code.", "error");
    clearAppliedCoupon();
    renderCartPage();
    return;
  }
  setAppliedCoupon(code);
  showMsg(msg, `Applied: ${COUPONS[code].label}`, "success");
  renderCartPage();
}
function removeCoupon() {
  clearAppliedCoupon();
  const input = document.getElementById("coupon-input");
  if (input) input.value = "";
  renderCartPage();
}

/* ---------------- Points redemption at checkout ---------------- */

let checkoutRedeemPoints = 0;

function applyPointsRedeem() {
  const input = document.getElementById("points-redeem-input");
  const msg = document.getElementById("points-msg");
  const user = getCurrentUser();
  if (!input || !user) return;
  const balance = getPointsForEmail(user.email);
  const amt = parseInt(input.value, 10) || 0;

  if (amt <= 0) {
    showMsg(msg, "Enter how many points to use.", "error");
    return;
  }
  if (amt > balance) {
    showMsg(msg, `You only have ${balance} points.`, "error");
    return;
  }
  if (amt % 100 !== 0) {
    showMsg(msg, "Redeem points in multiples of 100.", "error");
    return;
  }
  checkoutRedeemPoints = amt;
  showMsg(msg, `Using ${amt} points for ${formatNaira(amt)} off.`, "success");
  renderCartPage();
}
function removePointsRedeem() {
  checkoutRedeemPoints = 0;
  const input = document.getElementById("points-redeem-input");
  if (input) input.value = "";
  renderCartPage();
}

function renderCartPage() {
  const wrap = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");
  if (!wrap) return;

  const cart = getCart();
  if (cart.length === 0) {
    wrap.innerHTML = `<div class="empty-cart">Your cart is empty. <br><a href="index.html" style="color:var(--clay-dark); font-weight:600;">Go shopping →</a></div>`;
    if (summary) summary.style.display = "none";
    return;
  }
  if (summary) summary.style.display = "block";

  let subtotal = 0;
  wrap.innerHTML = cart.map(line => {
    const p = PRODUCTS.find(pr => pr.id === line.id);
    if (!p) return "";
    subtotal += p.price * line.qty;
    return `
      <div class="cart-item">
        <div class="thumb">
          <div class="img-placeholder">${p.name}</div>
          <img src="${p.img}" alt="${p.name}" onerror="this.style.display='none'">
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${formatNaira(p.price)}</div>
          <div class="qty-row">
            <button class="qty-btn" aria-label="Decrease quantity" onclick="changeQty('${p.id}', -1)">−</button>
            <span>${line.qty}</span>
            <button class="qty-btn" aria-label="Increase quantity" onclick="changeQty('${p.id}', 1)">+</button>
            <span class="remove-link" role="button" tabindex="0" aria-label="Remove item" onclick="removeFromCart('${p.id}')">Remove</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const { couponCode, discount, shipping, total, pointsToRedeem, pointsEarned } = computeCartTotals(subtotal);

  document.getElementById("sum-subtotal").textContent = formatNaira(subtotal);
  document.getElementById("sum-shipping").textContent = formatNaira(shipping);
  document.getElementById("sum-total").textContent = formatNaira(total);

  const discountRow = document.getElementById("sum-discount-row");
  if (discountRow) {
    if (discount > 0) {
      discountRow.style.display = "flex";
      document.getElementById("sum-discount").textContent = "−" + formatNaira(discount);
    } else {
      discountRow.style.display = "none";
    }
  }
  const earnEl = document.getElementById("points-earn-preview");
  if (earnEl) earnEl.textContent = `You'll earn ${pointsEarned} points on this order.`;

  const pointsBox = document.getElementById("points-box");
  const user = getCurrentUser();
  if (pointsBox && user) {
    const balance = getPointsForEmail(user.email);
    pointsBox.style.display = balance >= 100 ? "block" : "none";
    const redeemedRow = document.getElementById("points-redeemed-row");
    const inputRow = document.getElementById("points-input-row");
    if (pointsToRedeem > 0) {
      if (redeemedRow) redeemedRow.style.display = "flex";
      if (inputRow) inputRow.style.display = "none";
      const label = document.getElementById("points-redeemed-label");
      if (label) label.textContent = `${pointsToRedeem} points applied`;
    } else {
      if (redeemedRow) redeemedRow.style.display = "none";
      if (inputRow) inputRow.style.display = "flex";
      const balLabel = document.getElementById("points-balance-label");
      if (balLabel) balLabel.textContent = `You have ${balance} points (${formatNaira(balance)} value)`;
    }
  }

  const couponInput = document.getElementById("coupon-input");
  const couponApplied = document.getElementById("coupon-applied");
  if (couponInput && couponApplied) {
    if (couponCode) {
      couponApplied.style.display = "flex";
      couponApplied.querySelector(".coupon-code-label").textContent = couponCode;
      couponInput.style.display = "none";
      document.getElementById("coupon-apply-btn").style.display = "none";
    } else {
      couponApplied.style.display = "none";
      couponInput.style.display = "block";
      document.getElementById("coupon-apply-btn").style.display = "inline-block";
    }
  }
}

/* ---------------- Orders ---------------- */

function getOrders() {
  try {
    const raw = safeGet("omaOrders");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveOrders(orders) {
  safeSet("omaOrders", JSON.stringify(orders));
}
function ordersForCurrentUser() {
  const user = getCurrentUser();
  if (!user) return [];
  return getOrders().filter(o => o.email === user.email).sort((a, b) => b.placedAt - a.placedAt);
}
function getOrderById(id) {
  const user = getCurrentUser();
  if (!user) return null;
  return getOrders().find(o => o.id === id && o.email === user.email) || null;
}

/* ---------------- Receipt download ----------------
   Builds a plain-text receipt. If this WebView blocks file
   downloads (some mobile HTML preview apps do), it falls back
   to showing the text on-screen so it can be copied by hand. */

function buildReceiptText(order) {
  const paymentLabels = { card: "Debit / Credit Card", transfer: "Bank Transfer", cod: "Pay on Delivery" };
  let lines = [];
  lines.push("OMA'S STORE — RECEIPT");
  lines.push("========================");
  lines.push(`Order: #${order.id}`);
  lines.push(`Date: ${new Date(order.placedAt).toLocaleString("en-NG")}`);
  lines.push(`Payment: ${paymentLabels[order.paymentMethod] || "Pay on Delivery"}`);
  lines.push("");
  lines.push("Items:");
  order.items.forEach(it => lines.push(`  ${it.qty}x ${it.name} — ${formatNaira(it.price * it.qty)}`));
  lines.push("");
  lines.push(`Subtotal: ${formatNaira(order.subtotal)}`);
  if (order.discount) lines.push(`Discount: -${formatNaira(order.discount)}`);
  lines.push(`Delivery: ${formatNaira(order.shipping)}`);
  lines.push(`Total: ${formatNaira(order.total)}`);
  if (order.deliverTo) {
    lines.push("");
    lines.push(`Delivering to: ${order.deliverTo.label}`);
    lines.push(order.deliverTo.address);
    lines.push(order.deliverTo.phone);
  }
  lines.push("");
  lines.push("Thank you for shopping with Oma's Store!");
  return lines.join("\n");
}
function downloadReceipt(orderId) {
  const order = getOrderById(orderId);
  if (!order) return;
  const text = buildReceiptText(order);
  try {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oma-store-receipt-${order.id}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Receipt downloaded");
  } catch (e) {
    showReceiptFallback(text);
  }
}
function showReceiptFallback(text) {
  let box = document.getElementById("receipt-fallback");
  if (!box) {
    box = document.createElement("div");
    box.id = "receipt-fallback";
    box.className = "gate-overlay";
    box.style.display = "flex";
    box.innerHTML = `
      <div class="gate-box" style="max-width:340px; text-align:left;">
        <h2 style="text-align:center;">Your Receipt</h2>
        <p style="text-align:center;">Download isn't supported here — copy the text below instead.</p>
        <textarea readonly style="width:100%; height:220px; font-size:0.75rem; border:1px solid var(--line); border-radius:8px; padding:8px; background:var(--cream); color:var(--ink);">${text}</textarea>
        <button class="btn-primary" style="width:100%; margin-top:10px;" onclick="document.getElementById('receipt-fallback').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(box);
  }
}

const ORDER_STAGES = ["Order Placed", "Processing", "Shipped", "Delivered"];

/* This is a front-end-only demo with no real courier, so the
   status is simulated from how long ago the order was placed —
   it moves through the stages on its own as time passes. */
function getOrderStatus(order) {
  const minutesElapsed = (Date.now() - order.placedAt) / 60000;
  let stepIndex = 0;
  if (minutesElapsed >= 10) stepIndex = 3;
  else if (minutesElapsed >= 5) stepIndex = 2;
  else if (minutesElapsed >= 2) stepIndex = 1;
  else stepIndex = 0;
  return { stepIndex, label: ORDER_STAGES[stepIndex] };
}

/* ---------------- Notifications ----------------
   Two kinds get generated automatically: an order-stage update
   (checked every page load against the last stage we saw for
   that order) and a one-time "new deals" notice. */

function notificationsKey() {
  const user = getCurrentUser();
  return user ? "omaNotifications_" + user.email : null;
}
function notifiedStagesKey() {
  const user = getCurrentUser();
  return user ? "omaNotifiedStages_" + user.email : null;
}
function getNotifications() {
  const key = notificationsKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveNotifications(list) {
  const key = notificationsKey();
  if (!key) return;
  safeSet(key, JSON.stringify(list));
}
function addNotification(type, title, message) {
  const list = getNotifications();
  list.unshift({ id: "n" + Date.now() + Math.floor(Math.random() * 1000), type, title, message, date: Date.now(), read: false });
  saveNotifications(list.slice(0, 30));
}
function unreadNotificationsCount() {
  return getNotifications().filter(n => !n.read).length;
}
function updateNotificationsCount() {
  document.querySelectorAll(".notif-count").forEach(el => {
    const n = unreadNotificationsCount();
    el.textContent = n;
    el.style.display = n > 0 ? "flex" : "none";
  });
}
function markAllNotificationsRead() {
  const list = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(list);
  updateNotificationsCount();
  renderNotificationsPage();
}
function checkOrderStatusNotifications() {
  const user = getCurrentUser();
  if (!user) return;
  const key = notifiedStagesKey();
  if (!key) return;
  let stages = {};
  try {
    const raw = safeGet(key);
    stages = raw ? JSON.parse(raw) : {};
  } catch (e) { stages = {}; }

  ordersForCurrentUser().forEach(order => {
    const status = getOrderStatus(order);
    const lastSeen = stages[order.id] != null ? stages[order.id] : -1;
    if (status.stepIndex > lastSeen) {
      addNotification("order", `Order #${order.id}`, `Your order is now: ${status.label}`);
      stages[order.id] = status.stepIndex;
    }
  });
  safeSet(key, JSON.stringify(stages));
}
function seedDealNotifications() {
  const user = getCurrentUser();
  if (!user) return;
  if (getNotifications().length > 0) return; // only seed once
  const topDeal = PRODUCTS.filter(p => p.oldPrice).sort((a, b) => (a.price / a.oldPrice) - (b.price / b.oldPrice))[0];
  if (topDeal) {
    const pct = Math.round((1 - topDeal.price / topDeal.oldPrice) * 100);
    addNotification("deal", "🔥 Deal of the day", `${topDeal.name} is now ${pct}% off — check it out!`);
  }
  addNotification("deal", "Welcome to Oma's Store", "Browse 1,000+ products across 10 categories, all in one place.");
}
function renderNotificationsPage() {
  const wrap = document.getElementById("notifications-list");
  if (!wrap) return;
  const list = getNotifications();
  if (list.length === 0) {
    wrap.innerHTML = `<div class="empty-cart">No notifications yet.</div>`;
    return;
  }
  wrap.innerHTML = list.map(n => `
    <div class="notif-card ${n.read ? "" : "unread"}">
      <div class="notif-top">
        <span class="notif-title">${n.type === "order" ? "📦" : "🔥"} ${n.title}</span>
        <span class="notif-date">${new Date(n.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
      </div>
      <div class="notif-msg">${n.message}</div>
    </div>
  `).join("");
}

/* ---------------- Loyalty points ----------------
   Points are tracked per email (not just per current user) so a
   referral bonus can be credited to someone who isn't logged in
   at that moment. Balance goes up and down as points are earned
   or redeemed; lifetime points only ever go up, and decide tier. */

function pointsBalanceKey(email) { return "omaPoints_" + email; }
function pointsLifetimeKey(email) { return "omaPointsLifetime_" + email; }
function pointsHistoryKey(email) { return "omaPointsHistory_" + email; }

function getPointsForEmail(email) {
  const n = parseInt(safeGet(pointsBalanceKey(email)) || "0", 10);
  return isNaN(n) ? 0 : n;
}
function getLifetimePointsForEmail(email) {
  const n = parseInt(safeGet(pointsLifetimeKey(email)) || "0", 10);
  return isNaN(n) ? 0 : n;
}
function getPointsHistoryForEmail(email) {
  try {
    const raw = safeGet(pointsHistoryKey(email));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function addPointsForEmail(email, amount, reason) {
  if (!email || !amount) return;
  safeSet(pointsBalanceKey(email), String(getPointsForEmail(email) + amount));
  if (amount > 0) {
    safeSet(pointsLifetimeKey(email), String(getLifetimePointsForEmail(email) + amount));
  }
  const history = getPointsHistoryForEmail(email);
  history.unshift({ amount, reason, date: Date.now() });
  safeSet(pointsHistoryKey(email), JSON.stringify(history.slice(0, 30)));
}
function getPoints() {
  const user = getCurrentUser();
  return user ? getPointsForEmail(user.email) : 0;
}
function getLoyaltyTier(lifetimePoints) {
  if (lifetimePoints >= 5000) return "Gold";
  if (lifetimePoints >= 1000) return "Silver";
  return "Bronze";
}

/* ---------------- Referral program ---------------- */

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
function generateReferralCode(name, email) {
  const prefix = (name.replace(/[^a-zA-Z]/g, "").slice(0, 3) || "OMA").toUpperCase();
  const suffix = hashCode(email).toString(36).slice(0, 4).toUpperCase();
  return prefix + suffix;
}
function getReferrals() {
  try {
    const raw = safeGet("omaReferrals");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveReferrals(list) {
  safeSet("omaReferrals", JSON.stringify(list));
}
function referralsForCurrentUser() {
  const user = getCurrentUser();
  if (!user) return [];
  return getReferrals().filter(r => r.referrerEmail === user.email).sort((a, b) => b.date - a.date);
}
const REFERRAL_BONUS = 200;

function renderReferralsPage() {
  const codeEl = document.getElementById("referral-code");
  const linkEl = document.getElementById("referral-link");
  const listEl = document.getElementById("referral-list");
  const pointsEl = document.getElementById("referral-points-balance");
  if (!codeEl) return;
  const user = getCurrentUser();
  if (!user) return;

  codeEl.textContent = user.referralCode || generateReferralCode(user.name, user.email);
  const link = window.location.origin + window.location.pathname.replace("referrals.html", "signup.html") + "?ref=" + codeEl.textContent;
  linkEl.textContent = link;
  linkEl.dataset.link = link;

  if (pointsEl) pointsEl.textContent = getPoints();

  const referrals = referralsForCurrentUser();
  if (referrals.length === 0) {
    listEl.innerHTML = `<p style="color:var(--muted); font-size:0.85rem;">No referrals yet — share your link to start earning points.</p>`;
    return;
  }
  listEl.innerHTML = referrals.map(r => `
    <div class="notif-card">
      <div class="notif-top">
        <span class="notif-title">👤 ${r.newUserName}</span>
        <span class="notif-date">${new Date(r.date).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</span>
      </div>
      <div class="notif-msg">You earned ${REFERRAL_BONUS} points for this referral.</div>
    </div>
  `).join("");
}
function copyReferralLink() {
  const linkEl = document.getElementById("referral-link");
  if (!linkEl) return;
  const text = linkEl.dataset.link || linkEl.textContent;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast("Referral link copied!"));
  } else {
    showToast("Copy this link: " + text);
  }
}

function placeOrder() {
  const user = getCurrentUser();
  const cart = getCart();
  if (!user || cart.length === 0) return;

  let subtotal = 0;
  const items = cart.map(line => {
    const p = PRODUCTS.find(pr => pr.id === line.id);
    if (!p) return null;
    subtotal += p.price * line.qty;
    return { id: p.id, name: p.name, price: p.price, qty: line.qty };
  }).filter(Boolean);

  const { couponCode, discount, shipping, total, pointsToRedeem, pointsEarned } = computeCartTotals(subtotal);
  const addresses = getAddresses();
  const deliverTo = addresses.find(a => a.id === checkoutSelectedAddressId) || getDefaultAddress();
  const paymentMethod = checkoutSelectedPayment || "cod";

  const order = {
    id: "OS" + Date.now().toString().slice(-8),
    email: user.email,
    items,
    subtotal,
    discount,
    couponCode: couponCode || null,
    pointsRedeemed: pointsToRedeem,
    pointsEarned,
    shipping,
    total,
    deliverTo,
    paymentMethod,
    placedAt: Date.now()
  };

  const orders = getOrders();
  orders.push(order);
  saveOrders(orders);
  saveCart([]); // empty the cart after a successful order
  clearAppliedCoupon();
  if (pointsToRedeem > 0) addPointsForEmail(user.email, -pointsToRedeem, `Redeemed at checkout (Order #${order.id})`);
  if (pointsEarned > 0) addPointsForEmail(user.email, pointsEarned, `Earned from Order #${order.id}`);
  checkoutSelectedAddressId = null;
  checkoutSelectedPayment = null;
  checkoutRedeemPoints = 0;
  return order;
}

function handleCheckout() {
  const cart = getCart();
  if (cart.length === 0) return;
  const warnEl = document.getElementById("checkout-warn");
  if (warnEl) warnEl.textContent = "";

  if (getAddresses().length === 0) {
    if (warnEl) warnEl.textContent = "Please add a delivery address in Settings before checking out.";
    return;
  }
  if (!checkoutSelectedPayment) {
    if (warnEl) warnEl.textContent = "Please choose a payment method.";
    return;
  }

  const order = placeOrder();
  if (order) {
    window.location.href = "order.html?id=" + order.id + "&placed=1";
  }
}

/* ---------------- Profile page ---------------- */

function renderProfilePage() {
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const avatarEl = document.getElementById("profile-avatar");
  const ordersEl = document.getElementById("profile-orders");
  if (!nameEl) return;

  const user = getCurrentUser();
  if (!user) return;

  nameEl.textContent = user.name;
  emailEl.textContent = user.email;
  if (avatarEl) avatarEl.textContent = user.name.trim().charAt(0).toUpperCase();

  const pointsEl = document.getElementById("profile-points");
  const tierEl = document.getElementById("profile-tier");
  if (pointsEl) pointsEl.textContent = getPoints();
  if (tierEl) tierEl.textContent = getLoyaltyTier(getLifetimePointsForEmail(user.email));

  const orders = ordersForCurrentUser();
  if (orders.length === 0) {
    ordersEl.innerHTML = `<p style="color:var(--muted); font-size:0.88rem;">No orders yet — once you check out, your orders will show up here.</p>`;
    return;
  }

  ordersEl.innerHTML = orders.map(o => {
    const status = getOrderStatus(o);
    return `
    <a class="order-card" href="order.html?id=${o.id}" style="display:block;">
      <div class="order-card-top">
        <span class="order-id">#${o.id}</span>
        <span class="order-date">${new Date(o.placedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
      <div class="order-items">${o.items.map(it => `${it.qty}× ${it.name}`).join(", ")}</div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px;">
        <span class="order-status-badge stage-${status.stepIndex}">${status.label}</span>
        <div class="order-total">${formatNaira(o.total)}</div>
      </div>
    </a>
  `;
  }).join("");
}

/* ---------------- Wishlist page (wishlist.html) ---------------- */

function renderWishlistPage() {
  const wrap = document.getElementById("wishlist-items");
  if (!wrap) return;

  const ids = getWishlistIds();
  const items = PRODUCTS.filter(p => ids.includes(p.id));

  if (items.length === 0) {
    wrap.innerHTML = `<div class="empty-cart">Your wishlist is empty. <br><a href="index.html" style="color:var(--clay-dark); font-weight:600;">Browse products →</a></div>`;
    return;
  }

  wrap.innerHTML = items.map(renderProductCard).join("");
}

/* ---------------- Product detail page (product.html) ---------------- */

function productDescription(p) {
  return `A trusted pick from our ${p.category} range — ${p.name} is popular with Oma's Store shoppers for its quality and everyday value. Fast delivery and easy returns included.`;
}

function galleryMarkup(p) {
  const images = p.gallery && p.gallery.length ? p.gallery : [p.img];
  return `
    <div class="pd-gallery">
      <div class="pd-gallery-main" id="pd-gallery-main">
        <div class="img-placeholder">${p.name}</div>
        <img id="pd-gallery-img" src="${images[0]}" alt="${p.name}" onerror="this.style.display='none'">
        <button class="wish-btn ${isInWishlist(p.id) ? "active" : ""}" onclick="toggleWishlist('${p.id}')" aria-label="Save to wishlist">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isInWishlist(p.id) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        ${images.length > 1 ? `
          <button class="gallery-arrow left" onclick="galleryNav(-1)" aria-label="Previous photo">‹</button>
          <button class="gallery-arrow right" onclick="galleryNav(1)" aria-label="Next photo">›</button>
        ` : ""}
      </div>
      ${images.length > 1 ? `
        <div class="pd-gallery-thumbs">
          ${images.map((src, i) => `
            <div class="pd-thumb ${i === 0 ? "active" : ""}" onclick="galleryGoTo(${i})">
              <img src="${src}" alt="" onerror="this.parentElement.style.background='#F1EAE0'; this.style.display='none';">
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

let galleryImages = [];
let galleryIndex = 0;
function galleryGoTo(i) {
  if (galleryImages.length === 0) return;
  galleryIndex = (i + galleryImages.length) % galleryImages.length;
  const img = document.getElementById("pd-gallery-img");
  if (img) {
    img.style.display = "block";
    img.src = galleryImages[galleryIndex];
  }
  document.querySelectorAll(".pd-thumb").forEach((t, idx) => t.classList.toggle("active", idx === galleryIndex));
}
function galleryNav(delta) {
  galleryGoTo(galleryIndex + delta);
}
function setupGallerySwipe() {
  const main = document.getElementById("pd-gallery-main");
  if (!main) return;
  let startX = null;
  main.addEventListener("touchstart", e => { startX = e.touches[0].clientX; }, { passive: true });
  main.addEventListener("touchend", e => {
    if (startX == null) return;
    const deltaX = e.changedTouches[0].clientX - startX;
    if (Math.abs(deltaX) > 40) galleryNav(deltaX < 0 ? 1 : -1);
    startX = null;
  }, { passive: true });
}

function renderProductDetailPage() {
  const wrap = document.getElementById("product-detail");
  if (!wrap) return;

  const id = getQueryParam("id");
  const p = getProductById(id);
  if (!p) {
    wrap.innerHTML = `<p style="text-align:center; color:var(--muted); padding:40px 16px;">Product not found. <a href="index.html" style="color:var(--clay-dark); font-weight:600;">Back to store →</a></p>`;
    return;
  }

  document.title = p.name + " — Oma's Store";
  addRecentlyViewed(p.id);
  galleryImages = p.gallery && p.gallery.length ? p.gallery : [p.img];
  galleryIndex = 0;
  const avg = getAverageRating(p);
  const reviews = getReviews(p.id).sort((a, b) => b.date - a.date);

  wrap.innerHTML = `
    <div class="pd-top">
      ${galleryMarkup(p)}
      <div class="pd-info">
        <div class="product-category">${p.category}</div>
        <h1>${p.name}</h1>
        <div class="product-rating">${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))} <span style="color:var(--muted)">${avg} (${reviews.length} review${reviews.length === 1 ? "" : "s"})</span></div>
        <div class="pd-price">${formatNaira(p.price)}${p.oldPrice ? `<span class="old">${formatNaira(p.oldPrice)}</span>` : ""}</div>
        <p class="pd-desc">${productDescription(p)}</p>
        <button class="btn-primary" style="border:none; width:100%;" onclick="addToCart('${p.id}'); this.textContent='Added to Cart ✓'; setTimeout(()=>{this.textContent='Add to Cart'}, 1200);">Add to Cart</button>
      </div>
    </div>

    <div class="pd-reviews">
      <h2>Customer Reviews</h2>
      ${reviews.length === 0
        ? `<p style="color:var(--muted); font-size:0.88rem;">No reviews yet — be the first to review this product.</p>`
        : reviews.map(r => `
          <div class="review-card">
            <div class="review-top">
              <span class="review-name">${r.name}</span>
              <span class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}</span>
            </div>
            <div class="review-comment">${r.comment}</div>
            <div class="review-date">${new Date(r.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</div>
          </div>
        `).join("")}

      <h3 style="margin-top:20px;">Write a Review</h3>
      <div class="form-msg" id="review-msg"></div>
      <div class="star-picker" id="review-stars">
        ${[1, 2, 3, 4, 5].map(n => `<span class="star" data-value="${n}" onclick="setReviewStars(${n})">★</span>`).join("")}
      </div>
      <textarea id="review-comment" placeholder="Share your experience with this product..." rows="3"></textarea>
      <button class="btn-primary" style="border:none;" onclick="submitReview('${p.id}')">Submit Review</button>
    </div>

    ${(() => {
      const related = PRODUCTS.filter(r => r.category === p.category && r.id !== p.id).slice(0, 8);
      if (related.length === 0) return "";
      return `
        <div class="section-title" style="max-width:700px;">
          <h2>You may also like</h2>
        </div>
        <div class="product-grid" style="max-width:700px;">
          ${related.map(renderProductCard).join("")}
        </div>
      `;
    })()}
  `;

  setupGallerySwipe();
}

function setReviewStars(value) {
  document.querySelectorAll("#review-stars .star").forEach(s => {
    s.classList.toggle("selected", Number(s.dataset.value) <= value);
  });
}

/* ---------------- Order tracking page (order.html) ---------------- */

function renderOrderTrackingPage() {
  const wrap = document.getElementById("order-detail");
  if (!wrap) return;

  const id = getQueryParam("id");
  const order = getOrderById(id);
  if (!order) {
    wrap.innerHTML = `<p style="text-align:center; color:var(--muted); padding:40px 16px;">Order not found. <a href="profile.html" style="color:var(--clay-dark); font-weight:600;">Back to my orders →</a></p>`;
    return;
  }

  const status = getOrderStatus(order);
  const justPlaced = getQueryParam("placed") === "1";
  const paymentLabels = { card: "Debit / Credit Card", transfer: "Bank Transfer", cod: "Pay on Delivery" };

  wrap.innerHTML = `
    ${justPlaced ? `<div class="order-success-banner">🎉 Thank you! Your order has been placed.</div>` : ""}
    <div class="invoice-actions no-print">
      <button class="btn-secondary" onclick="window.print()">🖨️ Print Invoice</button>
      <button class="btn-secondary" onclick="downloadReceipt('${order.id}')">⬇️ Download Receipt</button>
    </div>
    <div id="invoice-area">
      <div class="invoice-header print-only">
        <div class="invoice-store">Oma's Store</div>
        <div>Invoice — Order #${order.id}</div>
      </div>
      <h2 style="padding-top:20px;" class="no-print-mt">Order #${order.id}</h2>
      <p style="color:var(--muted); font-size:0.85rem; margin-bottom:20px;">Placed on ${new Date(order.placedAt).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${paymentLabels[order.paymentMethod] || "Pay on Delivery"}</p>

      <div class="tracker no-print">
        ${ORDER_STAGES.map((stage, i) => `
          <div class="tracker-step ${i <= status.stepIndex ? "done" : ""}">
            <div class="tracker-dot">${i <= status.stepIndex ? "✓" : i + 1}</div>
            <div class="tracker-label">${stage}</div>
          </div>
        `).join("")}
      </div>

      ${order.deliverTo ? `
        <div class="address-card" style="margin-top:16px;">
          <div class="address-top"><span class="address-label">Delivering to: ${order.deliverTo.label}</span></div>
          <div class="address-text">${order.deliverTo.address}</div>
          <div class="address-phone">${order.deliverTo.phone}</div>
        </div>
      ` : ""}

      <div class="cart-summary" style="margin-top:16px;">
        ${order.items.map(it => `<div class="summary-row"><span>${it.qty}× ${it.name}</span><span>${formatNaira(it.price * it.qty)}</span></div>`).join("")}
        ${order.discount ? `<div class="summary-row"><span>Discount${order.couponCode ? " (" + order.couponCode + ")" : ""}</span><span>−${formatNaira(order.discount)}</span></div>` : ""}
        <div class="summary-row"><span>Delivery</span><span>${formatNaira(order.shipping)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatNaira(order.total)}</span></div>
      </div>
      <p class="print-only invoice-footer">Thank you for shopping with Oma's Store!</p>
    </div>
  `;
}

/* ---------------- Gated access ---------------- */

function enforceGate() {
  const user = getCurrentUser();
  const gate = document.getElementById("gate-overlay");
  const main = document.getElementById("gated-content");
  if (!gate || !main) return;

  if (user) {
    gate.style.display = "none";
    main.classList.remove("gate-blur");
  } else {
    gate.style.display = "flex";
    main.classList.add("gate-blur");
  }
}

/* ---------------- Header account label (shared) ---------------- */

function paintAccountLabel() {
  const el = document.getElementById("account-label");
  if (!el) return;
  const user = getCurrentUser();
  if (user && user.name) {
    const firstName = String(user.name).trim().split(" ")[0] || "there";
    el.innerHTML = `Hi, <a href="profile.html">${firstName}</a> · <a href="#" onclick="logout(); return false;">Logout</a>`;
  } else {
    el.innerHTML = `<a href="login.html">Login</a>`;
  }
}

/* ---------------- Toast notifications ----------------
   A small, non-blocking message at the bottom of the screen —
   used instead of browser alert() pop-ups, which feel jarring
   on a real app. */

let toastTimer = null;
function showToast(message) {
  let el = document.getElementById("app-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "app-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

/* ---------------- Homepage hero slideshow ---------------- */

let heroIndex = 0;
let heroTimer = null;
function heroGoTo(i) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".hero-dot");
  if (slides.length === 0) return;
  heroIndex = (i + slides.length) % slides.length;
  slides.forEach((s, idx) => s.classList.toggle("active", idx === heroIndex));
  dots.forEach((d, idx) => d.classList.toggle("active", idx === heroIndex));
}
function heroSlide(delta) {
  heroGoTo(heroIndex + delta);
  restartHeroTimer();
}
function restartHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => heroGoTo(heroIndex + 1), 5000);
}
function setupHeroSlider() {
  if (!document.getElementById("hero-slider")) return;
  restartHeroTimer();
}

/* ---------------- Featured deals rail (index.html) ---------------- */

function renderDealsRail() {
  const grid = document.getElementById("deals-grid");
  if (!grid) return;
  const deals = PRODUCTS
    .filter(p => p.oldPrice)
    .sort((a, b) => (1 - a.price / a.oldPrice) < (1 - b.price / b.oldPrice) ? 1 : -1)
    .slice(0, 12);
  grid.innerHTML = deals.map(renderProductCard).join("");
}

/* ---------------- Recently viewed ---------------- */

function recentlyViewedKey() {
  const user = getCurrentUser();
  return user ? "omaRecentlyViewed_" + user.email : null;
}
function addRecentlyViewed(id) {
  const key = recentlyViewedKey();
  if (!key) return;
  let list = [];
  try {
    const raw = safeGet(key);
    list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
  } catch (e) { list = []; }
  list = [id, ...list.filter(x => x !== id)].slice(0, 10);
  safeSet(key, JSON.stringify(list));
}
function getRecentlyViewed() {
  const key = recentlyViewedKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function renderRecentlyViewedRail() {
  const grid = document.getElementById("recent-grid");
  const section = document.getElementById("recently-viewed-section");
  if (!grid) return;
  const ids = getRecentlyViewed();
  const items = ids.map(id => getProductById(id)).filter(Boolean);
  if (items.length === 0) {
    if (section) section.style.display = "none";
    grid.innerHTML = "";
    return;
  }
  if (section) section.style.display = "flex";
  grid.innerHTML = items.map(renderProductCard).join("");
}

/* ---------------- Checkout: address & payment selection ---------------- */

let checkoutSelectedAddressId = null;
let checkoutSelectedPayment = null;

function renderCheckoutBlocks() {
  const addrBox = document.getElementById("checkout-address");
  const payBox = document.getElementById("checkout-payment");
  if (!addrBox) return;

    const addresses = getAddresses();
  if (!checkoutSelectedAddressId) {
    const def = getDefaultAddress();
    checkoutSelectedAddressId = def ? def.id : null;
  }
  const selected = addresses.find(a => a.id === checkoutSelectedAddressId);

  if (addresses.length === 0) {
    addrBox.innerHTML = `<h4>Deliver To</h4><p class="checkout-warning">No saved address yet. <a href="settings.html" style="color:var(--clay-dark); font-weight:600;">Add one in Settings →</a></p>`;
  } else if (selected) {
    addrBox.innerHTML = `
      <h4>Deliver To <span class="change-link" onclick="toggleAddressPicker()">Change</span></h4>
      <div style="font-size:0.85rem;"><strong>${selected.label}</strong><br>${selected.address}<br>${selected.phone}</div>
      <div id="address-picker" style="display:none; margin-top:10px;">
        ${addresses.map(a => `
          <label class="radio-option">
            <input type="radio" name="checkout-addr" value="${a.id}" ${a.id === checkoutSelectedAddressId ? "checked" : ""} onchange="selectCheckoutAddress('${a.id}')">
            ${a.label} — ${a.address}
          </label>
        `).join("")}
      </div>
    `;
  }

  if (payBox) {
    const methods = [
      { id: "card", label: "Debit / Credit Card" },
      { id: "transfer", label: "Bank Transfer" },
      { id: "cod", label: "Pay on Delivery" }
    ];
    payBox.innerHTML = `
      <h4>Payment Method</h4>
      ${methods.map(m => `
        <label class="radio-option">
          <input type="radio" name="checkout-pay" value="${m.id}" ${checkoutSelectedPayment === m.id ? "checked" : ""} onchange="selectCheckoutPayment('${m.id}')">
          ${m.label}
        </label>
      `).join("")}
    `;
  }
}
function toggleAddressPicker() {
  const el = document.getElementById("address-picker");
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}
function selectCheckoutAddress(id) {
  checkoutSelectedAddressId = id;
  renderCheckoutBlocks();
}
function selectCheckoutPayment(id) {
  checkoutSelectedPayment = id;
}

/* ---------------- Live chat / support widget ----------------
   A simple keyword-matching assistant — no real backend, just
   canned answers for common questions. Chat history is saved
   per account so it's still there next time. */

const CHAT_RULES = [
  { keywords: ["order", "track", "delivery", "shipping"], reply: "You can track any order from Profile → My Orders. Each one shows live status: Order Placed → Processing → Shipped → Delivered." },
  { keywords: ["return", "refund"], reply: "Returns are accepted within 7 days of delivery — just reach out with your order number and we'll sort it out." },
  { keywords: ["payment", "pay", "card"], reply: "We accept Debit/Credit Card, Bank Transfer, and Pay on Delivery — pick whichever suits you at checkout." },
  { keywords: ["point", "reward", "loyalty"], reply: "You earn 1 point per ₦100 spent. Redeem 100+ points (in multiples of 100) for money off at checkout — check your balance on your Profile page." },
  { keywords: ["refer", "invite", "friend"], reply: "Share your link from the Referrals page — you'll earn 200 points every time a friend signs up with it!" },
  { keywords: ["coupon", "promo", "discount"], reply: "Try WELCOME10, SAVE2000, or FREESHIP at checkout for instant discounts." },
  { keywords: ["hi", "hello", "hey"], reply: "Hi there! 👋 How can I help — orders, returns, payments, or rewards?" },
  { keywords: ["human", "agent", "person"], reply: "Our team is happy to help directly — email support@omastore.ng and we'll get back to you within 24 hours." }
];
function getBotReply(text) {
  const lower = text.toLowerCase();
  const match = CHAT_RULES.find(rule => rule.keywords.some(k => lower.includes(k)));
  return match ? match.reply : "I'm not totally sure about that one — try asking about orders, returns, payment, or rewards, or email support@omastore.ng for a human.";
}
function chatKey() {
  const user = getCurrentUser();
  return user ? "omaChat_" + user.email : null;
}
function getChatHistory() {
  const key = chatKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveChatHistory(list) {
  const key = chatKey();
  if (!key) return;
  safeSet(key, JSON.stringify(list.slice(-40)));
}
function renderChatMessages() {
  const body = document.getElementById("chat-body");
  if (!body) return;
  const history = getChatHistory();
  body.innerHTML = history.map(m => `<div class="chat-msg ${m.sender}">${m.text}</div>`).join("");
  body.scrollTop = body.scrollHeight;
}
function sendChatMessage() {
  const input = document.getElementById("chat-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const history = getChatHistory();
  history.push({ sender: "user", text, date: Date.now() });
  saveChatHistory(history);
  input.value = "";
  renderChatMessages();

  setTimeout(() => {
    const h2 = getChatHistory();
    h2.push({ sender: "bot", text: getBotReply(text), date: Date.now() });
    saveChatHistory(h2);
    renderChatMessages();
  }, 500);
}
function toggleChatPanel() {
  const panel = document.getElementById("chat-panel");
  if (!panel) return;
  const opening = panel.style.display !== "flex";
  panel.style.display = opening ? "flex" : "none";
  if (opening) {
    if (getChatHistory().length === 0) {
      saveChatHistory([{ sender: "bot", text: "Hi! I'm Oma's Store Assistant 🤖 Ask me about orders, returns, delivery, payment, or rewards.", date: Date.now() }]);
    }
    renderChatMessages();
  }
}
function renderChatWidget() {
  if (!getCurrentUser()) return;
  if (document.getElementById("chat-toggle-btn")) return; // already injected

  const btn = document.createElement("button");
  btn.id = "chat-toggle-btn";
  btn.className = "chat-toggle-btn";
  btn.setAttribute("aria-label", "Chat with support");
  btn.textContent = "💬";
  btn.onclick = toggleChatPanel;
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.className = "chat-panel";
  panel.style.display = "none";
  panel.innerHTML = `
    <div class="chat-panel-header">
      Oma's Store Support
      <span onclick="toggleChatPanel()" style="cursor:pointer;">✕</span>
    </div>
    <div class="chat-body" id="chat-body"></div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Ask a question..." onkeydown="if(event.key==='Enter'){sendChatMessage()}">
      <button onclick="sendChatMessage()">➤</button>
    </div>
  `;
  document.body.appendChild(panel);
}

/* ---------------- Onboarding welcome tour ----------------
   Shown once per account, first time they land on the homepage
   after logging in. */

const ONBOARDING_STEPS = [
  { title: "Welcome to Oma's Store! 👋", text: "Browse 1,000+ products across 10 categories — electronics, fashion, groceries, and more." },
  { title: "Save your favorites", text: "Tap the heart ♥ to add something to your Wishlist, or \"+ Compare\" to compare up to 3 products side by side." },
  { title: "Earn as you shop", text: "You earn 1 point per ₦100 spent — redeem 100+ points for money off at checkout. Refer friends for 200 bonus points each!" },
  { title: "Need help?", text: "Tap the 💬 bubble in the corner anytime to chat with our support assistant." }
];
let onboardingStep = 0;

function onboardingKey() {
  const user = getCurrentUser();
  return user ? "omaOnboarded_" + user.email : null;
}
function hasSeenOnboarding() {
  const key = onboardingKey();
  return key ? safeGet(key) === "1" : true;
}
function markOnboardingSeen() {
  const key = onboardingKey();
  if (key) safeSet(key, "1");
  const el = document.getElementById("onboarding-overlay");
  if (el) el.remove();
}
function onboardingRender() {
  const box = document.getElementById("onboarding-box");
  if (!box) return;
  const step = ONBOARDING_STEPS[onboardingStep];
  const isLast = onboardingStep === ONBOARDING_STEPS.length - 1;
  box.innerHTML = `
    <h2>${step.title}</h2>
    <p style="color:var(--muted); font-size:0.9rem; margin-bottom:20px;">${step.text}</p>
    <div class="hero-dots" style="position:static; margin-bottom:16px;">
      ${ONBOARDING_STEPS.map((_, i) => `<span class="hero-dot ${i === onboardingStep ? "active" : ""}" style="background:${i === onboardingStep ? "var(--clay)" : "var(--line)"};"></span>`).join("")}
    </div>
    <button class="btn-primary" style="width:100%; border:none;" onclick="onboardingNext()">${isLast ? "Get Started" : "Next"}</button>
    ${!isLast ? `<button class="btn-secondary" style="width:100%; margin-top:8px; border:none; background:none;" onclick="markOnboardingSeen()">Skip</button>` : ""}
  `;
}
function onboardingNext() {
  if (onboardingStep >= ONBOARDING_STEPS.length - 1) {
    markOnboardingSeen();
    return;
  }
  onboardingStep++;
  onboardingRender();
}
function renderOnboarding() {
  if (!document.getElementById("product-grid")) return; // homepage only
  if (!getCurrentUser()) return;
  if (hasSeenOnboarding()) return;
  if (document.getElementById("onboarding-overlay")) return;

  onboardingStep = 0;
  const overlay = document.createElement("div");
  overlay.id = "onboarding-overlay";
  overlay.className = "gate-overlay";
  overlay.style.display = "flex";
  overlay.innerHTML = `<div class="gate-box" id="onboarding-box"></div>`;
  document.body.appendChild(overlay);
  onboardingRender();
}

/* ---------------- Dark mode ---------------- */

function applyTheme(theme) {
  document.body.classList.toggle("dark", theme === "dark");
  document.querySelectorAll(".theme-toggle").forEach(btn => {
    btn.textContent = theme === "dark" ? "☀️" : "🌙";
  });
}
function toggleTheme() {
  const next = document.body.classList.contains("dark") ? "light" : "dark";
  safeSet("omaTheme", next);
  applyTheme(next);
}
function setupTheme() {
  applyTheme(safeGet("omaTheme") || "light");
}

/* ---------------- Search: suggestions & recent searches ---------------- */

function recentSearchesKey() {
  const user = getCurrentUser();
  return user ? "omaRecentSearches_" + user.email : null;
}
function getRecentSearches() {
  const key = recentSearchesKey();
  if (!key) return [];
  try {
    const raw = safeGet(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function saveRecentSearches(list) {
  const key = recentSearchesKey();
  if (!key) return;
  safeSet(key, JSON.stringify(list));
}
function addRecentSearch(term) {
  term = (term || "").trim();
  if (!term) return;
  const list = [term, ...getRecentSearches().filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
  saveRecentSearches(list);
}
function clearRecentSearches() {
  saveRecentSearches([]);
  renderSearchDropdown();
}
function hideSearchDropdown() {
  const dropdown = document.getElementById("search-dropdown");
  if (dropdown) dropdown.style.display = "none";
}
function renderSearchDropdown() {
  const input = document.getElementById("search-input");
  const dropdown = document.getElementById("search-dropdown");
  if (!input || !dropdown) return;
  const val = input.value.trim();

  if (!val) {
    const recents = getRecentSearches();
    if (recents.length === 0) {
      dropdown.style.display = "none";
      return;
    }
    dropdown.innerHTML = `
      <div class="search-dd-header">Recent Searches <span class="link-action" onclick="clearRecentSearches()">Clear</span></div>
      ${recents.map(t => `<div class="search-dd-item" onclick="selectRecentSearch('${t.replace(/'/g, "\\'")}')">🕐 ${t}</div>`).join("")}
    `;
    dropdown.style.display = "block";
    return;
  }

  const matches = PRODUCTS.filter(p => p.name.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
  dropdown.innerHTML = matches.length === 0
    ? `<div class="search-dd-item" style="color:var(--muted);">No matches found</div>`
    : matches.map(p => `<div class="search-dd-item" onclick="goToProduct('${p.id}')">${p.name}</div>`).join("");
  dropdown.style.display = "block";
}
function selectRecentSearch(term) {
  const input = document.getElementById("search-input");
  if (input) input.value = term;
  applyAllFilters();
  hideSearchDropdown();
}
function goToProduct(id) {
  const input = document.getElementById("search-input");
  addRecentSearch(input ? input.value : "");
  window.location.href = "product.html?id=" + id;
}
function setupSearchDropdown() {
  const input = document.getElementById("search-input");
  if (!input) return;
  input.addEventListener("focus", renderSearchDropdown);
  input.addEventListener("input", renderSearchDropdown);
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      addRecentSearch(input.value);
      hideSearchDropdown();
    }
  });
  input.addEventListener("blur", () => setTimeout(hideSearchDropdown, 150));
}

/* ---------------- Init ----------------
   Each piece runs independently (wrapped in try/catch) so that
   if one part fails, it doesn't stop the rest of the page. */

function safeRun(fn) {
  try { fn(); } catch (e) { console.error(e); }
}

document.addEventListener("DOMContentLoaded", () => {
  safeRun(() => renderProducts("", "All"));
  safeRun(setupCategoryChips);
  safeRun(setupSearch);
  safeRun(setupSortAndPriceFilter);
  safeRun(updateCartCount);
  safeRun(updateWishlistCount);
  safeRun(paintAccountLabel);
  safeRun(enforceGate);
  safeRun(renderCartPage);
  safeRun(renderWishlistPage);
  safeRun(renderProductDetailPage);
  safeRun(renderOrderTrackingPage);
  safeRun(renderSettingsPage);
  safeRun(renderProfilePage);
  safeRun(setupHeroSlider);
  safeRun(renderDealsRail);
  safeRun(renderRecentlyViewedRail);
  safeRun(renderCheckoutBlocks);
  safeRun(setupTheme);
  safeRun(setupSearchDropdown);
  safeRun(applyLanguage);
  safeRun(checkOrderStatusNotifications);
  safeRun(seedDealNotifications);
  safeRun(updateNotificationsCount);
  safeRun(renderNotificationsPage);
  safeRun(renderCompareBar);
  safeRun(renderComparePage);
  safeRun(renderReferralsPage);
  safeRun(renderChatWidget);
  safeRun(renderOnboarding);
});
