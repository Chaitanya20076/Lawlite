const SERPER_API_URL =
  "https://google.serper.dev/search";

const searchWeb = async ({
  query,
  num = 5,
}) => {
  if (!process.env.SERPER_API_KEY) {
    throw new Error(
      "SERPER_API_KEY is not configured."
    );
  }

  const response = await fetch(
    SERPER_API_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "X-API-KEY":
          process.env.SERPER_API_KEY,
      },

      body: JSON.stringify({
        q: query,
        num,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(
      "Serper API error:",
      data
    );

    throw new Error(
      data?.message ||
        "Serper search failed."
    );
  }

  return data;
};

module.exports = {
  searchWeb,
};