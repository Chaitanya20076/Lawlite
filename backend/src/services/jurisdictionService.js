const { getFirestore } = require("firebase-admin/firestore");
const { firebaseApp } = require("../config/firebase");

const db = getFirestore(firebaseApp);

/*
|--------------------------------------------------------------------------
| INDIA STATES + UNION TERRITORIES
|--------------------------------------------------------------------------
*/

const INDIA_JURISDICTIONS = [
  { name: "Andhra Pradesh", type: "state" },
  { name: "Arunachal Pradesh", type: "state" },
  { name: "Assam", type: "state" },
  { name: "Bihar", type: "state" },
  { name: "Chhattisgarh", type: "state" },
  { name: "Goa", type: "state" },
  { name: "Gujarat", type: "state" },
  { name: "Haryana", type: "state" },
  { name: "Himachal Pradesh", type: "state" },
  { name: "Jharkhand", type: "state" },
  { name: "Karnataka", type: "state" },
  { name: "Kerala", type: "state" },
  { name: "Madhya Pradesh", type: "state" },
  { name: "Maharashtra", type: "state" },
  { name: "Manipur", type: "state" },
  { name: "Meghalaya", type: "state" },
  { name: "Mizoram", type: "state" },
  { name: "Nagaland", type: "state" },
  { name: "Odisha", type: "state" },
  { name: "Punjab", type: "state" },
  { name: "Rajasthan", type: "state" },
  { name: "Sikkim", type: "state" },
  { name: "Tamil Nadu", type: "state" },
  { name: "Telangana", type: "state" },
  { name: "Tripura", type: "state" },
  { name: "Uttar Pradesh", type: "state" },
  { name: "Uttarakhand", type: "state" },
  { name: "West Bengal", type: "state" },

  { name: "Andaman and Nicobar Islands", type: "union territory" },
  { name: "Chandigarh", type: "union territory" },
  { name: "Dadra and Nagar Haveli and Daman and Diu", type: "union territory" },
  { name: "Delhi", type: "union territory" },
  { name: "Jammu and Kashmir", type: "union territory" },
  { name: "Ladakh", type: "union territory" },
  { name: "Lakshadweep", type: "union territory" },
  { name: "Puducherry", type: "union territory" },
];

/*
|--------------------------------------------------------------------------
| COMMON INTERNATIONAL JURISDICTIONS
|--------------------------------------------------------------------------
|
| This is intentionally curated for the prototype.
| India remains the primary supported jurisdiction set.
|--------------------------------------------------------------------------
*/

const COUNTRY_JURISDICTIONS = [
  {
    aliases: ["india", "indian"],
    country: "India",
    countryCode: "IN",
  },
  {
    aliases: [
      "united states",
      "united states of america",
      "usa",
      "u.s.a.",
      "u.s.",
    ],
    country: "United States",
    countryCode: "US",
  },
  {
    aliases: [
      "united kingdom",
      "uk",
      "u.k.",
      "britain",
      "great britain",
    ],
    country: "United Kingdom",
    countryCode: "GB",
  },
  {
    aliases: ["canada"],
    country: "Canada",
    countryCode: "CA",
  },
  {
    aliases: ["australia"],
    country: "Australia",
    countryCode: "AU",
  },
  {
    aliases: ["new zealand"],
    country: "New Zealand",
    countryCode: "NZ",
  },
  {
    aliases: ["singapore"],
    country: "Singapore",
    countryCode: "SG",
  },
  {
    aliases: [
      "united arab emirates",
      "uae",
      "u.a.e.",
    ],
    country: "United Arab Emirates",
    countryCode: "AE",
  },
  {
    aliases: ["saudi arabia"],
    country: "Saudi Arabia",
    countryCode: "SA",
  },
  {
    aliases: ["qatar"],
    country: "Qatar",
    countryCode: "QA",
  },
  {
    aliases: ["germany"],
    country: "Germany",
    countryCode: "DE",
  },
  {
    aliases: ["france"],
    country: "France",
    countryCode: "FR",
  },
  {
    aliases: ["italy"],
    country: "Italy",
    countryCode: "IT",
  },
  {
    aliases: ["spain"],
    country: "Spain",
    countryCode: "ES",
  },
  {
    aliases: ["netherlands", "the netherlands", "holland"],
    country: "Netherlands",
    countryCode: "NL",
  },
];

