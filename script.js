
/* =====================================================
   ZENTRA PAY
   Main Application Script
   Firebase Authentication + Cloud Firestore
   ===================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updatePassword
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";


/* =====================================================
   1. FIREBASE CONFIGURATION
   ===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAnOkETG5voBPvRCaFO7ZklOOV4odMux64",
  authDomain: "zentra-pays.firebaseapp.com",
  projectId: "zentra-pays",
  storageBucket: "zentra-pays.firebasestorage.app",
  messagingSenderId: "143106553125",
  appId: "1:143106553125:web:4a0b40407ecd67fb9d96cc"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);


/* =====================================================
   2. GLOBAL VARIABLES
   ===================================================== */

let currentUser = null;
let currentUserData = {};
let balanceVisible = true;
let currentService = "";
let unsubscribeProfile = null;
let unsubscribeTransactions = null;


/* =====================================================
   3. HTML ELEMENTS
   ===================================================== */

const $ = (id) => document.getElementById(id);

const loadingScreen = $("loadingScreen");
const authScreen = $("authScreen");
const appScreen = $("appScreen");

const loginForm = $("loginForm");
const registerForm = $("registerForm");

const loginTab = $("loginTab");
const registerTab = $("registerTab");

const notification = $("notification");


/* =====================================================
   4. NOTIFICATION SYSTEM
   ===================================================== */

function showMessage(message, type = "success") {
  notification.textContent = message;
  notification.className = "notification show " + type;

  setTimeout(() => {
    notification.className = "notification";
  }, 3500);
}


/* =====================================================
   5. LOADING SCREEN
   ===================================================== */

function hideLoading() {
  if (loadingScreen) {
    loadingScreen.classList.add("hidden");
  }
}


/* =====================================================
   6. AUTHENTICATION TABS
   ===================================================== */

function showLogin() {
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");

  loginTab.classList.add("active");
  registerTab.classList.remove("active");

  $("authTitle").textContent = "Welcome Back";
  $("authSubtitle").textContent =
    "Sign in to continue to your account";
}

function showRegister() {
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");

  registerTab.classList.add("active");
  loginTab.classList.remove("active");

  $("authTitle").textContent = "Create Account";
  $("authSubtitle").textContent =
    "Join ZENTRA PAY today";
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);


/* =====================================================
   7. PASSWORD VISIBILITY
   ===================================================== */

document.querySelectorAll(".password-toggle").forEach(button => {
  button.addEventListener("click", () => {
    const input = $(button.dataset.toggle);

    if (!input) return;

    const hidden = input.type === "password";

    input.type = hidden ? "text" : "password";
    button.textContent = hidden ? "Hide" : "Show";
  });
});


/* =====================================================
   8. REGISTER USER
   ===================================================== */

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("registerName").value.trim();
  const phone = $("registerPhone").value.trim();
  const email = $("registerEmail").value.trim().toLowerCase();
  const password = $("registerPassword").value;
  const confirmPassword = $("confirmPassword").value;
  const terms = $("termsCheck").checked;

  if (!name || !phone || !email || !password) {
    showMessage("Please complete all required fields.", "error");
    return;
  }

  if (password.length < 8) {
    showMessage("Password must contain at least 8 characters.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Passwords do not match.", "error");
    return;
  }

  if (!terms) {
    showMessage("Please accept the terms and conditions.", "error");
    return;
  }

  const button = $("registerButton");
  button.disabled = true;
  button.textContent = "Creating account...";

  try {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = result.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      fullName: name,
      phone: phone,
      email: email,
      role: "user",
      accountStatus: "active",
      kycStatus: "pending",
      walletBalance: 0,
      currency: "NGN",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    showMessage("Account created successfully.");

    registerForm.reset();

  } catch (error) {
    console.error("Registration error:", error);

    const messages = {
      "auth/email-already-in-use": "This email already has an account.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Please use a stronger password.",
      "auth/network-request-failed": "Check your internet connection."
    };

    showMessage(
      messages[error.code] || error.message,
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent = "Create Account";
  }
});


/* =====================================================
   9. LOGIN USER
   ===================================================== */

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  const button = $("loginButton");

  button.disabled = true;
  button.textContent = "Signing in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);

    showMessage("Welcome back to ZENTRA PAY.");

    loginForm.reset();

  } catch (error) {
    console.error("Login error:", error);

    const messages = {
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/user-not-found": "Account not found.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-email": "Invalid email address.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
      "auth/network-request-failed": "Check your internet connection."
    };

    showMessage(
      messages[error.code] || error.message,
      "error"
    );

  } finally {
    button.disabled = false;
    button.textContent = "Sign In";
  }
});


