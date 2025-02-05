const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const S3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  try {
    const { filename, contentType, email } = JSON.parse(event.body);
    const authHeader = event.headers.Authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Verify JWT token
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Invalid token" }),
      };
    }

    // Ensure the email in the token matches the uploaded email
    if (decoded.email !== email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Unauthorized user" }),
      };
    }

    // Generate a pre-signed URL for S3
    const key = `profile-images/${email}-${filename}`;
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Expires: 300, // URL expires in 5min
    };

    const uploadURL = await S3.getSignedUrlPromise("putObject", params);
    console.log("presigned url:", uploadURL);

    // Update the profile image URL in DynamoDB
    await dynamoDB
      .update({
        TableName: TABLE_NAME,
        Key: { email },
        UpdateExpression: "SET profileImage = :img",
        ExpressionAttributeValues: { ":img": key }, // Store only the S3 key
        ReturnValues: "UPDATED_NEW",
      })
      .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ uploadURL, filePath: key }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
