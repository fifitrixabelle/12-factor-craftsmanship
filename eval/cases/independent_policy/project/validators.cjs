exports.validateBillingAddress = address => Boolean(address.postalCode && address.country);
exports.validateShippingAddress = address => Boolean(address.postalCode && address.country);