/* =====================================================
   10. FORGOT PASSWORD
   ===================================================== */

$("forgotPassword").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim().toLowerCase();

  if (!email) {
    showMessage("Enter your email address first.", "error");
    $("loginEmail").focus();
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    showMessage("Password reset instructions have been sent.");

  } catch (error) {
    console.error(error);

    showMessage(
      "Unable to send password reset email. Check the address.",
      "error"
    );
  }
});


/* =====================================================
   11. AUTHENTICATION STATE
   ===================================================== */

onAuthStateChanged(auth, async (user) => {
  hideLoading();

  if (user) {
    currentUser = user;

    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    await loadUserProfile(user.uid);
    listenToTransactions(user.uid);

  } else {
    currentUser = null;
    currentUserData = {};

    if (unsubscribeProfile) {
      unsubscribeProfile();
      unsubscribeProfile = null;
    }

    if (unsubscribeTransactions) {
      unsubscribeTransactions();
      unsubscribeTransactions = null;
    }

    appScreen.classList.add("hidden");
    authScreen.classList.remove("hidden");

    showLogin();
  }
});


/* =====================================================
   12. LOAD USER PROFILE
   ===================================================== */

async function loadUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      showMessage("Your account profile was not found.", "error");
      return;
    }

    currentUserData = userSnap.data();

    renderProfile(currentUserData);

    if (unsubscribeProfile) unsubscribeProfile();

    unsubscribeProfile = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        currentUserData = snapshot.data();
        renderProfile(currentUserData);
      }
    }, (error) => {
      console.error("Profile listener error:", error);
    });

  } catch (error) {
    console.error("Profile loading error:", error);
    showMessage("Unable to load your profile.", "error");
  }
}


/* =====================================================
   13. RENDER PROFILE
   ===================================================== */

function renderProfile(data) {
  const name = data.fullName || "User";
  const email = data.email || currentUser?.email || "";
  const phone = data.phone || "";
  const balance = Number(data.walletBalance || 0);

  $("dashboardUserName").textContent = name;
  $("welcomeMessage").textContent = "Welcome, " + name;

  $("headerAvatar").textContent =
    name.charAt(0).toUpperCase();

  $("accountStatus").textContent =
    data.accountStatus || "Unknown";

  $("kycStatus").textContent =
    data.kycStatus || "Pending";

  $("profileKycStatus").textContent =
    data.kycStatus || "Pending";

  $("profileName").value = name;
  $("profilePhone").value = phone;
  $("profileEmail").value = email;
  $("profileAddress").value = data.address || "";

  const dot = document.querySelector(".status-dot");

  if (dot) {
    dot.classList.toggle(
      "online",
      data.accountStatus === "active"
    );
  }

  renderBalance(balance);
}


/* =====================================================
   14. WALLET BALANCE
   ===================================================== */

function formatMoney(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(amount);
}

function renderBalance(amount) {
  const formatted = formatMoney(amount);

  $("walletBalance").textContent =
    balanceVisible ? formatted : "••••••••";

  $("walletPageBalance").textContent = formatted;
}

$("toggleBalance").addEventListener("click", () => {
  balanceVisible = !balanceVisible;

  renderBalance(
    Number(currentUserData.walletBalance || 0)
  );
});


/* =====================================================
   15. PAGE NAVIGATION
   ===================================================== */

const pageNames = {
  dashboard: "Dashboard",
  services: "All Services",
  service: "Service",
  wallet: "My Wallet",
  transactions: "Transactions",
  profile: "My Profile",
  settings: "Settings",
  support: "Help & Support"
};

