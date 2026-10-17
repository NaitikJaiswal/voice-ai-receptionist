
import twilio from "twilio";
import "dotenv/config";

export async function sendFeedbackSMS(toNumber, feedbackUrl) {

  if (process.env.SMS_MODE === "mock") {
  console.log("📩 MOCK SMS — no real SMS sent");
  console.log("To:", toNumber);
  console.log("Feedback link:", feedbackUrl);

  return {
    sid: "MOCK_SMS",
    status: "simulated",
  };
}
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

  console.log("Twilio configuration loaded:", {
  accountSid: Boolean(accountSid),
  authToken: Boolean(authToken),
  fromNumber: Boolean(fromNumber),
});

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("Twilio environment variables are missing");
  }

  if (!/^\+[1-9]\d{7,14}$/.test(toNumber)) {
    throw new Error("Customer phone number must use international format");
  }

  const client = twilio(accountSid, authToken);

  const message = await client.messages.create({
    from: fromNumber,
    to: toNumber,
    body:
      `Thank you for calling us! Please rate your experience here: ${feedbackUrl}. ` +
      "This link expires in 48 hours. Reply STOP to opt out.",
  });

  console.log("Twilio accepted SMS. Message SID:", message.sid);
  return message;
}
