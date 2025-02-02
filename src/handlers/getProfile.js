const AWS = require("aws-sdk");
const { getUserEmailFromEvent } = require("../utils/auth");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

console.log("TABle name", TABLE_NAME);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  // Log headers
  console.log("Received headers:", JSON.stringify(event.headers, null, 2));
  try {
    // Extract email from Cognito token
    const email = getUserEmailFromEvent(event);

    // Fetch user data
    const user = await dynamoDB
      .get({ TableName: TABLE_NAME, Key: { email } })
      .promise();
    if (!user.Item) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: "User not found" }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(user.Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
