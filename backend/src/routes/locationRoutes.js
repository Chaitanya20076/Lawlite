const express = require("express");

const {
  resolveJurisdiction,
} = require("../services/locationService");

const {
  requireAuth,
} = require("../middleware/authMiddleware");

const {
  requestContextMiddleware,
} = require("../middleware/requestContextMiddleware");

const {
  getFirestore,
  FieldValue,
} = require("firebase-admin/firestore");

const {
  firebaseApp,
} = require("../config/firebase");

const router = express.Router();

const db = getFirestore(firebaseApp);


/*
|--------------------------------------------------------------------------
| SAVE USER LOCATION / JURISDICTION
|--------------------------------------------------------------------------
|
| Frontend sends:
|
| {
|   latitude,
|   longitude
| }
|
| Backend:
| latitude + longitude
|        ↓
| reverse geocoding
|        ↓
| city + state + country
|        ↓
| users/{uid}
|
| We intentionally do NOT permanently store the raw GPS coordinates.
|
*/

router.post(
  "/",
  requireAuth,
  requestContextMiddleware,
  async (req, res) => {
    const requestId =
      req.requestId || "unknown";

    const uid =
      req.user?.uid;

    try {
      if (!uid) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user is required.",
          requestId,
        });
      }

      const {
        latitude,
        longitude,
      } = req.body;

      if (
        latitude === undefined ||
        longitude === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Latitude and longitude are required.",
          requestId,
        });
      }

      console.log(
        `📍 Lawlite location request | ` +
        `requestId=${requestId} | ` +
        `uid=${uid}`
      );

      const jurisdiction =
        await resolveJurisdiction({
          latitude,
          longitude,
        });

      const userRef =
        db
          .collection("users")
          .doc(uid);

      await userRef.set(
        {
          jurisdiction: {
            city:
              jurisdiction.city || null,

            state:
              jurisdiction.state || null,

            country:
              jurisdiction.country || null,

            countryCode:
              jurisdiction.countryCode ||
              null,

            displayName:
              jurisdiction.displayName ||
              null,

            updatedAt:
              FieldValue.serverTimestamp(),
          },

          locationAccess:
            "granted",

          locationUpdatedAt:
            FieldValue.serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      console.log(
        `✅ Jurisdiction saved | ` +
        `uid=${uid} | ` +
        `jurisdiction=${jurisdiction.displayName}`
      );

      return res.json({
        success: true,

        jurisdiction,

        locationAccess:
          "granted",

        requestId,
      });
    } catch (error) {
      console.error(
        "Location route error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to determine your legal jurisdiction right now.",
        requestId,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| GET USER JURISDICTION
|--------------------------------------------------------------------------
|
| Chat and other backend services can use this endpoint/service
| to retrieve the authenticated user's saved jurisdiction.
|
*/

router.get(
  "/",
  requireAuth,
  requestContextMiddleware,
  async (req, res) => {
    const requestId =
      req.requestId || "unknown";

    const uid =
      req.user?.uid;

    try {
      if (!uid) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user is required.",
          requestId,
        });
      }

      const userRef =
        db
          .collection("users")
          .doc(uid);

      const snapshot =
        await userRef.get();

      if (!snapshot.exists) {
        return res.json({
          success: true,
          jurisdiction: null,
          locationAccess:
            "not_requested",
          requestId,
        });
      }

      const data =
        snapshot.data();

      return res.json({
        success: true,

        jurisdiction:
          data?.jurisdiction ||
          null,

        locationAccess:
          data?.locationAccess ||
          "not_requested",

        requestId,
      });
    } catch (error) {
      console.error(
        "Get location error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to retrieve your location information.",
        requestId,
      });
    }
  }
);


/*
|--------------------------------------------------------------------------
| CLEAR USER JURISDICTION
|--------------------------------------------------------------------------
|
| Useful later for:
| "Remove location access"
|
*/

router.delete(
  "/",
  requireAuth,
  requestContextMiddleware,
  async (req, res) => {
    const requestId =
      req.requestId || "unknown";

    const uid =
      req.user?.uid;

    try {
      if (!uid) {
        return res.status(401).json({
          success: false,
          message:
            "Authenticated user is required.",
          requestId,
        });
      }

      await db
        .collection("users")
        .doc(uid)
        .set(
          {
            jurisdiction:
              FieldValue.delete(),

            locationAccess:
              "removed",

            locationUpdatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );

      return res.json({
        success: true,
        message:
          "Location information removed successfully.",
        requestId,
      });
    } catch (error) {
      console.error(
        "Delete location error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to remove location information.",
        requestId,
      });
    }
  }
);


module.exports = router;