import dns from "node:dns";
import authRoutes from "./routes/authRoutes.js";
import { Retell } from "retell-sdk";
import authMiddleware from "./middleware/authMiddleware.js";
import { sendFeedbackSMS } from "./services/twilioService.js";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import bookingRoutes from "./routes/bookingRoutes.js";
import Call from "./models/Call.js";
import Booking from "./models/Booking.js";
import FeedbackToken from "./models/FeedbackToken.js";
import {
  generateFeedbackToken,
  hashFeedbackToken,
} from "./utils/feedbackToken.js";
import crypto from "node:crypto";

dotenv.config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const retellClient = new Retell({
  apiKey: process.env.RETELL_API_KEY,
});


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
const PORT = process.env.PORT || 5000;


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
    ],
  })
);


app.use(express.json());
app.use("/api/bookings", bookingRoutes);
app.use("/api/auth", authRoutes);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth", authRoutes);


app.post("/api/test-sms", authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({
      success: false,
      message: "Not found",
    });
  }

  try {
    const { toNumber } = req.body;

    if (
      typeof toNumber !== "string" ||
      !/^\+[1-9]\d{7,14}$/.test(toNumber)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid international phone number",
      });
    }

    const message = await sendFeedbackSMS(
      toNumber,
      `${process.env.FRONTEND_URL}/feedback/test`
    );

    return res.json({
      success: true,
      message: "Twilio accepted the SMS request",
      messageSid: message.sid,
    });
  } catch (error) {
    console.error("Twilio test SMS failed:", {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo,
    });

    return res.status(500).json({
      success: false,
      message: "SMS could not be sent",
    });
  }
});




app.post("/api/feedback/create-link",authMiddleware, async (req, res) => {
  try {
    const { callId } = req.body;

    if (!callId || typeof callId !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid callId is required",
      });
    }

    const call = await Call.findOne({ callId });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    // Generate a secret token; store only its hash.
    const token = generateFeedbackToken();
    const tokenHash = hashFeedbackToken(token);

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await FeedbackToken.create({
      callId: call.callId,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is not configured",
      });
    }

    const feedbackUrl =
      `${frontendUrl.replace(/\/$/, "")}/feedback/${token}`;

    return res.status(201).json({
      success: true,
      feedbackUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("Feedback link creation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not create feedback link",
    });
  }
});


app.get("/api/feedback/:token", async (req, res) => {
  try {
    const token = req.params.token;

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback link",
      });
    }

    const tokenHash = hashFeedbackToken(token);

    const feedbackToken = await FeedbackToken.findOne({
      tokenHash,
      expiresAt: { $gt: new Date() },
      usedAt: null,
    });

    if (!feedbackToken) {
      return res.status(410).json({
        success: false,
        message: "This feedback link is expired or already used",
      });
    }

    return res.json({
      success: true,
      message: "Feedback link is valid",
      expiresAt: feedbackToken.expiresAt,
    });
  } catch (error) {
    console.error("Feedback token validation failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not validate feedback link",
    });
  }
});


app.post("/api/feedback/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const { rating, feedback = "" } = req.body;

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        success: false,
        message: "Invalid feedback link",
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be an integer from 1 to 5",
      });
    }

    if (typeof feedback !== "string" || feedback.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Feedback must be text of at most 1000 characters",
      });
    }

    const tokenHash = hashFeedbackToken(token);

    // Atomically claim the token so it cannot be submitted twice.
    const feedbackToken = await FeedbackToken.findOneAndUpdate(
      {
        tokenHash,
        expiresAt: { $gt: new Date() },
        usedAt: null,
      },
      { $set: { usedAt: new Date() } },
      { new: true }
    );

    if (!feedbackToken) {
      return res.status(410).json({
        success: false,
        message: "This feedback link is expired or already used",
      });
    }

    const call = await Call.findOneAndUpdate(
      { callId: feedbackToken.callId },
      {
        $set: {
          customerRating: rating,
          customerFeedback: feedback.trim(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!call) {
      // Do not leave a token consumed if its call record is missing.
      await FeedbackToken.updateOne(
        { _id: feedbackToken._id, usedAt: feedbackToken.usedAt },
        { $set: { usedAt: null } }
      );

      return res.status(404).json({
        success: false,
        message: "Call not found",
      });
    }

    return res.json({
      success: true,
      message: "Thank you for your feedback!",
    });
  } catch (error) {
    console.error("Feedback submission failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not save feedback",
    });
  }
});


