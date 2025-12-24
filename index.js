import express from "express";
import dotenv from "dotenv";
import twilio from "twilio";
import dialogflow from "@google-cloud/dialogflow";

dotenv.config();

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const parameters = result.parameters?.fields || {};
const phoneRaw = parameters.phone?.stringValue || "";
const normalizedPhone = phoneRaw.replace(/\D/g, "");
const isValidPhone = /^[6-9]\d{9}$/.test(normalizedPhone);

let reply = result.fulfillmentText || "Sorry, I didn’t understand that.";

if (result.intent.displayName === "5_Lead_capture_Phone") {
  if (!isValidPhone) {
    reply = "❌ Invalid mobile number.\nPlease enter a valid 10 digit Indian mobile number.";
  }
}


const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sessionClient = new dialogflow.SessionsClient();
const projectId = process.env.DIALOGFLOW_PROJECT_ID;


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



app.get("/", (req, res) => {
  res.send("WhatsApp Dialogflow middleware running");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
