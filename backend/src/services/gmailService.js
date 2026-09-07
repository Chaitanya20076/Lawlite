const { google } = require("googleapis");

const {
  createGmailOAuthClient,
} = require("../config/gmailOAuth");

const GMAIL_USER = "me";

/*
|--------------------------------------------------------------------------
| TEXT HELPERS
|--------------------------------------------------------------------------
*/

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const decodeBase64Url = (value = "") => {
  if (!value) {
    return "";
  }

  try {
    const normalized = String(value)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      normalized.length +
        ((4 - (normalized.length % 4)) % 4),
      "="
    );

    return Buffer.from(
      padded,
      "base64"
    ).toString("utf8");
  } catch (error) {
    console.error(
      "Gmail base64 decode error:",
      error
    );

    return "";
  }
};

const htmlToText = (html = "") => {
  return String(html)
    .replace(
      /<style[\s\S]*?<\/style>/gi,
      " "
    )
    .replace(
      /<script[\s\S]*?<\/script>/gi,
      " "
    )
    .replace(
      /<br\s*\/?>/gi,
      "\n"
    )
    .replace(
      /<\/p>/gi,
      "\n\n"
    )
    .replace(
      /<[^>]+>/g,
      " "
    )
    .replace(
      /&nbsp;/gi,
      " "
    )
    .replace(
      /&amp;/gi,
      "&"
    )
    .replace(
      /&lt;/gi,
      "<"
    )
    .replace(
      /&gt;/gi,
      ">"
    )
    .replace(
      /&quot;/gi,
      '"'
    )
    .replace(
      /&#39;/gi,
      "'"
    );
};

/*
|--------------------------------------------------------------------------
| EMAIL HEADER HELPERS
|--------------------------------------------------------------------------
*/

const findHeader = (
  headers = [],
  name
) => {
  const target =
    String(name).toLowerCase();

  return (
    headers.find(
      (header) =>
        String(
          header?.name || ""
        ).toLowerCase() === target
    )?.value || ""
  );
};

/*
|--------------------------------------------------------------------------
| EXTRACT EMAIL BODY + ATTACHMENTS
|--------------------------------------------------------------------------
*/

const extractBodyAndAttachments = (
  payload
) => {
  let plainText = "";
  let htmlText = "";

  const attachments = [];

  const walk = (part) => {
    if (!part) {
      return;
    }

    const filename =
      String(
        part.filename || ""
      ).trim();

    const attachmentId =
      part?.body?.attachmentId ||
      null;

    /*
     * Record actual Gmail attachments.
     */
    if (
      filename &&
      attachmentId
    ) {
      attachments.push({
        filename,
        mimeType:
          part.mimeType ||
          "application/octet-stream",
        attachmentId,
        size:
          part?.body?.size || 0,
      });
    }

    const mimeType =
      String(
        part.mimeType || ""
      ).toLowerCase();

    const bodyData =
      part?.body?.data;

    /*
     * Extract inline message body.
     */
    if (bodyData) {
      const decoded =
        decodeBase64Url(
          bodyData
        );

      if (
        mimeType ===
        "text/plain"
      ) {
        plainText +=
          `${decoded}\n`;
      } else if (
        mimeType ===
        "text/html"
      ) {
        htmlText +=
          `${decoded}\n`;
      }
    }

    /*
     * Gmail messages can contain nested MIME parts.
     */
    if (
      Array.isArray(
        part.parts
      )
    ) {
      part.parts.forEach(
        walk
      );
    }
  };

  walk(payload);

  const body =
    normalizeWhitespace(
      plainText ||
        htmlToText(htmlText)
    );

  return {
    body,
    attachments,
  };
};

/*
|--------------------------------------------------------------------------
| CREATE GMAIL API CLIENT
|--------------------------------------------------------------------------
*/

const createGmailClient = (
  connector
) => {
  if (!connector) {
    throw new Error(
      "Gmail connector is required."
    );
  }

  if (
    !connector.accessToken &&
    !connector.refreshToken
  ) {
    throw new Error(
      "Gmail connector has no usable tokens."
    );
  }

  const auth =
    createGmailOAuthClient({
      accessToken:
        connector.accessToken,
      refreshToken:
        connector.refreshToken,
      expiryDate:
        connector.expiryDate,
    });

  return google.gmail({
    version: "v1",
    auth,
  });
};

/*
|--------------------------------------------------------------------------
| BUILD SEARCH TERMS
|--------------------------------------------------------------------------
*/

const buildSearchTerms = (
  query = ""
) => {
  const stopWords =
    new Set([
      "a",
      "an",
      "and",
      "are",
      "about",
      "can",
      "could",
      "do",
      "does",
      "for",
      "from",
      "how",
      "i",
      "in",
      "is",
      "it",
      "me",
      "my",
      "of",
      "on",
      "please",
      "show",
      "tell",
      "the",
      "to",
      "what",
      "where",
      "which",
      "who",
      "with",
      "you",
    ]);

  return Array.from(
    new Set(
      String(query)
        .toLowerCase()
        .replace(
          /[^a-z0-9@._-]+/g,
          " "
        )
        .split(/\s+/)
        .map(
          (word) =>
            word.trim()
        )
        .filter(
          (word) =>
            word.length >= 3 &&
            !stopWords.has(
              word
            )
        )
        .slice(0, 12)
    )
  );
};

