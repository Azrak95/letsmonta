const admin = require('firebase-admin');
const http = require('http');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://letsmonta-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();
const processedTs = new Set();

console.log('LetsMonta push server started, listening for events...');

db.ref('notify').on('value', async snap => {
  if (!snap.exists()) return;
  const { senderId, senderName, ts, sent } = snap.val();
  if (sent || processedTs.has(ts)) return;
  processedTs.add(ts);

  await db.ref('notify/sent').set(true);

  const tokensSnap = await db.ref('tokens').once('value');
  if (!tokensSnap.exists()) { console.log('No tokens'); return; }

  const tokens = [];
  const tokenKeys = {};
  tokensSnap.forEach(child => {
    if (child.key !== senderId) {
      tokens.push(child.val());
      tokenKeys[child.val()] = child.key;
    }
  });

  if (tokens.length === 0) { console.log('No recipients'); return; }

  console.log(`Sending push to ${tokens.length} devices for ${senderName}...`);

  const message = {
    notification: {
      title: 'LetsMonta! 🍻',
      body: `${senderName} está en modo monta! 🔥`
    },
    data: { senderId },
    tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Sent: ${response.successCount} ok, ${response.failureCount} failed`);

    // Solo borrar tokens definitivamente inválidos (no errores temporales)
    if (response.failureCount > 0) {
      const deadTokenErrors = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];
      const updates = {};
      response.responses.forEach((resp, idx) => {
        if (!resp.success && deadTokenErrors.includes(resp.error?.code)) {
          const userId = tokenKeys[tokens[idx]];
          if (userId) {
            updates[userId] = null;
            console.log(`Removing dead token for ${userId}: ${resp.error.code}`);
          }
        }
      });
      if (Object.keys(updates).length > 0) {
        await db.ref('tokens').update(updates);
      }
    }
  } catch (e) {
    console.error('Error sending push:', e.message);
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('LetsMonta push server running');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`HTTP server listening on port ${process.env.PORT || 3000}`);
});
});
