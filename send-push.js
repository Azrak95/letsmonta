const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://letsmonta-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();

async function sendPushNotifications() {
  // Get latest notify event
  const notifySnap = await db.ref('notify').once('value');
  if (!notifySnap.exists()) { console.log('No notify event'); process.exit(0); }
  const { senderId, senderName, ts } = notifySnap.val();

  // Only process recent events (last 30 seconds)
  if (Date.now() - ts > 30000) { console.log('Event too old, skipping'); process.exit(0); }

  // Get all tokens except sender
  const tokensSnap = await db.ref('tokens').once('value');
  if (!tokensSnap.exists()) { console.log('No tokens'); process.exit(0); }

  const tokens = [];
  tokensSnap.forEach(child => {
    if (child.key !== senderId) tokens.push(child.val());
  });

  if (tokens.length === 0) { console.log('No recipients'); process.exit(0); }

  console.log(`Sending to ${tokens.length} devices...`);

  const message = {
    notification: {
      title: '¡LetsMonta! 🍻',
      body: `${senderName} está en modo monta! 🔥`,
      icon: 'https://azrak95.github.io/letsmonta/app_icon.png'
    },
    data: { senderId },
    tokens
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`Sent: ${response.successCount} ok, ${response.failureCount} failed`);

  // Clean up failed tokens
  const failedTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) failedTokens.push(tokens[idx]);
  });
  if (failedTokens.length > 0) {
    const updates = {};
    tokensSnap.forEach(child => {
      if (failedTokens.includes(child.val())) updates[child.key] = null;
    });
    await db.ref('tokens').update(updates);
  }

  process.exit(0);
}

sendPushNotifications().catch(e => { console.error(e); process.exit(1); });