/*
|--------------------------------------------------------------------------
| US STATES
|--------------------------------------------------------------------------
*/

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
];

/*
|--------------------------------------------------------------------------
| NORMALIZE TEXT
|--------------------------------------------------------------------------
*/

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[.,!?;:()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/*
|--------------------------------------------------------------------------
| WORD-BOUNDARY MATCH
|--------------------------------------------------------------------------
*/

const containsPhrase = (text, phrase) => {
  const normalizedText = normalizeText(text);
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedText || !normalizedPhrase) {
    return false;
  }

  const escaped = normalizedPhrase.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

  return new RegExp(
    `(^|\\s)${escaped}(?=\\s|$)`,
    "i"
  ).test(normalizedText);
};

/*
|--------------------------------------------------------------------------
| NORMALIZE FIRESTORE JURISDICTION
|--------------------------------------------------------------------------
*/

const normalizeJurisdiction = (jurisdiction = null) => {
  if (!jurisdiction || typeof jurisdiction !== "object") {
    return null;
  }

  const city = jurisdiction.city
    ? String(jurisdiction.city).trim()
    : null;

  const state = jurisdiction.state
    ? String(jurisdiction.state).trim()
    : null;

  const country = jurisdiction.country
    ? String(jurisdiction.country).trim()
    : null;

  const countryCode = jurisdiction.countryCode
    ? String(jurisdiction.countryCode)
        .trim()
        .toUpperCase()
    : null;

  const displayName =
    jurisdiction.displayName ||
    [city, state, country]
      .filter(Boolean)
      .join(", ");

  if (!city && !state && !country) {
    return null;
  }

  return {
    city,
    state,
    country,
    countryCode,
    displayName: displayName || null,
  };
};

/*
|--------------------------------------------------------------------------
| GET SAVED USER JURISDICTION
|--------------------------------------------------------------------------
*/