function navigateTo(page) {
  const pages = document.querySelectorAll(".page");

  pages.forEach(section => {
    section.classList.remove("active-page");
  });

  const selectedPage = $(page + "Page");

  if (!selectedPage) return;

  selectedPage.classList.add("active-page");

  $("pageTitle").textContent = pageNames[page] || "ZENTRA PAY";

  document.querySelectorAll(".nav-link, .bottom-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  $("sidebar").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});


/* =====================================================
   16. MOBILE SIDEBAR
   ===================================================== */

$("menuToggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});


/* =====================================================
   17. SERVICES CONFIGURATION
   ===================================================== */

const serviceConfig = {
  airtime: {
    title: "Buy Airtime",
    description: "Recharge any supported Nigerian mobile network.",
    fields: [
      {
        name: "network",
        label: "Select Network",
        type: "select",
        options: ["MTN", "Airtel", "Glo", "9mobile"]
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "tel",
        placeholder: "08012345678"
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount"
      }
    ]
  },

  data: {
    title: "Buy Data",
    description: "Choose your network and data bundle.",
    fields: [
      {
        name: "network",
        label: "Select Network",
        type: "select",
        options: ["MTN", "Airtel", "Glo", "9mobile"]
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "tel",
        placeholder: "08012345678"
      },
      {
        name: "plan",
        label: "Data Plan",
        type: "select",
        options: ["Select a plan"]
      }
    ]
  },

  electricity: {
    title: "Electricity Payment",
    description: "Pay electricity bills for supported providers.",
    fields: [
      {
        name: "disco",
        label: "Electricity Provider",
        type: "select",
        options: [
          "IKEDC",
          "EKEDC",
          "AEDC",
          "KEDCO",
          "JED",
          "IBEDC",
          "PHED",
          "EEDC",
          "BEDC"
        ]
      },
      {
        name: "meterType",
        label: "Meter Type",
        type: "select",
        options: ["Prepaid", "Postpaid"]
      },
      {
        name: "meterNumber",
        label: "Meter Number",
        type: "text",
        placeholder: "Enter meter number"
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount"
      }
    ]
  },

  cable: {
    title: "TV Subscription",
    description: "Manage your supported TV subscription.",
    fields: [
      {
        name: "provider",
        label: "TV Provider",
        type: "select",
        options: ["DStv", "GOtv", "StarTimes"]
      },
      {
        name: "smartcard",
        label: "Smartcard / IUC Number",
        type: "text",
        placeholder: "Enter decoder number"
      },
      {
        name: "plan",
        label: "Subscription Plan",
        type: "text",
        placeholder: "Enter or select plan"
      }
    ]
  },

  education: {
    title: "Education PINs",
    description: "Education examination PIN services.",
    fields: [
      {
        name: "exam",
        label: "Examination",
        type: "select",
        options: ["WAEC", "NECO", "JAMB"]
      },
      {
        name: "quantity",
        label: "Quantity",
        type: "number",
        placeholder: "Enter quantity"
      }
    ]
  },

  internet: {
    title: "Internet Subscription",
    description: "Internet subscription services.",
    fields: [
      {
        name: "provider",
        label: "Internet Provider",
        type: "text",
        placeholder: "Enter provider"
      },
      {
        name: "account",
        label: "Account / Customer Number",
        type: "text",
        placeholder: "Enter account number"
      },
      {
        name: "plan",
        label: "Subscription Plan",
        type: "text",
        placeholder: "Enter plan"
      }
    ]
  },

  sms: {
    title: "Bulk SMS",
    description: "Prepare a bulk messaging request.",
    fields: [
      {
        name: "sender",
        label: "Sender Name",
        type: "text",
        placeholder: "Your sender name"
      },
      {
        name: "recipients",
        label: "Recipient Numbers",
        type: "textarea",
        placeholder: "Enter numbers separated by commas"
      },
      {
        name: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Write your message"
      }
    ]
  },

  giftcard: {
    title: "Gift Cards",
    description: "Gift card services subject to provider availability.",
    fields: [
      {
        name: "card",
        label: "Gift Card Type",
        type: "text",
        placeholder: "Enter gift card type"
      },
      {
        name: "amount",
        label: "Card Value",
        type: "number",
        placeholder: "Enter value"
      }
    ]
  },

  voucher: {
    title: "Vouchers",
    description: "Voucher purchase requests.",
    fields: [
      {
        name: "voucher",
        label: "Voucher Type",
        type: "text",
        placeholder: "Enter voucher type"
      },
      {
        name: "quantity",
        label: "Quantity",
        type: "number",
        placeholder: "Enter quantity"
      }
    ]
  },

  schoolfees: {
    title: "School Fees",
    description: "School fee payment requests.",
    fields: [
      {
        name: "school",
        label: "School Name",
        type: "text",
        placeholder: "Enter school name"
      },
      {
        name: "student",
        label: "Student Reference",
        type: "text",
        placeholder: "Enter student reference"
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount"
      }
    ]
  }
};


/* =====================================================
   18. SERVICE FORM BUILDER
   ===================================================== */

function openService(serviceKey) {
  const config = serviceConfig[serviceKey];

  if (!config) {
    showMessage("This service is not available.", "error");
    return;
  }

  currentService = serviceKey;

  $("serviceTitle").textContent = config.title;
  $("serviceDescription").textContent = config.description;

  const fieldsContainer = $("serviceFields");
  fieldsContainer.innerHTML = "";

  config.fields.forEach(field => {
    const label = document.createElement("label");
    label.textContent = field.label;
    label.htmlFor = "service_" + field.name;

    let input;

    if (field.type === "select") {
      input = document.createElement("select");

      field.options.forEach(option => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        input.appendChild(item);
      });

    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 3;

    } else {
      input = document.createElement("input");
      input.type = field.type;
    }

    input.id = "service_" + field.name;
    input.name = field.name;
    input.placeholder = field.placeholder || "";
    input.required = true;

    if (field.type === "number") {
      input.min = "1";
    }

    fieldsContainer.appendChild(label);
    fieldsContainer.appendChild(input);
  });

  $("serviceSubmit").textContent = "Continue";

  navigateTo("service");
}

document.querySelectorAll("[data-service]").forEach(button => {
  button.addEventListener("click", () => {
    openService(button.dataset.service);
  });
});


/* =====================================================
   19. SERVICE SUBMISSION
   ===================================================== */

$("serviceForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showMessage("Please sign in first.", "error");
    return;
  }

  const config = serviceConfig[currentService];

  if (!config) return;

  const details = {};

  config.fields.forEach(field => {
    const element = $("service_" + field.name);
    details[field.name] = element.value.trim();
  });

  const amount = Number(details.amount || 0);

  if (amount < 0 || !Number.isFinite(amount)) {
    showMessage("Please enter a valid amount.", "error");
    return;
  }

  showModal(
    "Service Request Prepared",
    "Your " + config.title +
    " details have been collected. Live purchases will be enabled after the secure VTUGATE backend is connected. No payment has been made."
  );
});


