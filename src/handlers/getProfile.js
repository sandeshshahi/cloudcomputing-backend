const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

const TABLE_NAME = process.env.TABLE_NAME;
const JWT_SECRET = process.env.JWT_SECRET;
const PROFILE_IMAGE_BUCKET = process.env.BUCKET_NAME;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  //  Handle CORS Preflight (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "CORS preflight successful" }),
    };
  }

  try {
    console.log("Extracting token...");
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
    if (!JWT_SECRET)
      throw new Error("JWT_SECRET is missing in environment variables");

    console.log("Verifying token...");
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("Decoded token:", decoded);

    if (!decoded.email) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: "Token does not contain required claims",
        }),
      };
    }

    // Fetch user from DynamoDB
    console.log("Fetching user from DynamoDB...");
    const user = await dynamoDB
      .get({ TableName: TABLE_NAME, Key: { email: decoded.email } })
      .promise();
    console.log("DynamoDB response:", user);

    if (!user.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    // Generate pre-signed URL

    console.log("Generating pre-signed URL...");
    let profileImageUrl = null; // Initialize as null
    if (user.Item.profileImage) {
      profileImageUrl = s3.getSignedUrl("getObject", {
        Bucket: PROFILE_IMAGE_BUCKET,
        Key: user.Item.profileImage, // Use the S3 key stored in DynamoDB
        Expires: 300, // 5 minutes
      });
      console.log("Generated pre-signed URL:", profileImageUrl);
      // user.Item.profileImageUrl = preSignedUrl;
      // console.log("Generated pre-signed URL:", preSignedUrl);
    }

    // Create a response object to avoid modifying the original user.Item
    const responseData = {
      email: user.Item.email,
      name: user.Item.name,
      createdAt: user.Item.createdAt,
      profileImage: user.Item.profileImage,
      profileImageUrl: profileImageUrl, // Include the pre-signed URL here
    };

    // // Decode the URL if needed
    // let profileImageUrl = user.Item.profileImageUrl;
    // try {
    //   const decodedUrl = decodeURIComponent(profileImageUrl);
    //   // Check if the decoded URL is different (i.e., was double-encoded)
    //   if (decodedUrl !== profileImageUrl) {
    //     profileImageUrl = decodedUrl;
    //   }
    // } catch (e) {
    //   console.log("Error decoding profileImageUrl:", e);
    // }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(responseData),
    };
  } catch (error) {
    console.error("Error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
