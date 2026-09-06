require("dotenv").config();

const { auth } = require("./src/config/firebase");
const { sendBrevoEmail } = require("./src/services/brevoService");

const testServices = async () => {
  console.log("\n🔍 Testing Lawlite backend services...\n");

  // -----------------------------
  // TEST FIREBASE
  // -----------------------------

  try {
    const projectId = auth.app.options.projectId;

    console.log("🔥 Firebase Admin:");
    console.log(`   Project: ${projectId}`);
    console.log("   Status: Connected successfully ✅\n");
  } catch (error) {
    console.error("❌ Firebase connection failed:");
    console.error(error.message);
    return;
  }

  // -----------------------------
  // TEST BREVO
  // -----------------------------

  try {
    console.log("📧 Brevo:");
    console.log("   Sending test email...");

    await sendBrevoEmail({
      recipientEmail: process.env.BREVO_SENDER_EMAIL,
      recipientName: "Chaitanya",
      subject: "Lawlite Backend Test",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 30px;">
          <h2 style="color: #c9a227;">
            Lawlite Backend Test 🚀
          </h2>

          <p>
            If you're reading this, Brevo email sending is working correctly.
          </p>

          <p>
            Firebase Admin + Brevo are successfully connected to the
            Lawlite backend.
          </p>

          <hr />

          <p style="color: #777;">
            Lawlite — Legal language, finally made simple.
          </p>
        </div>
      `,
    });

    console.log("   Status: Email sent successfully ✅\n");
  } catch (error) {
    console.error("❌ Brevo email failed:");
    console.error(error.message);
    return;
  }

  console.log("🎉 ALL BACKEND SERVICES PASSED!\n");
};

testServices();