// Online leaderboard (Google Firebase / Cloud Firestore, no login needed).
// Fill these in from your Firebase project (Project settings -> General -> Your apps -> Web app config)
// and publish firestore.rules from the repo root. Until projectId is set, the leaderboard says it is not set up.
// Firebase web API keys are public identifiers, not secrets: the security rules are what protect the data.
const LEADERBOARD_CONFIG = {
  projectId: '',
  apiKey: '',
};
