const path = require("path");

const {
  initializeApp,
  cert,
  getApps,
} = require("firebase-admin/app");

const { getAuth } = require("firebase-admin/auth");

const serviceAccount = require(
  path.join(__dirname, "../../serviceAccountKey.json")
);

const firebaseApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApps()[0];

const auth = getAuth(firebaseApp);

module.exports = {
  firebaseApp,
  auth,
};