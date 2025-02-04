const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken"); // Ensure this is installed
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3(); // Initialize S3 client

const TABLE_NAME = process.env.TABLE_NAME;
const JWT_SECRET = process.env.JWT_SECRET; // Ensure this is set in your Lambda environment
const PROFILE_IMAGE_BUCKET = process.env.BUCKET_NAME;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2));

  try {
    // Extract token from headers
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Missing or invalid token format" }),
      };
    }

    const token = authHeader.split(" ")[1];
    console.log("Extracted token:", token);

    // Verify token
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not set in environment variables");
    }

    const decoded = jwt.verify(token, JWT_SECRET); // Verify the token
    console.log("Decoded token:", decoded);

    // Ensure the token contains the email claim
    if (!decoded.email) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: "Token does not contain required claims",
        }),
      };
    }

    // Fetch user data from DynamoDB
    const user = await dynamoDB
      .get({ TableName: TABLE_NAME, Key: { email: decoded.email } })
      .promise();

    if (!user.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    // Generate a pre-signed URL if a profile image exists
    if (user.Item.profileImage) {
      // user.Item.profileImage = decodeURIComponent(user.Item.profileImage);
      const preSignedUrl = s3.getSignedUrl("getObject", {
        Bucket: PROFILE_IMAGE_BUCKET,
        Key: user.Item.profileImage,
        Expires: 60 * 5, // URL expires in 5 minutes
      });
      user.Item.profileImageUrl = preSignedUrl; // Include the pre-signed URL in the response
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(user.Item),
    };
  } catch (error) {
    console.error("Error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }

    if (error.name === "TokenExpiredError") {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Token expired" }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