app.get("/api/dashboard/call-activity",authMiddleware, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const dailyCounts = await Call.aggregate([
      {
        $match: {
          $or: [
            { startTime: { $gte: startDate, $lte: today } },
            {
              startTime: null,
              createdAt: { $gte: startDate, $lte: today },
            },
          ],
        },
      },
      {
        $project: {
          activityDate: { $ifNull: ["$startTime", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$activityDate",
            },
          },
          calls: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const countsByDate = Object.fromEntries(
      dailyCounts.map((item) => [item._id, item.calls])
    );

    const activity = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - i);

      const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      activity.push({
        date: dateKey,
        day: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
        calls: countsByDate[dateKey] || 0,
      });
    }

    res.json({ success: true, activity });
  } catch (error) {
    console.error("Call activity error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch call activity",
    });
  }
});


app.get("/api/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    const [
      totalCalls,
      totalBookings,
      confirmedBookings,
      pendingBookings,
    ] = await Promise.all([
      Call.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "pending" }),
    ]);

    res.json({
      success: true,
      stats: {
        totalCalls,
        totalBookings,
        confirmedBookings,
        pendingBookings,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
});

app.get("/api/dashboard/average-call-time",authMiddleware, async (req, res) => {
  try {
    const result = await Call.aggregate([
      {
        $match: {
          duration: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: "$duration" },
        },
      },
    ]);

    const averageSeconds = Math.round(
      result[0]?.averageDuration || 0
    );

    res.json({
      success: true,
      averageCallTimeSeconds: averageSeconds,
    });
  } catch (error) {
    console.error("Average call time error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to calculate average call time",
    });
  }
});


app.get("/api/dashboard/answer-rate",authMiddleware, async (req, res) => {
  try {
    const eligibleStatuses = ["ended", "not_connected", "error"];

    const [totalCalls, answeredCalls] = await Promise.all([
      Call.countDocuments({
        callStatus: { $in: eligibleStatuses },
      }),
      Call.countDocuments({
        callStatus: { $in: eligibleStatuses },
        duration: { $gt: 0 },
      }),
    ]);

    const answerRate =
      totalCalls > 0
        ? Math.round((answeredCalls / totalCalls) * 100)
        : null;

    res.json({
      success: true,
      answerRate,
      answeredCalls,
      totalCalls,
    });
  } catch (error) {
    console.error("Answer rate error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to calculate answer rate",
    });
  }
});



app.get("/api/dashboard/customer-satisfaction",authMiddleware, async (req, res) => {
  try {
    const [totalRatings, satisfiedRatings, ratingStats] =
      await Promise.all([
        Call.countDocuments({
          customerRating: { $gte: 1, $lte: 5 },
        }),

        Call.countDocuments({
          customerRating: { $gte: 4, $lte: 5 },
        }),

        Call.aggregate([
          {
            $match: {
              customerRating: { $gte: 1, $lte: 5 },
            },
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: "$customerRating" },
            },
          },
        ]),
      ]);

    const satisfactionScore =
      totalRatings > 0
        ? Math.round((satisfiedRatings / totalRatings) * 100)
        : null;

    const averageRating =
      ratingStats.length > 0
        ? Math.round(ratingStats[0].averageRating * 10) / 10
        : null;

    res.json({
      success: true,
      satisfactionScore,
      totalRatings,
      satisfiedRatings,
      averageRating,
    });
  } catch (error) {
    console.error("Customer satisfaction error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to calculate customer satisfaction",
    });
  }
});



app.post("/api/calls/:callId/feedback", (req, res) => {
  return res.status(410).json({
    success: false,
    message: "Please use the secure feedback link",
  });
});
  



