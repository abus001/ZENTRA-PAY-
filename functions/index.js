
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();

// Import OPay functions
const opay = require("./opay");

// =====================================
// ADMIN SECURITY
// =====================================

function requireAdmin(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Please sign in first."
    );
  }

  const token = request.auth.token || {};
  const role = token.role;

  if (!["admin", "superAdmin"].includes(role)) {
    throw new HttpsError(
      "permission-denied",
      "Administrator access required."
    );
  }

  return request.auth.uid;
}

// =====================================
// SERVICE VALIDATION
// =====================================

const ALLOWED_SERVICES = [
  "airtime",
  "data",
  "electricity",
  "cable",
  "education",
  "internet",
  "sms",
  "giftcard",
  "voucher",
  "schoolfees"
];

// =====================================
// CREATE SERVICE TRANSACTION REQUEST
// =====================================

exports.createTransactionRequest = onCall(
  {
    region: "africa-south1"
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please sign in."
      );
    }

    const uid = request.auth.uid;
    const data = request.data || {};

    const service = String(data.service || "").toLowerCase();
    const amount = Number(data.amount);
    const customerReference = String(
      data.customerReference || ""
    ).trim();

    if (!ALLOWED_SERVICES.includes(service)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid service selected."
      );
    }

    if (
      !Number.isSafeInteger(amount) ||
      amount < 50 ||
      amount > 100000
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid transaction amount."
      );
    }

    if (customerReference.length > 100) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid customer reference."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "User account not found."
      );
    }

    if (userSnap.data().status !== "active") {
      throw new HttpsError(
        "permission-denied",
        "Your account is not active."
      );
    }

    const transactionRef = userRef
      .collection("transactions")
      .doc();

    await transactionRef.set({
      uid,
      service,
      amount,
      customerReference,
      status: "PENDING",
      paymentStatus: "UNPAID",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });

    return {
      success: true,
      transactionId: transactionRef.id,
      status: "PENDING",
      message: "Service request created successfully."
    };
  }
);

// =====================================
// ADMIN REVIEW SERVICE REQUEST
// =====================================

exports.reviewTransaction = onCall(
  {
    region: "africa-south1"
  },
  async (request) => {
    const adminUid = requireAdmin(request);

    const uid = String(request.data?.uid || "");
    const transactionId = String(
      request.data?.transactionId || ""
    );
    const decision = String(
      request.data?.decision || ""
    ).toLowerCase();

    if (
      !uid ||
      !transactionId ||
      !["approve", "reject"].includes(decision)
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid review information."
      );
    }

    const transactionRef = db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .doc(transactionId);

    const result = await db.runTransaction(
      async (transaction) => {
        const snapshot = await transaction.get(transactionRef);

        if (!snapshot.exists) {
          throw new HttpsError(
            "not-found",
            "Transaction not found."
          );
        }

        const current = snapshot.data();

        if (current.status !== "PENDING") {
          throw new HttpsError(
            "failed-precondition",
            "This transaction has already been reviewed."
          );
        }

        const newStatus =
          decision === "approve" ? "APPROVED" : "REJECTED";

        transaction.update(transactionRef, {
          status: newStatus,
          reviewedBy: adminUid,
          reviewedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

        return newStatus;
      }
    );

    return {
      success: true,
      status: result
    };
  }
);

// =====================================
// ADMIN: GET CUSTOMER WALLET
// =====================================

exports.getCustomerWallet = onCall(
  {
    region: "africa-south1"
  },
  async (request) => {
    requireAdmin(request);

    const uid = String(request.data?.uid || "");

    if (!uid) {
      throw new HttpsError(
        "invalid-argument",
        "Customer UID is required."
      );
    }

    const userSnap = await db
      .collection("users")
      .doc(uid)
      .get();

    if (!userSnap.exists) {
      throw new HttpsError(
        "not-found",
        "Customer not found."
      );
    }

    const user = userSnap.data();

    return {
      success: true,
      uid,
      fullName: user.fullName || "",
      walletBalance: Number(user.walletBalance || 0),
      accountStatus: user.status || "unknown",
      kycStatus: user.kycStatus || "pending"
    };
  }
);

// =====================================
// OPAY WALLET FUNDING FUNCTIONS
// =====================================

exports.createWalletFundingOrder =
  opay.createWalletFundingOrder;

exports.verifyWalletFunding =
  opay.verifyWalletFunding;