const getUserJurisdiction = async (uid) => {
  if (!uid) {
    return null;
  }

  try {
    const userRef = db
      .collection("users")
      .doc(uid);

    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      return null;
    }

    const data = snapshot.data();

    return normalizeJurisdiction(
      data?.jurisdiction || null
    );
  } catch (error) {
    console.error(
      "Jurisdiction lookup failed:",
      error
    );

    /*
     * Jurisdiction must never break
     * an otherwise valid chat request.
     */
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| DETECT EXPLICIT INDIA STATE / UNION TERRITORY
|--------------------------------------------------------------------------
*/

const detectIndiaState = (message) => {
  const matches = INDIA_JURISDICTIONS.filter(
    (jurisdiction) =>
      containsPhrase(
        message,
        jurisdiction.name
      )
  );

  if (matches.length === 0) {
    return null;
  }

  /*
   * Prefer the longest match.
   * Example:
   * "Jammu and Kashmir" should beat
   * a shorter overlapping expression.
   */
  matches.sort(
    (a, b) =>
      b.name.length - a.name.length
  );

  const match = matches[0];

  return {
    city: null,
    state: match.name,
    country: "India",
    countryCode: "IN",
    displayName: `${match.name}, India`,
    source: "explicit_message",
    jurisdictionType: match.type,
  };
};

/*
|--------------------------------------------------------------------------
| DETECT US STATE
|--------------------------------------------------------------------------
*/

const detectUSState = (message) => {
  const matches = US_STATES.filter(
    (state) =>
      containsPhrase(message, state)
  );

  if (matches.length === 0) {
    return null;
  }

  matches.sort(
    (a, b) =>
      b.length - a.length
  );

  const state = matches[0];

  return {
    city: null,
    state,
    country: "United States",
    countryCode: "US",
    displayName: `${state}, United States`,
    source: "explicit_message",
    jurisdictionType: "state",
  };
};

/*
|--------------------------------------------------------------------------
| DETECT EXPLICIT COUNTRY
|--------------------------------------------------------------------------
*/

const detectCountry = (message) => {
  for (const jurisdiction of COUNTRY_JURISDICTIONS) {
    const matchedAlias =
      jurisdiction.aliases.find(
        (alias) =>
          containsPhrase(
            message,
            alias
          )
      );

    if (matchedAlias) {
      return {
        city: null,
        state: null,
        country:
          jurisdiction.country,
        countryCode:
          jurisdiction.countryCode,
        displayName:
          jurisdiction.country,
        source: "explicit_message",
        jurisdictionType: "country",
        matchedAlias,
      };
    }
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| DETECT EXPLICIT JURISDICTION
|--------------------------------------------------------------------------
|
| Priority:
|
| 1. Indian state / UT
| 2. US state
| 3. Country
|
| This means:
|
| "tenant laws in Maharashtra"
| -> Maharashtra, India
|
| "tenant laws in California"
| -> California, United States
|
| "consumer law in Canada"
| -> Canada
|
|--------------------------------------------------------------------------
*/

const detectExplicitJurisdiction = (
  message = "",
  defaultJurisdiction = null
) => {
  const text = String(message || "").trim();

  if (!text) {
    return {
      jurisdiction: null,
      explicit: false,
    };
  }

  const indiaState =
    detectIndiaState(text);

  if (indiaState) {
    return {
      jurisdiction: indiaState,
      explicit: true,
    };
  }

  const usState =
    detectUSState(text);

  if (usState) {
    return {
      jurisdiction: usState,
      explicit: true,
    };
  }

  const country =
    detectCountry(text);

  if (country) {
    return {
      jurisdiction: country,
      explicit: true,
    };
  }

  return {
    jurisdiction:
      normalizeJurisdiction(
        defaultJurisdiction
      ),
    explicit: false,
  };
};

/*
|--------------------------------------------------------------------------
| RESOLVE EFFECTIVE JURISDICTION
|--------------------------------------------------------------------------
|
| Explicit user message wins over saved location.
|--------------------------------------------------------------------------
*/

const resolveEffectiveJurisdiction = ({
  message = "",
  savedJurisdiction = null,
} = {}) => {
  const result =
    detectExplicitJurisdiction(
      message,
      savedJurisdiction
    );

  return {
    jurisdiction:
      result.jurisdiction || null,

    explicit:
      result.explicit === true,

    source:
      result.explicit
        ? "explicit_message"
        : result.jurisdiction
          ? "saved_location"
          : "none",
  };
};

/*
|--------------------------------------------------------------------------
| FORMAT JURISDICTION FOR AI
|--------------------------------------------------------------------------
*/

const formatJurisdictionForPrompt = (
  jurisdiction = null
) => {
  const normalized =
    normalizeJurisdiction(
      jurisdiction
    );

  if (!normalized) {
    return "No jurisdiction has been supplied.";
  }

  const parts = [];

  if (normalized.city) {
    parts.push(
      `City: ${normalized.city}`
    );
  }

  if (normalized.state) {
    parts.push(
      `State/Region: ${normalized.state}`
    );
  }

  if (normalized.country) {
    parts.push(
      `Country: ${normalized.country}`
    );
  }

  if (normalized.countryCode) {
    parts.push(
      `Country code: ${normalized.countryCode}`
    );
  }

  return parts.join("\n");
};

module.exports = {
  getUserJurisdiction,
  detectExplicitJurisdiction,
  resolveEffectiveJurisdiction,
  normalizeJurisdiction,
  formatJurisdictionForPrompt,
};