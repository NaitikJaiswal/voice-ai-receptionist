
import mongoose from "mongoose";

const feedbackTokenSchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Automatically remove expired tokens from MongoDB.
feedbackTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

export default mongoose.model("FeedbackToken", feedbackTokenSchema);