app.get("/api/calls", authMiddleware, async (req, res) => {
  try {
    let calls = await Call.find().sort({ createdAt: -1 });

    // Check recent Retell calls for missing transcripts or bookings.
    for (const savedCall of calls.slice(0, 20)) {
      if (
        !savedCall.callId ||
        !savedCall.callId.startsWith("call_")
      ) {
        continue;
      }

      try {
        // If the reservation is already saved, don't create it again.
        const existingBooking = await Booking.findOne({
          retellCallId: savedCall.callId,
        });

        // Retrieve Retell data if the transcript or booking is missing.
        if (
          savedCall.transcript &&
          existingBooking &&
          savedCall.callStatus !== "in_progress"
        ) {
          continue;
        }

        const call = await retellClient.call.retrieve(
          savedCall.callId
        );

        console.log("RETELL CALL RECOVERY:", {
          callId: savedCall.callId,
          status: call.call_status,
          hasTranscript: Boolean(call.transcript),
          hasAnalysis: Boolean(call.call_analysis),
        });

        // Update the call history.
        const updates = {};

        if (call.call_status === "ended") {
          updates.callStatus = "ended";
        }

        if (call.start_timestamp) {
          updates.startTime = new Date(call.start_timestamp);
        }

        if (call.end_timestamp) {
          updates.endTime = new Date(call.end_timestamp);
        }

        if (typeof call.duration_ms === "number") {
          updates.duration = Math.round(call.duration_ms / 1000);
        }

        if (call.transcript) {
          updates.transcript = call.transcript;
        }

        if (call.call_analysis?.call_summary) {
          updates.summary = call.call_analysis.call_summary;
        }

        if (Object.keys(updates).length > 0) {
          await Call.updateOne(
            { callId: savedCall.callId },
            { $set: updates }
          );
        }

        // Create a pending booking from completed call analysis.
        const extracted =
          call.call_analysis?.custom_analysis_data;

        if (
          call.call_status === "ended" &&
          extracted &&
          !existingBooking
        ) {
          const customerName = extracted.customer_name;
          const phone = extracted.customer_phone;
          const bookingDate = extracted.booking_date;
          const bookingTime = extracted.booking_time;
          const partySize = Number(extracted.party_size);
          const specialRequests =
            extracted.special_requests || "";

          const validName =
            typeof customerName === "string" &&
            customerName.trim().length > 0;

          const validPhone =
            typeof phone === "string" &&
            phone.trim().length > 0;

          const validTime =
            typeof bookingTime === "string" &&
            bookingTime.trim().length > 0;

          const validPartySize =
            Number.isInteger(partySize) && partySize >= 1;

          // Accept a date that JavaScript can parse.
          const parsedDate = bookingDate
            ? new Date(bookingDate)
            : null;

          const validDate =
            parsedDate &&
            !Number.isNaN(parsedDate.getTime());

          console.log("BOOKING EXTRACTION CHECK:", {
            callId: savedCall.callId,
            validName,
            validPhone,
            validDate: Boolean(validDate),
            validTime,
            validPartySize,
          });

          if (
            validName &&
            validPhone &&
            validDate &&
            validTime &&
            validPartySize
          ) {
            const booking = await Booking.findOneAndUpdate(
              { retellCallId: savedCall.callId },
              {
                $setOnInsert: {
                  retellCallId: savedCall.callId,
                  customerName: customerName.trim(),
                  phone: phone.trim(),
                  bookingDate: parsedDate,
                  bookingTime: bookingTime.trim(),
                  partySize,
                  specialRequests:
                    typeof specialRequests === "string"
                      ? specialRequests
                      : "",
                  status: "pending",
                },
              },
              {
                upsert: true,
                returnDocument: "after",
                runValidators: true,
                setDefaultsOnInsert: true,
              }
            );

            console.log("PENDING BOOKING SAVED:", {
              callId: savedCall.callId,
              bookingId: booking?._id,
              status: booking?.status,
            });
          } else {
            console.log(
              "Booking not created: reservation details are incomplete or invalid.",
              savedCall.callId
            );
          }
        }
      } catch (retellError) {
        console.error(
          "Could not recover Retell call or booking:",
          savedCall.callId,
          retellError.message
        );
      }
    }

    // Return the latest call records.
    calls = await Call.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: calls.length,
      calls,
    });
  } catch (error) {
    console.error("Error fetching calls:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch calls",
    });
  }
});






