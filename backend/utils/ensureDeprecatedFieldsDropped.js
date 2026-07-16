const Client = require("../models/Client");
const Freelancer = require("../models/Freelancer");

/** Strip deprecated fields from existing documents (idempotent). */
const ensureDeprecatedFieldsDropped = async () => {
  const [clients, freelancers] = await Promise.all([
    Client.updateMany({ address: { $exists: true } }, { $unset: { address: 1 } }),
    Freelancer.updateMany(
      { $or: [{ address: { $exists: true } }, { pricing: { $exists: true } }] },
      { $unset: { address: 1, pricing: 1 } }
    ),
  ]);

  const clientCount = clients.modifiedCount || 0;
  const freelancerCount = freelancers.modifiedCount || 0;
  if (clientCount || freelancerCount) {
    console.log(
      `[schema-cleanup] Removed deprecated fields — clients: ${clientCount}, freelancers: ${freelancerCount}`
    );
  }
};

module.exports = ensureDeprecatedFieldsDropped;
