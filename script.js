/* ==========================================
   ZENTRA PAY
   Zebra Digital Payment Application
   JavaScript - Demo Version
   ========================================== */

"use strict";

// ==========================================
// CONFIGURATION
// ==========================================

const APP_NAME = "ZENTRA PAY";

const DEFAULT_BALANCE = 0;

let walletBalance = DEFAULT_BALANCE;
let balanceVisible = true;
let currentPage = "home";
let currentService = "";
let transactions = [];

const $ = (id) => document.getElementById(id);

// ==========================================
// SERVICE CONFIGURATION
// ==========================================

const serviceConfig = {
  airtime: {
    title: "Buy Airtime",
    description: "Recharge your mobile phone",
    icon: "fa-mobile-screen-button",
    fields: [
      {
        name: "network",
        label: "Select Network",
        type: "select",
        required: true,
        options: [
          ["", "Choose Network"],
          ["MTN", "MTN"],
          ["Airtel", "Airtel"],
          ["Glo", "Glo"],
          ["9mobile", "9mobile"]
        ]
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "tel",
        placeholder: "08012345678",
        required: true
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 50,
        required: true
      }
    ]
  },

  data: {
    title: "Buy Data",
    description: "Purchase a mobile data bundle",
    icon: "fa-wifi",
    fields: [
      {
        name: "network",
        label: "Select Network",
        type: "select",
        required: true,
        options: [
          ["", "Choose Network"],
          ["MTN", "MTN"],
          ["Airtel", "Airtel"],
          ["Glo", "Glo"],
          ["9mobile", "9mobile"]
        ]
      },
      {
        name: "phone",
        label: "Phone Number",
        type: "tel",
        placeholder: "08012345678",
        required: true
      },
      {
        name: "plan",
        label: "Data Plan",
        type: "select",
        required: true,
        options: [
          ["", "Select Data Plan"],
          ["100MB", "100MB"],
          ["500MB", "500MB"],
          ["1GB", "1GB"],
          ["2GB", "2GB"],
          ["5GB", "5GB"],
          ["10GB", "10GB"]
        ]
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter price",
        min: 1,
        required: true
      }
    ]
  },

  electricity: {
    title: "Electricity Bills",
    description: "Pay your electricity bill",
    icon: "fa-bolt",
    fields: [
      {
        name: "disco",
        label: "Electricity Provider",
        type: "select",
        required: true,
        options: [
          ["", "Select Provider"],
          ["AEDC", "AEDC"],
          ["IKEDC", "IKEDC"],
          ["EKEDC", "EKEDC"],
          ["KEDCO", "KEDCO"],
          ["IBEDC", "IBEDC"],
          ["PHED", "PHED"],
          ["BEDC", "BEDC"],
          ["KAEDCO", "KAEDCO"],
          ["JED", "JED"],
          ["EEDC", "EEDC"]
        ]
      },
      {
        name: "meterType",
        label: "Meter Type",
        type: "select",
        required: true,
        options: [
          ["", "Select Meter Type"],
          ["Prepaid", "Prepaid"],
          ["Postpaid", "Postpaid"]
        ]
      },
      {
        name: "meter",
        label: "Meter Number",
        type: "text",
        placeholder: "Enter meter number",
        required: true
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  },

  tv: {
    title: "Pay TV",
    description: "Renew your TV subscription",
    icon: "fa-tv",
    fields: [
      {
        name: "provider",
        label: "TV Provider",
        type: "select",
        required: true,
        options: [
          ["", "Select Provider"],
          ["DStv", "DStv"],
          ["GOtv", "GOtv"],
          ["StarTimes", "StarTimes"]
        ]
      },
      {
        name: "smartcard",
        label: "Smartcard / IUC Number",
        type: "text",
        placeholder: "Enter decoder number",
        required: true
      },
      {
        name: "plan",
        label: "Subscription Plan",
        type: "text",
        placeholder: "Enter plan name",
        required: true
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  },

  waec: {
    title: "WAEC PIN",
    description: "Purchase a WAEC examination PIN",
    icon: "fa-graduation-cap",
    fields: [
      {
        name: "quantity",
        label: "Quantity",
        type: "number",
        placeholder: "Number of PINs",
        min: 1,
        required: true
      },
      {
        name: "amount",
        label: "Total Amount (₦)",
        type: "number",
        placeholder: "Enter total price",
        min: 1,
        required: true
      }
    ]
  },

  neco: {
    title: "NECO PIN",
    description: "Purchase a NECO examination PIN",
    icon: "fa-book-open",
    fields: [
      {
        name: "quantity",
        label: "Quantity",
        type: "number",
        placeholder: "Number of PINs",
        min: 1,
        required: true
      },
      {
        name: "amount",
        label: "Total Amount (₦)",
        type: "number",
        placeholder: "Enter total price",
        min: 1,
        required: true
      }
    ]
  },

  jamb: {
    title: "JAMB PIN",
    description: "Purchase a JAMB registration PIN",
    icon: "fa-school",
    fields: [
      {
        name: "quantity",
        label: "Quantity",
        type: "number",
        placeholder: "Number of PINs",
        min: 1,
        required: true
      },
      {
        name: "amount",
        label: "Total Amount (₦)",
        type: "number",
        placeholder: "Enter total price",
        min: 1,
        required: true
      }
    ]
  },

  internet: {
    title: "Internet Subscription",
    description: "Pay for an internet service",
    icon: "fa-globe",
    fields: [
      {
        name: "provider",
        label: "Internet Provider",
        type: "select",
        required: true,
        options: [
          ["", "Select Provider"],
          ["Spectranet", "Spectranet"],
          ["Smile", "Smile"],
          ["Fiber Internet", "Fiber Internet"],
          ["Other", "Other"]
        ]
      },
      {
        name: "account",
        label: "Account Number",
        type: "text",
        placeholder: "Enter account number",
        required: true
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  },

  sms: {
    title: "Bulk SMS",
    description: "Prepare an SMS campaign",
    icon: "fa-comment-sms",
    fields: [
      {
        name: "phone",
        label: "Recipient Phone Number(s)",
        type: "text",
        placeholder: "08012345678",
        required: true
      },
      {
        name: "message",
        label: "Message",
        type: "textarea",
        placeholder: "Type your message",
        required: true
      },
      {
        name: "amount",
        label: "Estimated Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  },

  giftcards: {
    title: "Gift Cards",
    description: "Purchase digital gift cards",
    icon: "fa-gift",
    fields: [
      {
        name: "provider",
        label: "Gift Card",
        type: "select",
        required: true,
        options: [
          ["", "Select Gift Card"],
          ["Apple", "Apple"],
          ["Google Play", "Google Play"],
          ["Steam", "Steam"],
          ["Other", "Other"]
        ]
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  },

  vouchers: {
    title: "Digital Vouchers",
    description: "Purchase a digital voucher",
    icon: "fa-ticket",
    fields: [
      {
        name: "voucher",
        label: "Voucher Type",
        type: "text",
        placeholder: "Enter voucher type",
        required: true
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  },

  schoolfees: {
    title: "School Fees",
    description: "Prepare a school fee payment",
    icon: "fa-building-columns",
    fields: [
      {
        name: "school",
        label: "School Name",
        type: "text",
        placeholder: "Enter school name",
        required: true
      },
      {
        name: "student",
        label: "Student Registration Number",
        type: "text",
        placeholder: "Enter registration number",
        required: true
      },
      {
        name: "amount",
        label: "Amount (₦)",
        type: "number",
        placeholder: "Enter amount",
        min: 1,
        required: true
      }
    ]
  }
};

// ==========================================
// SAFE STORAGE
// ==========================================

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn("Local storage is unavailable.");
  }
}

function loadDemoData() {
  const savedBalance = readStorage("zentra_demo_balance", null);
  const savedTransactions = readStorage("zentra_demo_transactions", []);

  if (
    typeof savedBalance === "number" &&
    Number.isFinite(savedBalance) &&
    savedBalance >= 0
  ) {
    walletBalance = savedBalance;
  }

  transactions = Array.isArray(savedTransactions)
    ? savedTransactions.slice(0, 100)
    : [];
}

function saveDemoData() {
  saveStorage("zentra_demo_balance", walletBalance);
  saveStorage("zentra_demo_transactions", transactions);
}

// ==========================================
// CURRENCY FORMATTING
// ==========================================

function formatMoney(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// ==========================================
// NAVIGATION
// ==========================================

function navigate(page) {
  const pageMap = {
    home: "homePage",
    service: "servicePage",
    fund: "fundPage",
    history: "historyPage",
    notifications: "notificationsPage",
    profile: "profilePage"
  };

  const targetId = pageMap[page];

  if (!targetId || !$(targetId)) {
    return;
  }

  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  $(targetId).classList.add("active");

  currentPage = page;

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.remove("active");
  });

  const navIndex = {
    home: 0,
    history: 1,
    fund: 2,
    notifications: 3,
    profile: 4
  };

  if (Object.prototype.hasOwnProperty.call(navIndex, page)) {
    const navButtons = document.querySelectorAll(".nav-item");
    navButtons[navIndex[page]].classList.add("active");
  }

  if (page === "history") {
    renderTransactions();
  }

  if (page === "home") {
    renderRecentTransactions();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// ==========================================
// WALLET BALANCE
// ==========================================

function updateBalance() {
  const balanceElement = $("walletBalance");

  if (!balanceElement) {
    return;
  }

  balanceElement.textContent = balanceVisible
    ? formatMoney(walletBalance)
    : "₦••••••";

  const toggleButton = $("balanceToggle");

  if (toggleButton) {
    toggleButton.innerHTML = balanceVisible
      ? '<i class="fa-regular fa-eye"></i>'
      : '<i class="fa-regular fa-eye-slash"></i>';

    toggleButton.setAttribute(
      "aria-label",
      balanceVisible ? "Hide balance" : "Show balance"
    );
  }
}

function toggleBalance() {
  balanceVisible = !balanceVisible;
  updateBalance();
}

// ==========================================
// OPEN SERVICE
// ==========================================

function openService(serviceName) {
  const config = serviceConfig[serviceName];

  if (!config) {
    showModal(
      "Service unavailable",
      "This service is not configured yet.",
      "fa-circle-exclamation"
    );
    return;
  }

  currentService = serviceName;

  $("serviceTitle").textContent = config.title;
  $("serviceDescription").textContent = config.description;

  $("serviceFormIcon").innerHTML =
    `<i class="fa-solid ${config.icon}"></i>`;

  $("dynamicFields").innerHTML = "";

  config.fields.forEach((field) => {
    const label = document.createElement("label");
    label.htmlFor = `field_${field.name}`;
    label.textContent = field.label;

    let input;

    if (field.type === "select") {
      input = document.createElement("select");

      field.options.forEach(([value, text]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        input.appendChild(option);
      });
    } else if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
      input.style.resize = "vertical";
    } else {
      input = document.createElement("input");
      input.type = field.type;

      if (field.placeholder) {
        input.placeholder = field.placeholder;
      }

      if (field.min !== undefined) {
        input.min = String(field.min);
      }

      if (field.type === "number") {
        input.step = "any";
      }
    }

    input.id = `field_${field.name}`;
    input.name = field.name;
    input.required = Boolean(field.required);

    $("dynamicFields").appendChild(label);
    $("dynamicFields").appendChild(input);
  });

  $("serviceAmount").textContent = formatMoney(0);

  navigate("service");
}

// ==========================================
// READ FORM DATA
// ==========================================

function getFormValues(form) {
  const values = {};

  new FormData(form).forEach((value, key) => {
    values[key] = String(value).trim();
  });

  return values;
}

function validPhone(phone) {
  return /^(?:\+?234|0)[789]\d{9}$/.test(phone.replace(/\s+/g, ""));
}

// ==========================================
// SERVICE FORM SUBMISSION
// ==========================================

function handleServiceSubmit(event) {
  event.preventDefault();

  const config = serviceConfig[currentService];

  if (!config) {
    showModal("Error", "Please select a service again.");
    return;
  }

  const form = event.currentTarget;

  if (!form.reportValidity()) {
    return;
  }

  const values = getFormValues(form);

  if (values.phone && !validPhone(values.phone)) {
    showModal(
      "Invalid phone number",
      "Please enter a valid Nigerian phone number.",
      "fa-phone"
    );
    return;
  }

  const amount = Number(values.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    showModal(
      "Invalid amount",
      "Please enter a valid amount greater than zero.",
      "fa-circle-exclamation"
    );
    return;
  }

  if (amount > walletBalance) {
    showModal(
      "Insufficient balance",
      `Your demo wallet balance is ${formatMoney(walletBalance)}.\n\nThis demo cannot process a real payment.`,
      "fa-wallet"
    );
    return;
  }

  showModal(
    "Demo mode",
    `${config.title}\n\nAmount: ${formatMoney(amount)}\n\nNo money has been deducted. Real transactions require a verified service API and secure backend.`,
    "fa-shield-halved"
  );
}

// ==========================================
// FUND WALLET
// ==========================================

function handleFundSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;

  if (!form.reportValidity()) {
    return;
  }

  const amount = Number($("fundAmount").value);
  const method = $("fundMethod").value;

  if (!Number.isFinite(amount) || amount < 100) {
    showModal(
      "Invalid amount",
      "Please enter at least ₦100.",
      "fa-circle-exclamation"
    );
    return;
  }

  if (!method) {
    showModal(
      "Select payment method",
      "Please select a payment method.",
      "fa-credit-card"
    );
    return;
  }

  showModal(
    "Payment setup required",
    `Amount: ${formatMoney(amount)}\nMethod: ${method}\n\nThis is a demo interface. No payment has been initiated and no money has been received.\n\nTo enable real funding, the merchant payment service must be integrated through a secure backend.`,
    "fa-lock"
  );
}

// ==========================================
// TRANSACTION HISTORY
// ==========================================

function createTransactionElement(transaction) {
  const item = document.createElement("div");
  item.className = "transaction-item";

  const icon = document.createElement("div");
  icon.className = "transaction-icon";

  const iconElement = document.createElement("i");
  iconElement.className = "fa-solid fa-receipt";
  icon.appendChild(iconElement);

  const info = document.createElement("div");
  info.className = "transaction-info";

  const title = document.createElement("strong");
  title.textContent = transaction.title || "Transaction";

  const date = document.createElement("small");
  date.textContent = transaction.date || "";

  info.appendChild(title);
  info.appendChild(date);

  const right = document.createElement("div");

  const amount = document.createElement("div");
  amount.className = "transaction-amount";
  amount.textContent = formatMoney(Number(transaction.amount) || 0);

  const status = document.createElement("small");
  status.className = "transaction-status";
  status.textContent = transaction.status || "Demo";

  right.appendChild(amount);
  right.appendChild(status);

  item.appendChild(icon);
  item.appendChild(info);
  item.appendChild(right);

  return item;
}

function renderTransactionList(containerId, list) {
  const container = $(containerId);

  if (!container) {
    return;
  }

  container.replaceChildren();

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const icon = document.createElement("i");
    icon.className = "fa-solid fa-receipt";

    const message = document.createElement("p");
    message.textContent = "No transactions found";

    const detail = document.createElement("small");
    detail.textContent = "Your transaction records will appear here.";

    empty.appendChild(icon);
    empty.appendChild(message);
    empty.appendChild(detail);

    container.appendChild(empty);
    return;
  }

  list.forEach((transaction) => {
    container.appendChild(createTransactionElement(transaction));
  });
}

function renderTransactions() {
  renderTransactionList("allTransactions", transactions);
}

function renderRecentTransactions() {
  renderTransactionList(
    "recentTransactions",
    transactions.slice(0, 4)
  );
}

// ==========================================
// MODAL
// ==========================================

function showModal(
  title,
  message,
  icon = "fa-circle-info"
) {
  $("modalTitle").textContent = title;
  $("modalMessage").textContent = message;

  $("modalIcon").innerHTML =
    `<i class="fa-solid ${icon}"></i>`;

  $("appModal").classList.add("show");
  $("appModal").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("appModal").classList.remove("show");
  $("appModal").setAttribute("aria-hidden", "true");
}

// ==========================================
// NOTIFICATIONS
// ==========================================

function showNotifications() {
  navigate("notifications");
}

// ==========================================
// PROFILE
// ==========================================

function editProfile() {
  const currentName = $("userName").textContent;

  const newName = window.prompt(
    "Enter your display name:",
    currentName === "ZENTRA USER" ? "" : currentName
  );

  if (newName === null) {
    return;
  }

  const cleanName = newName.trim();

  if (!cleanName) {
    showModal(
      "Name required",
      "Please enter a valid display name."
    );
    return;
  }

  if (cleanName.length > 50) {
    showModal(
      "Name too long",
      "Please use no more than 50 characters."
    );
    return;
  }

  $("userName").textContent = cleanName.toUpperCase();
  $("profileName").textContent = cleanName.toUpperCase();

  saveStorage("zentra_demo_name", cleanName);

  showModal(
    "Profile updated",
    "Your display name has been updated on this device.",
    "fa-user-check"
  );
}

function showSupport() {
  showModal(
    "Customer Support",
    "Welcome to ZENTRA PAY Support.\n\nCustomer support contact details have not been configured yet.",
    "fa-headset"
  );
}

function showAbout() {
  showModal(
    "About ZENTRA PAY",
    "ZENTRA PAY\n\nYour digital payment platform concept.\n\nVersion 1.0 — Demo\n\nBlack. White. Zebra.",
    "fa-circle-info"
  );
}

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

function initializeApp() {
  loadDemoData();

  const savedName = readStorage("zentra_demo_name", "");

  if (typeof savedName === "string" && savedName.trim()) {
    $("userName").textContent = savedName.toUpperCase();
    $("profileName").textContent = savedName.toUpperCase();
  }

  updateBalance();
  renderRecentTransactions();
  renderTransactions();

  // Service form
  $("serviceForm").addEventListener(
    "submit",
    handleServiceSubmit
  );

  // Wallet funding form
  $("fundForm").addEventListener(
    "submit",
    handleFundSubmit
  );

  // Update displayed amount when a service amount changes.
  $("dynamicFields").addEventListener("input", (event) => {
    if (event.target.name === "amount") {
      const amount = Number(event.target.value);

      $("serviceAmount").textContent =
        Number.isFinite(amount) && amount >= 0
          ? formatMoney(amount)
          : formatMoney(0);
    }
  });

  // Close modal when tapping outside its content.
  $("appModal").addEventListener("click", (event) => {
    if (event.target === $("appModal")) {
      closeModal();
    }
  });

  // Escape key closes modal.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  // Hide splash screen.
  window.setTimeout(() => {
    $("splashScreen").classList.add("hide");
  }, 1000);

  console.log(`${APP_NAME} demo initialized successfully.`);
}

document.addEventListener("DOMContentLoaded", initializeApp);
