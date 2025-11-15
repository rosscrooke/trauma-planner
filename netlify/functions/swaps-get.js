import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore("trauma-planner");
    const swaps = await store.get("swaps", { type: "json" }) || {};

    return new Response(JSON.stringify({ swaps }), {
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
  path: "/.netlify/functions/swaps-get",
};