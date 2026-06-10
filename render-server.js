const admin = require('firebase-admin');
const http = require('http');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://letsmonta-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();
let lastProcessedTs = 0;

console.log('LetsMonta push server started, listening for events...');

// Listen to Firebase notify node in real time
db.ref('notify').on('value', async snap => {
  if (!snap.exists()) return;
  const { senderId, senderName, ts, sent } = snap.val();

  // Skip if already sent or already processed
  if (sent || ts <= lastProcessedTs) return;
  lastProcessedTs = ts;

  // Mark as sent immediately
  await db.ref('notify/sent').set(true);

  const tokensSnap = await db.ref('tokens').once('value');
  if (!tokensSnap.exists()) { console.log('No tokens'); return; }

  const tokens = [];
  tokensSnap.forEach(child => {
    if (child.key !== senderId) tokens.push(child.val());
  });

  if (tokens.length === 0) { console.log('No recipients'); return; }

  console.log(`Sending push to ${tokens.length} devices for ${senderName}...`);

  const message = {
    notification: {
      title: 'LetsMonta! 🍻',
      body: `${senderName} está en modo monta! 🔥`,
      icon: 'https://azrak95.github.io/letsmonta/app_icon.png'
    },
    data: { senderId },
    tokens
  };

  try {
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
      if (Object.keys(updates).length > 0) await db.ref('tokens').update(updates);
    }
  } catch(e) {
    console.error('Error sending push:', e.message);
  }
});

// Keep-alive HTTP server so Render no cierra el proceso
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('LetsMonta push server running');
});
server.listen(process.env.PORT || 3000, () => {
  console.log(`HTTP server listening on port ${process.env.PORT || 3000}`);
});
