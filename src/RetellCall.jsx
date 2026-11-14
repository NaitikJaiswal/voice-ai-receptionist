
import { useEffect, useRef, useState } from "react";
import { RetellClient } from "retell-client-js-sdk";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const retellClient = new RetellClient({
  key: "unused",
  fetch: (url, init = {}) => {
    const token = localStorage.getItem("token");

    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);

    const proxyUrl =
      `${API_URL}/retell${new URL(String(url)).pathname}`;

    return fetch(proxyUrl, {
      ...init,
      headers,
    });
  },
});

export default function RetellCall() {
  const callRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const startCall = async () => {
    try {
      setError("");
      setStatus("connecting");

      if (!localStorage.getItem("token")) {
        throw new Error("Please log in again.");
      }

      const call = retellClient.createWebCall({
        agent_id:
          import.meta.env.VITE_RETELL_AGENT_ID ||
          "agent_76db0f126fc885bf9a5374d855",

        hooks: {
          onStatus: (newStatus) => setStatus(newStatus),

          onEnd: () => {
            callRef.current = null;
            setStatus("ended");
          },

          onError: (err) => {
            console.error("Retell call error:", err);
            setError(err.message || "Call failed.");
            setStatus("error");
          },
        },
      });

      callRef.current = call;

      await call.ready;
      setStatus("live");
    } catch (err) {
      console.error("Unable to start Retell call:", err);
      setError(err.message || "Unable to start call.");
      setStatus("error");
      callRef.current = null;
    }
  };

  const endCall = async () => {
    try {
      if (callRef.current) {
        await callRef.current.end();
        callRef.current = null;
      }

      setStatus("ended");
    } catch (err) {
      console.error("Unable to end call:", err);
      setError(err.message || "Unable to end call.");
    }
  };

  useEffect(() => {
    return () => {
      callRef.current?.end().catch(console.error);
      callRef.current = null;
    };
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-xl font-bold">
        Voice AI Receptionist
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        Talk directly with your AI receptionist.
      </p>

      <p className="mt-4 text-sm font-medium">
        Status: {status}
      </p>

      {status === "live" ? (
        <button
          onClick={endCall}
          className="mt-4 rounded-xl bg-red-600 px-5 py-3 text-white"
        >
          End Call
        </button>
      ) : (
        <button
          onClick={startCall}
          disabled={status === "connecting"}
          className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 text-white disabled:opacity-50"
        >
          {status === "connecting"
            ? "Connecting..."
            : "Start AI Call"}
        </button>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
