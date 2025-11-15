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
    const leaveEntry = await req.json();

    // Get existing leave
    const existingLeave = await store.get("leave", { type: "json" }) || [];

    // Add new entry with generated ID
    const newEntry = {
      ...leaveEntry,
      id: Date.now() + Math.random(),
    };

    const updatedLeave = [...existingLeave, newEntry];

    // Save updated leave
    await store.setJSON("leave", updatedLeave);

    return new Response(JSON.stringify({ success: true, entry: newEntry }), {
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
  path: "/.netlify/functions/leave-add",
};