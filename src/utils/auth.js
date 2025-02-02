exports.getUserEmailFromEvent = (event) => {
  try {
    return event.requestContext.authorizer.claims.email;
  } catch (error) {
    throw new Error("Unauthorized: Missing or invalid token");
  }
};
