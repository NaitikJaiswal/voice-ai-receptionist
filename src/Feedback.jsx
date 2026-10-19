
import { useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const token = window.location.pathname.split("/").pop();

  async function handleSubmit(event) {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setMessage("Please select a rating from 1 to 5.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/feedback/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, feedback }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit feedback.");
      }

      setStatus("success");
      setMessage("Thank you! Your feedback has been submitted.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow">
          <h1 className="text-2xl font-bold text-slate-800">
            Thank you!
          </h1>
          <p className="mt-3 text-slate-600">{message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow"
      >
        <h1 className="text-2xl font-bold text-slate-800">
          Rate your experience
        </h1>
        <p className="mt-2 text-slate-600">
          Thank you for calling us. How was your experience?
        </p>

        <div className="my-6 flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-pressed={rating === value}
              className={`text-3xl ${
                rating >= value ? "text-amber-400" : "text-slate-300"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <label
          htmlFor="feedback"
          className="block font-medium text-slate-700"
        >
          Additional comments (optional)
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Tell us how we did..."
          className="mt-2 w-full rounded-lg border border-slate-300 p-3"
        />

        {message && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "loading" || rating === 0}
          className="mt-5 w-full rounded-lg bg-orange-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {status === "loading" ? "Submitting..." : "Submit feedback"}
        </button>
      </form>
    </main>
  );
}
