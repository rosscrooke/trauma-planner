import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore("trauma-planner");

    // Get all data from blobs
    const leave = await store.get("leave", { type: "json" }) || [];
    const swaps = await store.get("swaps", { type: "json" }) || {};
    const overrides = await store.get("overrides", { type: "json" }) || { packhamClarke: {}, bakerBick: {} };

    return new Response(JSON.stringify({
      leave: {
        count: leave.length,
        data: leave
      },
      swaps: {
        count: Object.keys(swaps).length,
        data: swaps
      },
      overrides: {
        packhamClarkeCount: Object.keys(overrides.packhamClarke || {}).length,
        bakerBickCount: Object.keys(overrides.bakerBick || {}).length,
        data: overrides
      }
    }, null, 2), {
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
  path: "/.netlify/functions/debug-blobs",
};