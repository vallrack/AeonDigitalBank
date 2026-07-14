import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

// TODO: Configura aquí tus credenciales de Brevo (Sendinblue) SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false, // true para port 465
  auth: {
    user: 'TU_CORREO_DE_BREVO_AQUI', 
    pass: 'TU_CONTRASEÑA_SMTP_DE_BREVO_AQUI'
  }
});
const SENDER_EMAIL = 'no-reply@bankofamericans.com'; // Correo que aparecerá como remitente

// 1. onUserCreated: Setup new user profile securely
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const role = user.email === "vallrack67@gmail.com" ? "admin" : "user";
  
  // Set user profile
  await db.collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    fullName: user.displayName || "Usuario Bank of Americans",
    balance: 5000.00,
    role: role,
    kycStatus: "Verified",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Welcome bonus transaction
  await db.collection("users").doc(user.uid).collection("transactions").add({
    userId: user.uid,
    merchant: "Bank of Americans Welcome Bonus",
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
    cardHolder: (user.displayName || "Usuario Bank of Americans").toUpperCase(),
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
    const result = await db.runTransaction(async (t) => {
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

      return { senderData, recipientData };
    });

    // Send Emails via Nodemailer (Brevo) outside the transaction
    const sData = result.senderData;
    const rData = result.recipientData;

    try {
      if (sData?.email) {
        await transporter.sendMail({
          from: `"Bank of Americans" <${SENDER_EMAIL}>`,
          to: sData.email,
          subject: `Transferencia Exitosa de $${amount} USD`,
          html: `<p>Hola ${sData.fullName},</p>
                 <p>Has transferido <b>$${amount} USD</b> a ${rData?.fullName}.</p>
                 <p>Concepto: ${reference || "Sin concepto"}</p>
                 <p>Gracias por usar Bank of Americans.</p>`
        });
      }

      if (rData?.email) {
        await transporter.sendMail({
          from: `"Bank of Americans" <${SENDER_EMAIL}>`,
          to: rData.email,
          subject: `Has recibido $${amount} USD de ${sData?.fullName}`,
          html: `<p>Hola ${rData.fullName},</p>
                 <p>Has recibido <b>$${amount} USD</b> de parte de ${sData?.fullName}.</p>
                 <p>Concepto: ${reference || "Sin concepto"}</p>
                 <p>Gracias por usar Bank of Americans.</p>`
        });
      }
    } catch (emailError) {
      console.error("Error enviando correos:", emailError);
      // We don't throw here because the transfer was already successful
    }

    return { success: true };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

// 4. Admin Functions
export const adminCreateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  const callerRole = callerSnap.data()?.role;
  
  if (callerRole !== "admin" && callerRole !== "coordinator") {
    throw new functions.https.HttpsError("permission-denied", "Requires admin or coordinator role.");
  }

  const { email, password, fullName, balance, role } = data;
  const newRole = role || "user";

  // Coordinators can only create 'user' roles
  if (callerRole === "coordinator" && newRole !== "user") {
    throw new functions.https.HttpsError("permission-denied", "Coordinators can only create regular users.");
  }
  
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: fullName,
    });

    const initBalance = Number(balance) || 0;

    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email,
      fullName: fullName,
      balance: initBalance,
      role: newRole,
      kycStatus: "Verified",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    if (initBalance > 0) {
      await db.collection("users").doc(userRecord.uid).collection("transactions").add({
        userId: userRecord.uid,
        merchant: "Admin Initial Deposit",
        amount: initBalance,
        category: "Income",
        status: "Completed",
        date: new Date().toISOString(),
        type: "income",
        network: "AEON_INTERNAL"
      });
    }

    return { uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});

export const adminDeposit = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  if (callerSnap.data()?.role !== "admin") throw new functions.https.HttpsError("permission-denied", "Requires admin role.");

  const { userId, amount } = data;
  const numAmount = Number(amount);
  
  const userRef = db.collection("users").doc(userId);
  await userRef.update({ balance: admin.firestore.FieldValue.increment(numAmount) });
  
  await userRef.collection("transactions").add({
    userId,
    merchant: "Admin Manual Deposit",
    amount: numAmount,
    category: "Income",
    status: "Completed",
    date: new Date().toISOString(),
    type: "income",
    reference: "Admin deposit",
    network: "AEON_INTERNAL"
  });

  return { success: true };
});

export const adminUpdateUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  const callerRole = callerSnap.data()?.role;
  if (callerRole !== "admin" && callerRole !== "coordinator") {
    throw new functions.https.HttpsError("permission-denied", "Requires admin or coordinator role.");
  }

  const { userId, fullName, balance, role } = data;
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  
  const oldBalance = userSnap.data()?.balance || 0;
  const oldRole = userSnap.data()?.role || "user";
  const newBalance = Number(balance);
  const newRole = role || oldRole;
  const diff = newBalance - oldBalance;

  if (callerRole === "coordinator" && (diff !== 0 || newRole !== oldRole)) {
    throw new functions.https.HttpsError("permission-denied", "Coordinators cannot change balances or roles.");
  }

  await userRef.update({ fullName, balance: newBalance, role: newRole });

  if (diff !== 0) {
    await userRef.collection("transactions").add({
      userId,
      merchant: "Admin Balance Adjustment",
      amount: Math.abs(diff),
      category: "Adjustment",
      status: "Completed",
      date: new Date().toISOString(),
      type: diff > 0 ? "income" : "expense",
      reference: "Manual adjustment by admin"
    });
  }

  return { success: true };
});

export const adminDeleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  const callerSnap = await db.collection("users").doc(context.auth.uid).get();
  if (callerSnap.data()?.role !== "admin") throw new functions.https.HttpsError("permission-denied", "Requires admin role.");

  const { userId } = data;
  await admin.auth().deleteUser(userId);
  await db.collection("users").doc(userId).delete();
  
  return { success: true };
});

// 5. Virtual Cards Functions
export const createVirtualCard = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const userSnap = await db.collection("users").doc(context.auth.uid).get();
  const uData = userSnap.data();

  const crypto = require("crypto");
  const randomCard = "4255" + crypto.randomInt(100000000000, 999999999999).toString();
  const randomCvv = crypto.randomInt(100, 999).toString();

  const newCard = {
    userId: context.auth.uid,
    cardHolder: (uData?.fullName || "VALUED CUSTOMER").toUpperCase(),
    cardNumber: randomCard,
    expiryDate: "12/28",
    cvv: randomCvv,
    isFrozen: false,
    type: "standard",
    createdAt: new Date().toISOString()
  };

  await db.collection("users").doc(context.auth.uid).collection("virtualCards").add(newCard);
  return { success: true };
});

export const toggleVirtualCardFreeze = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { cardId, isFrozen } = data;
  await db.collection("users").doc(context.auth.uid).collection("virtualCards").doc(cardId).update({
    isFrozen: isFrozen
  });
  return { success: true };
});

export const deleteVirtualCard = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated.");
  
  const { cardId } = data;
  await db.collection("users").doc(context.auth.uid).collection("virtualCards").doc(cardId).delete();
  return { success: true };
});