/* =====================================================
   20. FUND WALLET
   ===================================================== */

$("fundWalletForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const amount = Number($("fundAmount").value);

  if (!Number.isFinite(amount) || amount < 100) {
    showMessage("Minimum funding amount is ₦100.", "error");
    return;
  }

  const method = document.querySelector(
    'input[name="paymentMethod"]:checked'
  )?.value;

  showModal(
    "Wallet Funding",
    "Funding request for " + formatMoney(amount) +
    " using " + (method || "selected payment method") +
    ". Secure payment processing will be enabled after OPay/payment backend configuration. Your wallet has not been credited."
  );
});


/* =====================================================
   21. TRANSACTION HISTORY
   ===================================================== */

function listenToTransactions(uid) {
  if (unsubscribeTransactions) {
    unsubscribeTransactions();
  }

  const transactionsRef = collection(
    db,
    "users",
    uid,
    "transactions"
  );

  const transactionQuery = query(
    transactionsRef,
    orderBy("createdAt", "desc"),
    limit(30)
  );

  unsubscribeTransactions = onSnapshot(
    transactionQuery,
    (snapshot) => {
      renderTransactions(snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
      })));
    },
    (error) => {
      console.error("Transaction listener:", error);
      $("transactionList").innerHTML =
        '<div class="empty-state"><strong>Unable to load transactions</strong><p>Please try again later.</p></div>';
    }
  );
}


function renderTransactions(items) {
  const container = $("transactionList");

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span>↔</span>
        <strong>No transactions found</strong>
        <p>Your payment records will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = "";

  items.forEach(item => {
    const row = document.createElement("div");
    row.style.cssText =
      "display:flex;justify-content:space-between;gap:12px;padding:17px;border-bottom:1px solid #eee;align-items:center;";

    const left = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = item.description || item.service || "Transaction";
    title.style.cssText = "display:block;font-size:12px;";

    const date = document.createElement("small");
    date.textContent = item.createdAt?.toDate
      ? item.createdAt.toDate().toLocaleString()
      : "Date unavailable";
    date.style.cssText = "display:block;color:#999;font-size:10px;margin-top:6px;";

    left.append(title, date);

    const right = document.createElement("div");
    right.style.textAlign = "right";

    const amount = document.createElement("strong");
    amount.textContent = formatMoney(Number(item.amount || 0));
    amount.style.cssText = "display:block;font-size:12px;";

    const status = document.createElement("small");
    status.textContent = item.status || "pending";
    status.style.cssText = "display:block;color:#888;font-size:10px;margin-top:6px;";

    right.append(amount, status);
    row.append(left, right);

    container.appendChild(row);
  });
}


