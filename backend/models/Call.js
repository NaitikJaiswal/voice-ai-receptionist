
import mongoose from "mongoose";

const callSchema = new mongoose.Schema(
  {
    // Account that owns this call
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    callId: {
      type: String,
      required: true,
      unique: true,
    },

    callerNumber: {
      type: String,
      default: "",
    },

    callStatus: {
      type: String,
      default: "unknown",
    },

    startTime: {
      type: Date,
      default: null,
    },

    endTime: {
      type: Date,
      default: null,
    },

    duration: {
      type: Number,
      default: 0,
    },

    transcript: {
      type: String,
      default: "",
    },

    summary: {
      type: String,
      default: "",
    },

    customerRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },

    customerFeedback: {
      type: String,
      default: "",
    },

    feedbackSmsSentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Call", callSchema);
