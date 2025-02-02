const jwt = require("jsonwebtoken");

exports.getUserEmailFromEvent = (event) => {
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid token format");
  }

  const token = authHeader.split(" ")[1];
  console.log("Extracted token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    console.log("Decoded token:", decoded);

    if (!decoded.email) {
      throw new Error("Token does not contain required claims");
    }

    return decoded.email;
  } catch (error) {
    console.error("Token verification error:", error.message);
    throw new Error("Invalid token");
  }
};
