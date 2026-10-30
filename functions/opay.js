
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const {
  getFirestore,
  FieldValue
} = require("firebase-admin/firestore");
const crypto = require("crypto");



const db = getFirestore();

const OPAY_PRIVATE_KEY = defineSecret("OPAY_PRIVATE_KEY");
const OPAY_MERCHANT_ID = defineSecret("OPAY_MERCHANT_ID");

const OPAY_CREATE_URL =
  "https://testapi.opaycheckout.com/api/v1/international/payment/create";

const OPAY_STATUS_URL =
  "https://testapi.opaycheckout.com/api/v1/international/cashier/status";

function makeSignature(body, privateKey) {
  return crypto
    .createHmac("sha512", privateKey)
    .update(body, "utf8")
    .digest("hex");
}

async function opayRequest(url, payload, privateKey, merchantId) {
  const body = JSON.stringify(payload);
  const signature = makeSignature(body, privateKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${signature}`,
      "MerchantId": merchantId
    },
    body
  });

  if (!response.ok) {
    throw new HttpsError(
      "unavailable",
      "OPay service is temporarily unavailable."
    );
  }

  return await response.json();
}

// CREATE WALLET FUNDING ORDER
exports.createWalletFundingOrder = onCall(
  {
    region: "africa-south1",
    secrets: [OPAY_PRIVATE_KEY, OPAY_MERCHANT_ID]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Please sign in.");
    }

    const uid = request.auth.uid;
    const amountNaira = Number(request.data?.amount);

    if (
      !Number.isSafeInteger(amountNaira) ||
      amountNaira < 100 ||
      amountNaira > 100000
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Enter an amount between ₦100 and ₦100,000."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();

    if (!userSnap.exists || userSnap.data().status !== "active") {
      throw new HttpsError(
        "permission-denied",
        "Your account is not active."
      );
    }

    const user = userSnap.data();
    const fundingRef = db.collection("walletFunding").doc();

    // OPay documents amount in the currency's smallest unit.
    // Confirm NGN unit handling with OPay before production.
    const amountMinor = amountNaira * 100;

    const reference = `ZP${Date.now()}${crypto.randomBytes(4).toString("hex")}`;

    await fundingRef.set({
      uid,
      reference,
      amountNaira,
      amountMinor,
      currency: "NGN",
      provider: "OPAY",
      status: "CREATING",
      createdAt: FieldValue.serverTimestamp()
    });

    const payload = {
      amount: {
        currency: "NGN",
        total: amountMinor
      },
      country: "NG",
      customerName: user.fullName || "ZENTRA PAY Customer",
      payMethod: "BankTransfer",
      product: {
        description: "ZENTRA PAY wallet funding",
        name: "Wallet Funding"
      },
      reference,
      userInfo: {
        userEmail: user.email || "",
        userId: uid,
        userMobile: user.phone || "",
        userName: user.fullName || "Customer"
      },
      userPhone: user.phone || ""
    };

    try {
      const result = await opayRequest(
        OPAY_CREATE_URL,
        payload,
        OPAY_PRIVATE_KEY.value(),
        OPAY_MERCHANT_ID.value()
      );

      if (result.code !== "00000" || !result.data) {
        await fundingRef.update({
          status: "CREATE_FAILED",
          providerMessage: result.message || "OPay rejected request."
        });

        throw new HttpsError(
          "failed-precondition",
          "OPay could not create this payment."
        );
      }

      const nextAction = result.data.nextAction || {};

      await fundingRef.update({
        status: result.data.status || "PENDING",
        opayOrderNo: result.data.orderNo || null,
        transferAccountNumber:
          nextAction.transferAccountNumber || null,
        transferBankName: nextAction.transferBankName || null,
        expiredTimestamp: nextAction.expiredTimestamp || null
      });

      return {
        success: true,
        fundingId: fundingRef.id,
        reference,
        amountNaira,
        status: result.data.status,
        transferAccountNumber:
          nextAction.transferAccountNumber || null,
        transferBankName: nextAction.transferBankName || null,
        expiredTimestamp: nextAction.expiredTimestamp || null
      };

    } catch (error) {
      if (error instanceof HttpsError) throw error;

      await fundingRef.update({
        status: "CREATE_FAILED"
      });

      throw new HttpsError(
        "unavailable",
        "Unable to contact OPay. Please try again."
      );
    }
  }
);

// VERIFY PAYMENT AND CREDIT WALLET ONCE
exports.verifyWalletFunding = onCall(
  {
    region: "africa-south1",
    secrets: [OPAY_PRIVATE_KEY, OPAY_MERCHANT_ID]
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Please sign in.");
    }

    const uid = request.auth.uid;
    const fundingId = String(request.data?.fundingId || "");

    if (!/^[A-Za-z0-9]{10,40}$/.test(fundingId)) {
      throw new HttpsError(
        "invalid-argument",
        "Invalid funding reference."
      );
    }

    const fundingRef = db.collection("walletFunding").doc(fundingId);
    const fundingSnap = await fundingRef.get();

    if (!fundingSnap.exists) {
      throw new HttpsError("not-found", "Payment record not found.");
    }

    const funding = fundingSnap.data();

    if (funding.uid !== uid) {
      throw new HttpsError("permission-denied", "Access denied.");
    }

    if (funding.status === "SUCCESS") {
      return { success: true, alreadyCredited: true };
    }

    if (
      !["PENDING", "INITIAL", "CREATING"].includes(funding.status)
    ) {
      throw new HttpsError(
        "failed-precondition",
        "This payment is not awaiting verification."
      );
    }

    const result = await opayRequest(
      OPAY_STATUS_URL,
      {
        country: "NG",
        reference: funding.reference
      },
      OPAY_PRIVATE_KEY.value(),
      OPAY_MERCHANT_ID.value()
    );

    if (result.code !== "00000" || !result.data) {
      throw new HttpsError(
        "unavailable",
        "Could not verify payment with OPay."
      );
    }

    const payment = result.data;

    if (payment.status !== "SUCCESS") {
      await fundingRef.update({
        status: payment.status || "PENDING",
        lastCheckedAt: FieldValue.serverTimestamp()
      });

      return {
        success: false,
        status: payment.status || "UNKNOWN",
        message: "Payment has not been confirmed."
      };
    }

    if (
      payment.reference !== funding.reference ||
      payment.amount?.currency !== "NGN" ||
      Number(payment.amount?.total) !== funding.amountMinor
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Payment details do not match."
      );
    }

    const userRef = db.collection("users").doc(uid);
    const creditRef = db.collection("opayCredits").doc(funding.reference);
    const transactionRef = userRef.collection("transactions").doc(
      funding.reference
    );

    await db.runTransaction(async (transaction) => {
      const freshFunding = await transaction.get(fundingRef);
      const freshUser = await transaction.get(userRef);
      const existingCredit = await transaction.get(creditRef);

      if (!freshFunding.exists || !freshUser.exists) {
        throw new HttpsError("not-found", "Account not found.");
      }

      if (existingCredit.exists) {
        transaction.update(fundingRef, {
          status: "SUCCESS"
        });
        return;
      }

      if (freshFunding.data().status === "SUCCESS") {
        return;
      }

      const currentBalance = Number(
        freshUser.data().walletBalance || 0
      );

      transaction.update(userRef, {
        walletBalance: currentBalance + funding.amountNaira,
        updatedAt: FieldValue.serverTimestamp()
      });

      transaction.set(creditRef, {
        uid,
        reference: funding.reference,
        amount: funding.amountNaira,
        currency: "NGN",
        provider: "OPAY",
        createdAt: FieldValue.serverTimestamp()
      });

      transaction.set(transactionRef, {
        type: "wallet_funding",
        provider: "OPAY",
        reference: funding.reference,
        amount: funding.amountNaira,
        status: "SUCCESS",
        createdAt: FieldValue.serverTimestamp()
      });

      transaction.update(fundingRef, {
        status: "SUCCESS",
        verifiedAt: FieldValue.serverTimestamp()
      });
    });

    return {
      success: true,
      status: "SUCCESS",
      message: "Payment verified."
    };
  }
);
