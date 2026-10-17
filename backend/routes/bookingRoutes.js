
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// GET: Retrieve all bookings
router.get("/", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
    });
  }
});

// POST: Create a booking
router.post("/",authMiddleware, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      bookingDate,
      bookingTime,
      partySize,
      specialRequests,
    } = req.body;

    if (
      !customerName?.trim() ||
      !phone?.trim() ||
      !bookingDate ||
      !bookingTime ||
      partySize === undefined ||
      partySize === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name, phone, date, time, and party size are required",
      });
    }

    const parsedDate = new Date(bookingDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking date",
      });
    }

    const size = Number(partySize);

    if (!Number.isInteger(size) || size < 1) {
      return res.status(400).json({
        success: false,
        message: "Party size must be a positive whole number",
      });
    }

    // Prevent another active booking at the same date and time.
    const startOfDay = new Date(parsedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingBooking = await Booking.findOne({
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      bookingTime: String(bookingTime).trim(),
      status: { $in: ["pending", "confirmed"] },
    });

    if (existingBooking) {
      return res.status(409).json({
        success: false,
        message:
          "This time slot already has an active booking. Please choose another time.",
      });
    }

    const booking = await Booking.create({
      customerName: customerName.trim(),
      phone: phone.trim(),
      bookingDate: parsedDate,
      bookingTime,
      partySize: size,
      specialRequests: specialRequests || "",
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Booking request created",
      booking,
    });
  } catch (error) {
    console.error("Create booking error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create booking",
    });
  }
});

// PATCH: Update a booking's status
router.patch("/:id/status",authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID",
      });
    }

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status",
      });
    }

    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update booking",
    });
  }
});

export default router;
