const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://letsmonta-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();

async function sendPushNotifications() {
  const notifySnap = await db.ref('notify').once('value');
  if (!notifySnap.exists()) { console.log('No notify event'); process.exit(0); }

  const { senderId, senderName, ts, sent } = notifySnap.val();

  // Skip if already sent
  if (sent) { console.log('Already sent, skipping'); process.exit(0); }

  // Only process events from last 2 minutes
  if (Date.now() - ts > 120000) { console.log('Event too old'); process.exit(0); }

  // Mark as sent immediately to avoid duplicates
  await db.ref('notify/sent').set(true);

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
      title: 'LetsMonta! 🍻',
      body: `${senderName} está en modo monta! 🔥`,
      icon: 'https://azrak95.github.io/letsmonta/app_icon.png'
    },
    data: { senderId },
    tokens
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  console.log(`Sent: ${response.successCount} ok, ${response.failureCount} failed`);

  // Remove failed tokens
  if (response.failureCount > 0) {
    const updates = {};
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        tokensSnap.forEach(child => {
          if (child.val() === tokens[idx]) updates[child.key] = null;
        });
      }
    });
    await db.ref('tokens').update(updates);
  }

  process.exit(0);
}

sendPushNotifications().catch(e => { console.error(e); process.exit(1); });
