const admin = require('firebase-admin');
const http = require('http');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://letsmonta-default-rtdb.europe-west1.firebasedatabase.app'
});

const db = admin.database();

console.log('LetsMonta push server started, listening for events...');

db.ref('notify').on('value', async snap => {
  if (!snap.exists()) return;
  const data = snap.val();
  if (!data || data.sent) return;

  // Transacción atómica: solo una instancia procesa cada evento
  let committed = false;
  await db.ref('notify').transaction(current => {
    if (!current || current.sent) return;
    return { ...current, sent: true };
  }, (error, com) => {
    if (error) console.error('Transaction error:', error);
    else committed = com;
  });

  if (!committed) {
    console.log('Skipped: another instance already processed this event');
    return;
  }

  const { senderId, senderName } = data;

  const tokensSnap = await db.ref('tokens').once('value');
  if (!tokensSnap.exists()) { console.log('No tokens'); return; }

  const iosTokens = [];
  const otherTokens = [];
  const tokenKeys = {};

  tokensSnap.forEach(child => {
    if (child.key === senderId) return;
    const val = child.val();
    // Compatibilidad con tokens antiguos (string) y nuevos ({ token, platform })
    const token = typeof val === 'string' ? val : val?.token;
    const platform = typeof val === 'string' ? 'other' : (val?.platform || 'other');
    if (!token) return;
    tokenKeys[token] = child.key;
    if (platform === 'ios') iosTokens.push(token);
    else otherTokens.push(token);
  });

  const totalRecipients = iosTokens.length + otherTokens.length;
  if (totalRecipients === 0) { console.log('No recipients'); return; }

  console.log(`Sending push for ${senderName} → iOS: ${iosTokens.length}, other: ${otherTokens.length}`);

  const title = 'LetsMonta! 🍻';
  const body = `${senderName} está en modo monta! 🔥`;
  const deadTokenErrors = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token'
  ];
  const deadUpdates = {};

  async function sendAndClean(tokens, message) {
    if (tokens.length === 0) return;
    try {
      const response = await admin.messaging().sendEachForMulticast({ ...message, tokens });
      console.log(`Sent: ${response.successCount} ok, ${response.failureCount} failed`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success && deadTokenErrors.includes(resp.error?.code)) {
          const userId = tokenKeys[tokens[idx]];
          if (userId) {
            deadUpdates[userId] = null;
            console.log(`Removing dead token for ${userId}: ${resp.error.code}`);
          }
        }
      });
    } catch (e) {
      console.error('Error sending push:', e.message);
    }
  }

  // iOS: campo notification para que llegue aunque la app esté cerrada
  await sendAndClean(iosTokens, {
    notification: { title, body },
    data: { senderId, senderName }
  });

  // Android / PC / otros: solo data, el SW muestra la notificación
  await sendAndClean(otherTokens, {
    data: { senderId, senderName, title, body }
  });

  if (Object.keys(deadUpdates).length > 0) {
    await db.ref('tokens').update(deadUpdates);
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('LetsMonta push server running');
});

server.listen(process.env.PORT || 3000, () => {
  console.log(`HTTP server listening on port ${process.env.PORT || 3000}`);
});
