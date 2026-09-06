require("dotenv").config();

const sendBrevoEmail = async ({
  recipientEmail,
  recipientName,
  subject,
  htmlContent,
}) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing from .env");
  }

  if (!process.env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is missing from .env");
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },

    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "Lawlite",
        email: process.env.BREVO_SENDER_EMAIL,
      },

      to: [
        {
          email: recipientEmail,
          name: recipientName || recipientEmail,
        },
      ],

      subject,
      htmlContent,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Brevo API Error:", data);

    throw new Error(
      data?.message || "Failed to send email through Brevo"
    );
  }

  return data;
};

module.exports = {
  sendBrevoEmail,
};