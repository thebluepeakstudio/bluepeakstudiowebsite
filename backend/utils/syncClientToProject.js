const Client = require("../models/Client");
const ApiError = require("./ApiError");

const syncClientToProject = async (body) => {
  if (!body.clientId) return body;

  const client = await Client.findById(body.clientId);
  if (!client) throw new ApiError(400, "Invalid client");

  return {
    ...body,
    clientName: client.name,
    businessName: client.companyName || body.businessName || "",
    email: client.email || body.email || "",
    contactNumber: client.phone || body.contactNumber || "",
  };
};

module.exports = { syncClientToProject };
