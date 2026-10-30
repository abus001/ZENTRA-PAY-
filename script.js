
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyAnOkETG5voBPvRCaFO7ZklOOV4odMux64",
  authDomain: "zentra-pays.firebaseapp.com",
  projectId: "zentra-pays",
  storageBucket: "zentra-pays.firebasestorage.app",
  messagingSenderId: "143106553125",
  appId: "1:143106553125:web:4a0b40407ecd67fb9d96cc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Must match the region in functions/index.js
const functions = getFunctions(app, "africa-south1");

const createTransactionRequest = httpsCallable(
  functions,
  "createTransactionRequest"
);

const reviewTransaction = httpsCallable(
  functions,
  "reviewTransaction"
);

const getCustomerWallet = httpsCallable(
  functions,
  "getCustomerWallet"
);

// ==========================================
// 2. APPLICATION STATE
// ==========================================

let currentUser = null;
let currentProfile = null;
let cachedTransactions = [];
let unsubscribeTransactions = null;
let unsubscribeProfile = null;
let balanceVisible = true;
let activePage = "dashboard";
let selectedService = "";

const $ = (id) => document.getElementById(id);

const money = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN"
  }).format(Number(amount || 0));

const safeText = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);

// ==========================================
// 3. NOTIFICATIONS
// ==========================================

function notify(message, type = "info") {
  const box = $("notification");

  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.className = `notification show ${type}`;

  clearTimeout(notify.timer);

  notify.timer = setTimeout(() => {
    box.className = "notification";
  }, 3500);
}

// ==========================================
// 4. LOADING SCREEN
// ==========================================

function setLoading(show) {
  const screen = $("loadingScreen");

  if (screen) {
    screen.style.display = show ? "flex" : "none";
  }
}

// ==========================================
// 5. AUTHENTICATION
// ==========================================

function showAuthMode(mode) {
  const login = mode === "login";

  if ($("loginForm")) {
    $("loginForm").style.display = login ? "block" : "none";
  }

  if ($("registerForm")) {
    $("registerForm").style.display = login ? "none" : "block";
  }

  if ($("authTitle")) {
    $("authTitle").textContent = login
      ? "Welcome Back"
      : "Create Your Account";
  }

  if ($("authSubtitle")) {
    $("authSubtitle").textContent = login
      ? "Sign in to continue to ZENTRA PAY"
      : "Register and start using ZENTRA PAY";
  }
}

function showApplication(show) {
  if ($("authScreen")) {
    $("authScreen").style.display = show ? "none" : "flex";
  }

  if ($("appScreen")) {
    $("appScreen").style.display = show ? "block" : "none";
  }
}

if ($("loginTab")) {
  $("loginTab").addEventListener("click", () => {
    showAuthMode("login");
  });
}

if ($("registerTab")) {
  $("registerTab").addEventListener("click", () => {
    showAuthMode("register");
  });
}

if ($("loginForm")) {
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = $("loginEmail")?.value.trim();
    const password = $("loginPassword")?.value;

    if (!email || !password) {
      return notify("Enter your email and password.", "error");
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      notify("Login successful.", "success");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  });
}

if ($("registerForm")) {
  $("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = $("registerName")?.value.trim();
    const phone = $("registerPhone")?.value.trim();
    const email = $("registerEmail")?.value.trim();
    const password = $("registerPassword")?.value;
    const confirmPassword = $("confirmPassword")?.value;

    if (!fullName || !phone || !email || !password) {
      return notify("Complete all required fields.", "error");
    }

    if (password.length < 8) {
      return notify("Password must be at least 8 characters.", "error");
    }

    if (password !== confirmPassword) {
      return notify("Passwords do not match.", "error");
    }

    if ($("termsCheck") && !$("termsCheck").checked) {
      return notify("Please accept the terms.", "error");
    }

    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = result.user.uid;

      await setDoc(doc(db, "users", uid), {
        uid,
        fullName,
        phone,
        email,
        role: "user",
        accountStatus: "active",
        kycStatus: "pending",
        walletBalance: 0,
        currency: "NGN",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      notify("Account created successfully.", "success");
    } catch (error) {
      notify(error.message, "error");

      if (auth.currentUser) {
        await signOut(auth);
      }
    } finally {
      setLoading(false);
    }
  });
}

