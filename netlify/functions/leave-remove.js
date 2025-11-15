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
    const { id } = await req.json();

    // Get existing leave
    const existingLeave = await store.get("leave", { type: "json" }) || [];

    // Remove entry by ID
    const updatedLeave = existingLeave.filter(entry => entry.id !== id);

    // Save updated leave
    await store.setJSON("leave", updatedLeave);

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
  path: "/.netlify/functions/leave-remove",
};