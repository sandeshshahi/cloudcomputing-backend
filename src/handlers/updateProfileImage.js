const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const JWT_SECRET = process.env.JWT_SECRET;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event, null, 2)); // Log the event

  try {
    const { email, imageUrl } = JSON.parse(event.body);
    console.log("Parsed request body:", { email, imageUrl });
    // const { filePath } = JSON.parse(event.body);

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
    console.log("Extracted token:", token); // Log the token

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

    // Ensure the email in the token matches the request email
    if (decoded.email !== email) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: "Unauthorized user" }),
      };
    }

    // Update the profile image URL in DynamoDB
    const updateParams = {
      TableName: TABLE_NAME,
      Key: { email },
      UpdateExpression: "SET profileImage = :img",
      ExpressionAttributeValues: { ":img": imageUrl },
      ReturnValues: "UPDATED_NEW",
    };

    console.log("Updating DynamoDB with params:", updateParams); // Log the update params

    // Update the profile image URL in DynamoDB
    const result = await dynamoDB.update(updateParams).promise();
    console.log("Dynamo DB update result:", result);
    // await dynamoDB
    //   .update({
    //     TableName: TABLE_NAME,
    //     Key: { email },
    //     UpdateExpression: "SET profileImage = :img",
    //     ExpressionAttributeValues: { ":img": filePath },
    //   })
    //   .promise();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Profile image updated successfully",
        imageUrl,
      }),
    };
  } catch (error) {
    console.error("Error in updateProfileImage:", error); // Log the error
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
