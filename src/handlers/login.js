const AWS = require("aws-sdk");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;
const SECRET_KEY = process.env.JWT_SECRET;

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);

    //Retrieve user from DynamoDB
    const user = await dynamoDB
      .get({
        TableName: TABLE_NAME,
        Key: { email },
      })
      .promise();

    // if user not found
    if (!user.Item) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "User not found" }),
        headers,
      };
    }

    // compare password
    const isValidPassword = await bcrypt.compare(password, user.Item.password);

    // if password doesnot match
    if (!isValidPassword) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Invalid credentials" }),
        headers,
      };
    }

    // generate JWT token
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: "1h" });

    return { statusCode: 200, headers, body: JSON.stringify({ token, email }) };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