/*
|--------------------------------------------------------------------------
| SEARCH GMAIL
|--------------------------------------------------------------------------
*/

const searchGmailMessages =
  async ({
    connector,
    query,
    maxResults = 5,
  }) => {
    const gmail =
      createGmailClient(
        connector
      );

    const terms =
      buildSearchTerms(
        query
      );

    const searchQueries =
      [];

    /*
     * Normal keyword search.
     */
    if (
      terms.length > 0
    ) {
      searchQueries.push(
        terms.join(" ")
      );
    }

    /*
     * Preserve quoted phrases
     * when the user explicitly supplied them.
     */
    const quoted =
      String(query)
        .match(
          /"([^"]+)"/g
        )
        ?.map(
          (item) =>
            item
              .slice(1, -1)
              .trim()
        )
        .filter(Boolean);

    if (
      quoted?.length
    ) {
      searchQueries.unshift(
        quoted
          .slice(0, 2)
          .join(" ")
      );
    }

    /*
     * Fallback.
     */
    if (
      searchQueries.length ===
      0
    ) {
      searchQueries.push(
        "in:anywhere"
      );
    }

    let messages = [];
    let lastError = null;

    for (
      const gmailQuery of searchQueries
    ) {
      try {
        const result =
          await gmail.users.messages.list(
            {
              userId: GMAIL_USER,
              q: gmailQuery,
              maxResults,
            }
          );

        messages =
          result?.data?.messages ||
          [];

        if (
          messages.length > 0
        ) {
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (
      lastError &&
      messages.length === 0
    ) {
      throw lastError;
    }

    return {
      gmail,
      messages,
    };
  };

/*
|--------------------------------------------------------------------------
| GET FULL GMAIL MESSAGE
|--------------------------------------------------------------------------
*/

const getGmailMessage =
  async (
    gmail,
    id
  ) => {
    const result =
      await gmail.users.messages.get(
        {
          userId:
            GMAIL_USER,
          id,
          format: "full",
        }
      );

    const data =
      result?.data || {};

    const headers =
      data?.payload?.headers ||
      [];

    const extracted =
      extractBodyAndAttachments(
        data?.payload
      );

    return {
      id:
        data.id,

      threadId:
        data.threadId ||
        null,

      subject:
        findHeader(
          headers,
          "Subject"
        ) ||
        "(No subject)",

      from:
        findHeader(
          headers,
          "From"
        ) ||
        "Unknown sender",

      to:
        findHeader(
          headers,
          "To"
        ) || "",

      cc:
        findHeader(
          headers,
          "Cc"
        ) || "",

      date:
        findHeader(
          headers,
          "Date"
        ) || "",

      snippet:
        normalizeWhitespace(
          data.snippet || ""
        ),

      body:
        extracted.body,

      attachments:
        extracted.attachments,
    };
  };

/*
|--------------------------------------------------------------------------
| FIND RELEVANT EMAILS
|--------------------------------------------------------------------------
*/

const findRelevantGmailEmails =
  async ({
    connector,
    query,
    maxMessages = 5,
    maxCharsPerMessage = 7000,
  }) => {
    if (!connector) {
      return {
        context: null,
        sources: [],
      };
    }

    if (
      !query?.trim()
    ) {
      return {
        context: null,
        sources: [],
      };
    }

    const {
      gmail,
      messages,
    } =
      await searchGmailMessages({
        connector,
        query,
        maxResults:
          maxMessages,
      });

    const emails = [];
    const sources = [];

    for (
      const message of messages.slice(
        0,
        maxMessages
      )
    ) {
      try {
        const email =
          await getGmailMessage(
            gmail,
            message.id
          );

        const body =
          normalizeWhitespace(
            email.body ||
              email.snippet ||
              ""
          );

        const limitedBody =
          body.slice(
            0,
            maxCharsPerMessage
          );

        const attachmentText =
          email.attachments
            .length > 0
            ? `Attachments: ${email.attachments
                .map(
                  (
                    attachment
                  ) =>
                    attachment.filename
                )
                .join(", ")}`
            : "Attachments: None";

        emails.push(
          `EMAIL
Subject: ${email.subject}
From: ${email.from}
To: ${email.to || ""}
Date: ${email.date || ""}
${attachmentText}
Body:
${
  limitedBody ||
  "(No readable email body found.)"
}`
        );

        sources.push({
          id:
            email.id,

          threadId:
            email.threadId,

          subject:
            email.subject,

          from:
            email.from,

          date:
            email.date,

          snippet:
            email.snippet,

          attachments:
            email.attachments.map(
              (
                attachment
              ) => ({
                filename:
                  attachment.filename,
                mimeType:
                  attachment.mimeType,
                size:
                  attachment.size,
              })
            ),
        });
      } catch (error) {
        console.error(
          `Gmail message ${message.id} retrieval error:`,
          error
        );
      }
    }

    return {
      context:
        emails.length > 0
          ? emails.join(
              "\n\n====================\n\n"
            )
          : null,

      sources,
    };
  };

/*
|--------------------------------------------------------------------------
| SIMPLE CONTEXT WRAPPER
|--------------------------------------------------------------------------
*/

const getRelevantGmailContext =
  async (
    options
  ) => {
    return findRelevantGmailEmails(
      options
    );
  };

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createGmailClient,
  searchGmailMessages,
  getGmailMessage,
  findRelevantGmailEmails,
  getRelevantGmailContext,
};