/* =====================================================
   22. TRANSACTION SEARCH AND FILTER
   ===================================================== */

$("transactionSearch").addEventListener("input", () => {
  filterTransactions();
});

$("transactionFilter").addEventListener("change", () => {
  filterTransactions();
});

let cachedTransactions = [];

function filterTransactions() {
  const search = $("transactionSearch").value.toLowerCase();
  const filter = $("transactionFilter").value;

  const filtered = cachedTransactions.filter(item => {
    const title = (
      item.description || item.service || ""
    ).toLowerCase();

    const matchesSearch = title.includes(search);
    const matchesStatus =
      filter === "all" ||
      String(item.status || "").toLowerCase() === filter;

    return matchesSearch && matchesStatus;
  });

  renderTransactions(filtered);
}


/* =====================================================
   23. SAVE PROFILE
   ===================================================== */

$("profileForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const name = $("profileName").value.trim();
  const phone = $("profilePhone").value.trim();
  const address = $("profileAddress").value.trim();

  if (!name || !phone) {
    showMessage("Name and phone number are required.", "error");
    return;
  }

  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      fullName: name,
      phone: phone,
      address: address,
      updatedAt: serverTimestamp()
    });

    showMessage("Profile updated successfully.");

  } catch (error) {
    console.error("Profile update:", error);
    showMessage("Unable to update profile.", "error");
  }
});


/* =====================================================
   24. CHANGE PASSWORD
   ===================================================== */

$("changePasswordButton").addEventListener("click", async () => {
  if (!currentUser) return;

  const newPassword = prompt(
    "Enter your new password (at least 8 characters):"
  );

  if (!newPassword) return;

  if (newPassword.length < 8) {
    showMessage("Password must contain at least 8 characters.", "error");
    return;
  }

  try {
    await updatePassword(currentUser, newPassword);
    showMessage("Password updated successfully.");

  } catch (error) {
    console.error("Password update:", error);

    showMessage(
      "Please sign in again before changing your password.",
      "error"
    );
  }
});


/* =====================================================
   25. SUPPORT REQUEST
   ===================================================== */

$("supportForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const subject = $("supportSubject").value.trim();
  const message = $("supportMessage").value.trim();

  if (!subject || !message) {
    showMessage("Please complete the support form.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "supportTickets"), {
      uid: currentUser.uid,
      email: currentUser.email || "",
      subject,
      message,
      status: "open",
      createdAt: serverTimestamp()
    });

    $("supportForm").reset();

    showMessage("Your support request has been submitted.");

  } catch (error) {
    console.error("Support request:", error);
    showMessage("Unable to submit your request.", "error");
  }
});


/* =====================================================
   26. MODAL SYSTEM
   ===================================================== */

function showModal(title, message) {
  $("modalContent").innerHTML = "";

  const heading = document.createElement("h2");
  heading.textContent = title;
  heading.style.cssText = "font-size:19px;margin-bottom:12px;";

  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  paragraph.style.cssText =
    "font-size:12px;line-height:1.8;color:#777;";

  $("modalContent").append(heading, paragraph);

  $("appModal").classList.remove("hidden");
}

$("closeModal").addEventListener("click", () => {
  $("appModal").classList.add("hidden");
});

$("appModal").addEventListener("click", (event) => {
  if (event.target === $("appModal")) {
    $("appModal").classList.add("hidden");
  }
});


/* =====================================================
   27. LOGOUT
   ===================================================== */

$("logoutButton").addEventListener("click", async () => {
  const confirmed = confirm("Are you sure you want to sign out?");

  if (!confirmed) return;

  try {
    await signOut(auth);
    showMessage("You have signed out.");

  } catch (error) {
    console.error(error);
    showMessage("Unable to sign out.", "error");
  }
});


/* =====================================================
   28. NOTIFICATIONS BUTTON
   ===================================================== */

$("notificationButton").addEventListener("click", () => {
  showModal(
    "Notifications",
    "Your account notifications will appear here."
  );
});


/* =====================================================
   29. CURRENT YEAR
   ===================================================== */

$("currentYear").textContent = new Date().getFullYear();


/* =====================================================
   30. INITIAL PAGE
   ===================================================== */

navigateTo("dashboard");

setTimeout(() => {
  hideLoading();
}, 7000);
