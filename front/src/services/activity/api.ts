import { API_URL } from "../../api/api.js";

const ENDPOINT = "/scitylana/event";

export async function sendActivityBatch(payload: unknown, isUnloading = false): Promise<void> {
  const jsonPayload = JSON.stringify(payload);
  const endpointUrl = `${API_URL}${ENDPOINT}`;

  if (isUnloading) {
    let sent = false;
    if (navigator.sendBeacon) {
      try {
        const blob = new Blob([jsonPayload], { type: "application/json" });
        sent = navigator.sendBeacon(endpointUrl, blob);
      } catch {
        // swallow
      }
    }

    if (!sent) {
      try {
        await fetch(endpointUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: jsonPayload,
          keepalive: true,
        });
      } catch {
        // best-effort on unload
      }
    }

    return;
  }

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: jsonPayload,
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
}

export default sendActivityBatch;
