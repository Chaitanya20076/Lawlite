const LOCATION_REVERSE_GEOCODE_URL =
  "https://api.bigdatacloud.net/data/reverse-geocode-client";

/*
|--------------------------------------------------------------------------
| VALIDATE COORDINATES
|--------------------------------------------------------------------------
*/

const validateCoordinates = (
  latitude,
  longitude
) => {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon)
  ) {
    return false;
  }

  if (lat < -90 || lat > 90) {
    return false;
  }

  if (lon < -180 || lon > 180) {
    return false;
  }

  return true;
};


/*
|--------------------------------------------------------------------------
| REVERSE GEOCODE
|--------------------------------------------------------------------------
|
| Converts:
|
| latitude + longitude
|        ↓
| city + state + country
|
| We use this only to determine legal jurisdiction.
|
*/

const reverseGeocode = async ({
  latitude,
  longitude,
}) => {
  if (
    !validateCoordinates(
      latitude,
      longitude
    )
  ) {
    throw new Error(
      "Invalid latitude or longitude."
    );
  }

  const lat = Number(latitude);
  const lon = Number(longitude);

  const url =
    `${LOCATION_REVERSE_GEOCODE_URL}` +
    `?latitude=${encodeURIComponent(lat)}` +
    `&longitude=${encodeURIComponent(lon)}` +
    `&localityLanguage=en`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "User-Agent":
        "Lawlite/1.0 legal-assistant-prototype",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Reverse geocoding failed with status ${response.status}.`
    );
  }

  const data =
    await response.json();

  const city =
    data?.city ||
    data?.locality ||
    data?.principalSubdivision ||
    null;

  const state =
    data?.principalSubdivision ||
    null;

  const country =
    data?.countryName ||
    null;

  const countryCode =
    data?.countryCode ||
    null;

  if (!country) {
    throw new Error(
      "Unable to determine the country from the supplied location."
    );
  }

  return {
    city,
    state,
    country,
    countryCode,
  };
};


/*
|--------------------------------------------------------------------------
| BUILD JURISDICTION
|--------------------------------------------------------------------------
*/

const buildJurisdiction = ({
  city,
  state,
  country,
  countryCode,
}) => {
  const parts = [
    city,
    state,
    country,
  ].filter(
    (value) =>
      value &&
      String(value).trim()
  );

  return {
    city:
      city
        ? String(city).trim()
        : null,

    state:
      state
        ? String(state).trim()
        : null,

    country:
      country
        ? String(country).trim()
        : null,

    countryCode:
      countryCode
        ? String(countryCode)
            .trim()
            .toUpperCase()
        : null,

    displayName:
      parts.join(", "),
  };
};


/*
|--------------------------------------------------------------------------
| RESOLVE JURISDICTION
|--------------------------------------------------------------------------
*/

const resolveJurisdiction = async ({
  latitude,
  longitude,
}) => {
  const location =
    await reverseGeocode({
      latitude,
      longitude,
    });

  return buildJurisdiction(
    location
  );
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  validateCoordinates,
  reverseGeocode,
  buildJurisdiction,
  resolveJurisdiction,
};