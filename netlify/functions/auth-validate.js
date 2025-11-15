import crypto from 'crypto';

// In production, store these securely in environment variables
// For now, we'll use a simple hash comparison for the demo user
const DEMO_USERS = {
  'lynn.hutchings@gmail.com': {
    // Password: MK (hashed with SHA-256 for basic security)
    passwordHash: '6b51d431df5d7f141cbececcf79edf3dd861c3b4069f0b11661a3eefacbba918',
    name: 'Lynn Hutchings',
    role: 'admin'
  }
};

const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

export default async (req, context) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const { email, password } = await req.json();

    const user = DEMO_USERS[email];

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const passwordHash = hashPassword(password);

    if (passwordHash !== user.passwordHash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Generate a simple session token (in production, use JWT or similar)
    const sessionToken = crypto.randomBytes(32).toString('hex');

    return new Response(JSON.stringify({
      success: true,
      user: {
        email,
        name: user.name,
        role: user.role
      },
      token: sessionToken
    }), {
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
  path: "/.netlify/functions/auth-validate",
};