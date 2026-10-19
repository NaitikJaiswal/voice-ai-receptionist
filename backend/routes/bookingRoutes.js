
import express from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Every account accesses strictly its own bookings.
const getBookingFilter = (user) => {
  return { userId: user.id };
};

// GET: Retrieve bookings for the logged-in account
router.get("/", authMiddleware, async (req, res) => {
  try {
    const filter = getBookingFilter(req.user);

    const bookings = await Booking.find(filter).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Retrieve bookings error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to retrieve bookings",
    });
  }
});

// POST: Create a booking for the logged-in account
router.post("/", authMiddleware, async (req, res) => {
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

    const normalizedTime = String(bookingTime).trim();

    // Check for an active booking in this account.
    const startOfDay = new Date(parsedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingBooking = await Booking.findOne({
      ...getBookingFilter(req.user),
      bookingDate: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      bookingTime: normalizedTime,
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
      userId: req.user.id,
      customerName: customerName.trim(),
      phone: phone.trim(),
      bookingDate: parsedDate,
      bookingTime: normalizedTime,
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
router.patch("/:id/status", authMiddleware, async (req, res) => {
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

    // Regular users can update only their own bookings.
    // Admins can update any booking.
    const booking = await Booking.findOneAndUpdate(
      {
        _id: id,
        ...getBookingFilter(req.user),
      },
      { status },
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      booking,
    });
  } catch (error) {
    console.error("Update booking error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update booking",
    });
  }
});

export default router;
