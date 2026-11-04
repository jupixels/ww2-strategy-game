// Cloud Function: every new leaderboard submission is replayed by functions/verify.js. A verified game becomes an
// entry in `scores` (same document id); a refused one stays in `submissions` with status 'rejected' and the reason.
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { verify } = require('./verify');
admin.initializeApp();
const db = admin.firestore();
exports.verifyScore = onDocumentCreated({ document:'submissions/{id}', memory:'1GiB', timeoutSeconds:300, maxInstances:5 }, async ev => {
  const snap = ev.data; if (!snap) return;
  const sub = snap.data(), id = ev.params.id;
  try {
    const card = verify(sub);
    await db.collection('scores').doc(id).set({ ...card, name:String(sub.name || 'Commander').replace(/[<>]/g, '').slice(0, 20), at:admin.firestore.FieldValue.serverTimestamp(), verified:true });
    await snap.ref.delete();
  } catch (err) {
    await snap.ref.set({ status:'rejected', why:String(err.message || err).slice(0, 200), rec:admin.firestore.FieldValue.delete() }, { merge:true });
  }
});
