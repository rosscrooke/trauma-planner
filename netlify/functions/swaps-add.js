import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const store = getStore("trauma-planner");
    const { weekDay, swap } = await req.json();

    // Get existing swaps
    const existingSwaps = await store.get("swaps", { type: "json" }) || {};

    // Update swaps
    existingSwaps[weekDay] = swap;

    // Save updated swaps
    await store.setJSON("swaps", existingSwaps);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
};

export const config = {
  path: "/.netlify/functions/swaps-add",
};