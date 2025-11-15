import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  try {
    const store = getStore("trauma-planner");
    const overrides = await store.get("overrides", { type: "json" }) || {
      packhamClarke: {},
      bakerBick: {}
    };

    return new Response(JSON.stringify({ overrides }), {
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
  path: "/.netlify/functions/overrides-get",
};