if ($("forgotPassword")) {
  $("forgotPassword").addEventListener("click", async () => {
    const email = $("loginEmail")?.value.trim();

    if (!email) {
      return notify("Enter your email address first.", "error");
    }

    try {
      await sendPasswordResetEmail(auth, email);
      notify("Password reset email sent.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  });
}

async function logout() {
  try {
    await signOut(auth);
    notify("You have signed out.", "success");
  } catch (error) {
    notify(error.message, "error");
  }
}

// ==========================================
// 6. USER PROFILE
// ==========================================

function listenToProfile(uid) {
  if (unsubscribeProfile) unsubscribeProfile();

  unsubscribeProfile = onSnapshot(
    doc(db, "users", uid),
    (snapshot) => {
      if (!snapshot.exists()) {
        notify("User profile not found.", "error");
        return;
      }

      currentProfile = snapshot.data();
      renderProfile();
    },
    (error) => notify(error.message, "error")
  );
}

function renderProfile() {
  if (!currentProfile) return;

  const name = currentProfile.fullName || "ZENTRA PAY User";
  const phone = currentProfile.phone || "";
  const email = currentProfile.email || "";

  if ($("dashboardUserName")) {
    $("dashboardUserName").textContent = name;
  }

  if ($("welcomeMessage")) {
    $("welcomeMessage").textContent = `Welcome, ${name}`;
  }

  if ($("profileName")) $("profileName").value = name;
  if ($("profilePhone")) $("profilePhone").value = phone;
  if ($("profileEmail")) $("profileEmail").value = email;

  if ($("headerAvatar")) {
    $("headerAvatar").textContent = name.charAt(0).toUpperCase();
  }

  if ($("accountStatus")) {
    $("accountStatus").textContent =
      currentProfile.accountStatus || "active";
  }

  if ($("kycStatus")) {
    $("kycStatus").textContent =
      currentProfile.kycStatus || "pending";
  }

  if ($("profileKycStatus")) {
    $("profileKycStatus").textContent =
      currentProfile.kycStatus || "pending";
  }

  renderBalance();
}

function renderBalance() {
  const balance = money(currentProfile?.walletBalance || 0);
  const displayed = balanceVisible ? balance : "••••••";

  if ($("walletBalance")) $("walletBalance").textContent = displayed;
  if ($("walletPageBalance")) {
    $("walletPageBalance").textContent = displayed;
  }
}

if ($("toggleBalance")) {
  $("toggleBalance").addEventListener("click", () => {
    balanceVisible = !balanceVisible;
    renderBalance();
  });
}

if ($("profileForm")) {
  $("profileForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const fullName = $("profileName")?.value.trim();
    const phone = $("profilePhone")?.value.trim();
    const address = $("profileAddress")?.value.trim();

    if (!fullName || !phone || !address) {
      return notify("Complete your profile details.", "error");
    }

    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        fullName,
        phone,
        address,
        updatedAt: serverTimestamp()
      });

      notify("Profile updated.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  });
}

// ==========================================
// 7. TRANSACTIONS
// ==========================================

function listenToTransactions(uid) {
  if (unsubscribeTransactions) unsubscribeTransactions();

  const transactionsQuery = query(
    collection(db, "users", uid, "transactions"),
    orderBy("createdAt", "desc")
  );

  unsubscribeTransactions = onSnapshot(
    transactionsQuery,
    (snapshot) => {
      cachedTransactions = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      renderTransactions(cachedTransactions);
    },
    (error) => notify(error.message, "error")
  );
}

function renderTransactions(items) {
  const container = $("transactionList");

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No transactions found.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item) => `
    <div class="transaction-item">
      <div class="transaction-info">
        <strong>${safeText(item.service)}</strong>
        <small>${safeText(item.reference)}</small>
      </div>
      <div class="transaction-details">
        <strong>${money(item.amount)}</strong>
        <small>${safeText(item.status)}</small>
      </div>
    </div>
  `).join("");
}

function filterTransactions() {
  const search = ($("transactionSearch")?.value || "").toLowerCase();
  const filter = $("transactionFilter")?.value || "all";

  const filtered = cachedTransactions.filter((item) => {
    const matchesSearch =
      String(item.service || "").toLowerCase().includes(search) ||
      String(item.reference || "").toLowerCase().includes(search);

    const matchesStatus =
      filter === "all" || item.status === filter;

    return matchesSearch && matchesStatus;
  });

  renderTransactions(filtered);
}

if ($("transactionSearch")) {
  $("transactionSearch").addEventListener("input", filterTransactions);
}

if ($("transactionFilter")) {
  $("transactionFilter").addEventListener("change", filterTransactions);
}

// ==========================================
// 8. SERVICES
// ==========================================

function openService(service) {
  selectedService = service;

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      service.charAt(0).toUpperCase() + service.slice(1);
  }

  showPage("service");
  buildServiceForm(service);
}

function buildServiceForm(service) {
  const container = $("serviceFormContainer");

  if (!container) {
    notify("Service form container is missing from index.html.", "error");
    return;
  }

  container.innerHTML = `
    <form id="newServiceForm" class="service-form">
      <label>Service</label>
      <input value="${safeText(service)}" disabled>

      <label>Customer reference / phone number</label>
      <input id="serviceReference"
        type="text"
        maxlength="100"
        required
        placeholder="Enter your reference">

      <label>Amount (NGN)</label>
      <input id="serviceAmount"
        type="number"
        min="1"
        max="1000000"
        step="0.01"
        required
        placeholder="Enter amount">

      <button type="submit">Submit Request</button>
    </form>
  `;

  $("newServiceForm").addEventListener("submit", submitServiceRequest);
}

async function submitServiceRequest(event) {
  event.preventDefault();

  if (!currentUser) {
    return notify("Please sign in first.", "error");
  }

  const reference = $("serviceReference")?.value.trim();
  const amount = Number($("serviceAmount")?.value);

  if (!reference || !Number.isFinite(amount) || amount <= 0) {
    return notify("Enter valid transaction details.", "error");
  }

  try {
    setLoading(true);

    const result = await createTransactionRequest({
      service: selectedService,
      reference,
      amount
    });

    notify(
      `Request created: ${result.data.transactionId}`,
      "success"
    );

    showPage("transactions");
  } catch (error) {
    notify(error.message, "error");
  } finally {
    setLoading(false);
  }
}

// ==========================================
// 9. WALLET FUNDING
// ==========================================

function renderWalletInformation() {
  const container = $("virtualAccounts");

  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <p>Wallet funding is not connected yet.</p>
      <p>Verified payment instructions will appear here after backend integration.</p>
    </div>
  `;
}

// ==========================================
// 10. ADMIN FUNCTIONS
// ==========================================

async function adminReview(customerUid, transactionId, decision) {
  try {
    setLoading(true);

    await reviewTransaction({
      customerUid,
      transactionId,
      decision
    });

    notify("Transaction review completed.", "success");
  } catch (error) {
    notify(error.message, "error");
  } finally {
    setLoading(false);
  }
}

async function adminGetWallet(customerUid) {
  try {
    const result = await getCustomerWallet({ customerUid });
    return result.data;
  } catch (error) {
    notify(error.message, "error");
    return null;
  }
}

// ==========================================
// 11. NAVIGATION
// ==========================================

function showPage(page) {
  activePage = page;

  const pages = [
    "dashboard",
    "services",
    "service",
    "wallet",
    "transactions",
    "profile",
    "settings",
    "support"
  ];

  pages.forEach((name) => {
    const element = $(`${name}Page`);
    if (element) {
      element.style.display = name === page ? "block" : "none";
    }
  });

  if ($("pageTitle")) {
    $("pageTitle").textContent =
      page.charAt(0).toUpperCase() + page.slice(1);
  }

  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  if (page === "wallet") renderWalletInformation();
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-service]").forEach((button) => {
  button.addEventListener("click", () => {
    openService(button.dataset.service);
  });
});

if ($("menuToggle")) {
  $("menuToggle").addEventListener("click", () => {
    $("sidebar")?.classList.toggle("open");
  });
}

// ==========================================
// 12. SUPPORT
// ==========================================

if ($("supportForm")) {
  $("supportForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!currentUser) return;

    const subject = $("supportSubject")?.value.trim();
    const message = $("supportMessage")?.value.trim();

    if (!subject || !message) {
      return notify("Complete all support fields.", "error");
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
      notify("Support request submitted.", "success");
    } catch (error) {
      notify(error.message, "error");
    }
  });
}

// ==========================================
// 13. MODAL
// ==========================================

if ($("closeModal")) {
  $("closeModal").addEventListener("click", () => {
    $("appModal")?.classList.remove("show");
  });
}

// ==========================================
// 14. AUTH STATE
// ==========================================

onAuthStateChanged(auth, async (user) => {
  setLoading(true);

  currentUser = user;
  currentProfile = null;
  cachedTransactions = [];

  if (!user) {
    if (unsubscribeProfile) unsubscribeProfile();
    if (unsubscribeTransactions) unsubscribeTransactions();

    unsubscribeProfile = null;
    unsubscribeTransactions = null;

    showApplication(false);
    setLoading(false);
    return;
  }

  showApplication(true);

  listenToProfile(user.uid);
  listenToTransactions(user.uid);

  if ($("currentYear")) {
    $("currentYear").textContent = new Date().getFullYear();
  }

  showPage("dashboard");
  setLoading(false);
});

// ==========================================
// 15. GLOBAL BUTTON SUPPORT
// ==========================================

window.zentraPay = {
  logout,
  showPage,
  openService,
  adminReview,
  adminGetWallet
};

console.log("ZENTRA PAY initialized successfully.");
