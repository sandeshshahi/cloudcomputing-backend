const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  try {
    // Log the raw event body to inspect it
    console.log("Received event:", event);

    // Ensure event.body is parsed only if necessary
    let body;
    if (typeof event.body === "string") {
      body = JSON.parse(event.body);
    } else {
      body = event.body || event; // Direct invocation (like from Lambda console)
    }

    console.log("Parsed body:", body);

    // Check if event.body is  undefined or empty
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Request body is empty" }),
        headers,
      };
    }
    // Ensure body is valid
    if (!body || !body.email || !body.password || !body.name) {
      console.log("Missing required fields");
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
        headers,
      };
    }

    // Try to parse the body

    // try {
    //   body = JSON.parse(event.body);
    // } catch (err) {
    //   console.error("Error parsing request body:", err);
    //   return {
    //     statusCode: 400,
    //     body: JSON.stringify({ message: "Invalid JSON format" }),
    //     headers
    //   };
    // }

    const { email, password, name } = body;
    console.log("valid request received for:", email);

    if (!email || !password || !name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required fields" }),
        headers,
      };
    }

    // Check if email exists
    console.log("Checking if user exists in DynamoDB...");
    const existingUser = await dynamoDB
      .get({
        TableName: TABLE_NAME,
        Key: { email },
      })
      .promise();

    //   If user exists, return a response

    if (existingUser.Item) {
      console.log("Email already exists:", email);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: "Email already exists" }),
      };
    }

    // Hash password
    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed successfully");

    // Store new user in DynamoDB
    console.log("Storing new user in DynamoDB...");
    await dynamoDB
      .put({
        TableName: TABLE_NAME,
        Item: {
          email,
          name,
          password: hashedPassword,
          profileImage: null,
          createdAt: new Date().toISOString(),
        },
      })
      .promise();

    console.log("User registered successfully:", email);
    return {
      statusCode: 201,
      body: JSON.stringify({
        email,
        name,
        message: "User registered successfully",
      }),
      headers,
    };
  } catch (error) {
    console.error("Signup error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
