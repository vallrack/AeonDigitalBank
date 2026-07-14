import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 1. onUserCreated: Setup new user profile securely
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const role = user.email === "vallrack67@gmail.com" ? "admin" : "user";
  
  // Set user profile
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    fullName: user.displayName || "Usuario Aeon",
    balance: 5000.00,
    role: role,
    kycStatus: "Verified",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Welcome bonus transaction
  await db.collection("users").doc(user.uid).collection("transactions").add({
    userId: user.uid,
    merchant: "Aeon Bank Welcome Bonus",
    amount: 5000.00,
    category: "Income",
    status: "Completed",
    date: new Date().toISOString(),
    type: "income"
  });

  // Generate virtual card securely
  const crypto = require("crypto");
  const randomCard = "4255" + crypto.randomInt(100000000000, 999999999999).toString();
  const randomCvv = crypto.randomInt(100, 999).toString();

  await db.collection("users").doc(user.uid).collection("virtualCards").add({
    userId: user.uid,
    cardHolder: (user.displayName || "Usuario Aeon").toUpperCase(),
    cardNumber: randomCard,
    expiryDate: "12/28",
    cvv: randomCvv,
    isFrozen: false,
    type: "standard"
  });
});

// 2. searchRecipient
export const searchRecipient = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { query } = data;
  if (!query || typeof query !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "Invalid search query.");
  }

  const cleanQuery = query.trim().toLowerCase();
  
  // Search by email
  if (cleanQuery.includes("@")) {
    const userSnap = await db.collection("users").where("email", "==", cleanQuery).limit(1).get();
    if (!userSnap.empty) {
      const uData = userSnap.docs[0].data();
      return { uid: uData.uid, fullName: uData.fullName };
    }
  } else if (cleanQuery.length >= 10) {
    // Search by card
    const cardsSnap = await db.collectionGroup("virtualCards").where("cardNumber", "==", cleanQuery).limit(1).get();
    if (!cardsSnap.empty) {
      const cardData = cardsSnap.docs[0].data();
      const userSnap = await db.collection("users").doc(cardData.userId).get();
      if (userSnap.exists) {
        const uData = userSnap.data();
        return { uid: uData?.uid, fullName: uData?.fullName };
      }
    }
  }

  throw new functions.https.HttpsError("not-found", "Recipient not found.");
});

// 3. processTransfer
export const processTransfer = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const senderId = context.auth.uid;
  const { recipientId, amount, reference, aiCategory } = data;

  if (!recipientId || typeof amount !== "number" || amount <= 0) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid transfer parameters.");
  }

  if (senderId === recipientId) {
    throw new functions.https.HttpsError("invalid-argument", "Cannot transfer to self.");
  }

  const senderRef = db.collection("users").doc(senderId);
  const recipientRef = db.collection("users").doc(recipientId);

  try {
    await db.runTransaction(async (t) => {
      const senderDoc = await t.get(senderRef);
      const recipientDoc = await t.get(recipientRef);

      if (!senderDoc.exists) throw new functions.https.HttpsError("not-found", "Sender not found.");
      if (!recipientDoc.exists) throw new functions.https.HttpsError("not-found", "Recipient not found.");

      const senderData = senderDoc.data();
      const recipientData = recipientDoc.data();

      if (senderData?.balance < amount) {
        throw new functions.https.HttpsError("failed-precondition", "Insufficient balance.");
      }

      // Update balances
      t.update(senderRef, { balance: admin.firestore.FieldValue.increment(-amount) });
      t.update(recipientRef, { balance: admin.firestore.FieldValue.increment(amount) });

      // Create transactions
      const senderTxRef = senderRef.collection("transactions").doc();
      t.set(senderTxRef, {
        userId: senderId,
        merchant: `Transferencia a ${recipientData?.fullName}`,
        amount: amount,
        category: aiCategory || "Transfer",
        status: "Completed",
        date: new Date().toISOString(),
        type: "expense",
        reference: reference || "",
        recipientId: recipientId,
        network: "AEON_INTERNAL"
      });

      const recipientTxRef = recipientRef.collection("transactions").doc();
      t.set(recipientTxRef, {
        userId: recipientId,
        merchant: `Transferencia de ${senderData?.fullName}`,
        amount: amount,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income",
        reference: reference || "",
        senderId: senderId,
        network: "AEON_INTERNAL"
      });
    });

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});
