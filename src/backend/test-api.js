// test-api.js
import fetch from "node-fetch"; // npm install node-fetch if not installed

const BASE_URL = "http://localhost:3001";
const FIREBASE_WEB_API_KEY = "AIzaSyAzHEhRJ5ZtGPJjH77-jO4X5TqxKMBJBYc"; // Replace with yours
const ADMIN_EMAIL = "admin@system.com";
const ADMIN_PASSWORD = "admin@system.com";

let token = "";

async function login() {
  console.log("🔐 Logging in to Firebase...");
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true,
      }),
    },
  );
  const data = await res.json();
  if (!data.idToken) throw new Error("Login failed: " + JSON.stringify(data));
  token = data.idToken;
  console.log("✅ Token acquired.");
}

async function testEndpoint(method, endpoint, body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    const data = await res.json();
    console.log(`${method} ${endpoint} -> ${res.status} ${res.statusText}`);
    if (res.status >= 400) console.error("   ❌ Error:", data);
    else
      console.log("   ✅ Success:", JSON.stringify(data).slice(0, 100) + "...");
    return data;
  } catch (err) {
    console.error(`❌ Failed to fetch ${endpoint}:`, err.message);
  }
}

async function runTests() {
  try {
    await login();

    console.log("\n🧪 Running API Tests...\n");

    // 1. Verify Auth
    await testEndpoint("POST", "/api/auth/verify", { token });

    // 2. Get Fund
    await testEndpoint("GET", "/api/fund");

    // 3. Create an Order
    await testEndpoint("POST", "/api/orders/create", {
      type: "income",
      description: "Auto-test order",
      items: [{ description: "Test Item", quantity: 1, unitPrice: 100 }],
    });

    // 4. List Orders
    await testEndpoint("GET", "/api/orders");

    // 5. Dashboard Stats
    await testEndpoint("GET", "/api/dashboard/stats");

    console.log("\n✅ All tests completed.");
  } catch (error) {
    console.error("❌ Test suite failed:", error.message);
  }
}

runTests();