app.post("/api/retell/webhook", async (req, res) => {
  try {
    

const signature = req.headers["x-retell-signature"];

console.log("Retell signature received:", Boolean(signature));


let signatureIsValid = false;

if (signature && process.env.RETELL_API_KEY) {
  signatureIsValid = await Retell.verify(
    JSON.stringify(req.body),
    process.env.RETELL_API_KEY,
    signature
  );
}

if (!signatureIsValid) {
  console.log("DEBUG: Signature verification failed");
  console.warn("Rejected Retell webhook: invalid signature");

  return res.status(401).json({
    success: false,
    message: "Invalid webhook signature",
  });
}

console.log("DEBUG: Signature verification passed");

const event = req.body;
console.log("RETELL EVENT TYPE:", event.event);
console.log(
  "RETELL WEBHOOK PAYLOAD:",
  JSON.stringify(req.body, null, 2)
);
console.log(
  "RETELL CALL ID:",
  event.call?.call_id || event.data?.call?.call_id
);

    const call = event.call || event.data?.call;

    if (!call?.call_id) {
      return res.status(400).json({
        success: false,
        message: "Missing Retell call ID",
      });
    }

    const eventType = event.event || "unknown";
    const updates = {};
    let savedCall = null;

    if (call.from_number) {
      updates.callerNumber = call.from_number;
    }

    if (eventType === "call_started") {
      updates.callStatus = "in_progress";
      updates.startTime = call.start_timestamp
        ? new Date(call.start_timestamp)
        : new Date();
    }

    if (eventType === "call_ended" || eventType === "call_analyzed") {
      updates.callStatus = call.call_status || "ended";

      if (call.start_timestamp) {
        updates.startTime = new Date(call.start_timestamp);
      }

      if (call.end_timestamp) {
        updates.endTime = new Date(call.end_timestamp);
      }

      if (typeof call.duration_ms === "number") {
        updates.duration = Math.round(call.duration_ms / 1000);
      }

      if (call.transcript) {
        updates.transcript = call.transcript;
      }

      if (call.call_analysis?.call_summary) {
        updates.summary = call.call_analysis.call_summary;
      }
    }

    savedCall = await Call.findOneAndUpdate(
  { callId: call.call_id },
  {
    $set: updates,
    $setOnInsert: { callId: call.call_id },
  },
  { upsert: true, returnDocument: "after", runValidators: true }
);
console.log("SAVED CALL CHECK:", {
  callId: savedCall?.callId,
  status: savedCall?.callStatus,
  hasTranscript: Boolean(savedCall?.transcript),
  hasSummary: Boolean(savedCall?.summary),
  duration: savedCall?.duration,
});


    // Send one feedback SMS after Retell finishes call analysis.
    if (eventType === "call_analyzed" && savedCall) {
      try {
        // Skip if an SMS has already been recorded for this call.
        if (!savedCall.feedbackSmsSentAt) {
          const customerPhone = call.from_number;

          if (
            typeof customerPhone === "string" &&
            /^\+[1-9]\d{7,14}$/.test(customerPhone)
          ) {
            const token = generateFeedbackToken();
            const tokenHash = hashFeedbackToken(token);
            const expiresAt = new Date(
              Date.now() + 48 * 60 * 60 * 1000
            );

            await FeedbackToken.create({
              callId: call.call_id,
              tokenHash,
              expiresAt,
            });

            const frontendUrl = process.env.FRONTEND_URL;

            if (!frontendUrl) {
              throw new Error("FRONTEND_URL is not configured");
            }

            const feedbackUrl =
              `${frontendUrl.replace(/\/$/, "")}/feedback/${token}`;

            await sendFeedbackSMS(customerPhone, feedbackUrl);

            savedCall.feedbackSmsSentAt = new Date();
            await savedCall.save();

            console.log(
              "Feedback SMS sent for call:",
              call.call_id
            );
          } else {
            console.log(
              "Feedback SMS skipped: caller number is missing or invalid"
            );
          }
        }
      } catch (smsError) {
        console.error(
          "Feedback SMS failed for call:",
          call.call_id,
          smsError.message
        );
      }
    }


    // Create a booking only after Retell finishes call analysis.
    if (eventType === "call_analyzed") {
      const extracted =
        call.call_analysis?.custom_analysis_data || {};
        console.log(
  "Retell custom analysis fields:",
  Object.keys(extracted)
);
console.log("Retell booking data:", {
  customerName: extracted.customer_name,
  bookingDate: extracted.booking_date,
  bookingTime: extracted.booking_time,
  partySize: extracted.party_size,
  customerPhonePresent: Boolean(
    extracted.customer_phone || call.from_number
  ),
});

      const customerName = extracted.customer_name;
      const phone = extracted.customer_phone || call.from_number;
      console.log("Extracted phone format check:", {
  isString: typeof phone === "string",
  length: typeof phone === "string" ? phone.length : null,
  startsWithPlus: typeof phone === "string" && phone.trim().startsWith("+"),
  matchesInternationalFormat:
    typeof phone === "string" &&
    /^\+[1-9]\d{7,14}$/.test(phone.trim()),
});
      console.log("Phone source check:", {
  extractedPhonePresent: Boolean(extracted.customer_phone),
  callerNumberPresent: Boolean(call.from_number),
});
      const isValidPhone =
  typeof phone === "string" &&
  /^\+[1-9]\d{7,14}$/.test(phone.trim());
      const bookingDate = extracted.booking_date;
      const bookingTime = extracted.booking_time;
      const partySize = Number(extracted.party_size);
      const specialRequests = extracted.special_requests || "";

      console.log("Booking validation:", {
  customerNameValid:
    typeof customerName === "string" && customerName.trim().length > 0,
  phoneValid: isValidPhone,
  bookingDateValid: Boolean(bookingDate),
  bookingTimeValid: Boolean(bookingTime),
  partySizeValid:
    Number.isInteger(partySize) && partySize >= 1,
});

console.log("BOOKING EXTRACTION CHECK:", {
  callId: call.call_id,
  eventType,
  hasCustomerName: Boolean(customerName),
  hasPhone: Boolean(phone),
  isValidPhone,
  bookingDate,
  bookingTime,
  partySize,
});

      // Do not save incomplete reservation requests.
      if (
        typeof customerName === "string" &&
        customerName.trim() &&
        isValidPhone &&
        bookingDate &&
        bookingTime &&
        Number.isInteger(partySize) &&
        partySize >= 1
      ) {
        const parsedDate = new Date(`${bookingDate}T00:00:00.000Z`);

        if (!Number.isNaN(parsedDate.getTime())) {
          await Booking.findOneAndUpdate(
            { retellCallId: call.call_id },
            {
              $setOnInsert: {
                retellCallId: call.call_id,
                customerName: customerName.trim(),
                phone: phone.trim(),
                bookingDate: parsedDate,
                bookingTime: String(bookingTime),
                partySize,
                specialRequests:
                  typeof specialRequests === "string"
                    ? specialRequests
                    : "",
                status: "pending",
              },
            },
            {
              upsert: true,
              new: true,
              runValidators: true,
              setDefaultsOnInsert: true,
            }
          );

          console.log(
            "Booking processed for Retell call:",
            call.call_id
          );
        } else {
          console.log("Booking skipped: invalid booking date");
        }
      } else {
        console.log(
          "Booking skipped: required reservation details are missing"
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Retell webhook error:", error);
    return res.status(500).json({ success: false });
  }
});



app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Voice AI Receptionist Backend is running!",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is healthy",
  });
});

app.get("/api/retell/agent-status",authMiddleware, async (req, res) => {
  try {
    const agentId = "agent_76db0f126fc885bf9a5374d855";

    if (!process.env.RETELL_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "Retell API key is not configured",
      });
    }

    const response = await fetch(
      `https://api.retellai.com/get-agent/${agentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RETELL_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: "Failed to fetch Retell agent details",
      });
    }

    res.json({
      success: true,
      agent: {
        agentId: data.agent_id,
        name: data.agent_name,
        lastModified: data.last_modification_timestamp ?? null,
      },
    });
  } catch (error) {
    console.error("Retell agent status error:", error.message);

    res.status(500).json({
      success: false,
      message: "Unable to connect to Retell",
    });
  }
});

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from backend/.env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
  }
}

startServer();
