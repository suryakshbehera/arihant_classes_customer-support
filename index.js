import express from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import dialogflow from "@google-cloud/dialogflow";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sessionClient = new dialogflow.SessionsClient();
const projectId = process.env.DIALOGFLOW_PROJECT_ID;

/**
 * ✅ Indian phone validation
 * Starts with 6–9, exactly 10 digits
 */
function isValidIndianPhone(phone) {
  if (!phone) return false;
  const clean = phone.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(clean);
}


app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.Body;
    const from = req.body.From;

    // new two line for checking the incoming msg
    console.log("Incoming message:", userMessage);
    console.log("From", from);

    if (!userMessage) {
      return res.sendStatus(200);
    }

    const sessionPath = sessionClient.projectAgentSessionPath(
      projectId,
      from.replace("whatsapp:", "")
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: userMessage,
          languageCode: "en",
        },
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    const reply =
      result.fulfillmentText || "Sorry, I didn’t understand that.";

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: from,
      body: reply,
    });

    res.status(200).end();
  } catch (error) {
    console.error("Webhook Error:", error);
    res.sendStatus(500);
  }
});

/**
* 🔥 PHONE VALIDATION (OPTION 1)
* Intercept Dialogflow weakness here
*/
if (result.intent.displayName === "Lead_Capture_Phone") {
  const phoneParam = result.parameters?.phone || "";

  if (!isValidIndianPhone(phoneParam)) {
   reply ="❗ Please enter a valid 10-digit WhatsApp number.\nExample: 9876543210";
  }
}

app.get("/", (req, res) => {
  res.send("WhatsApp Dialogflow middleware running");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
