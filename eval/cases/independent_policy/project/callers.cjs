const { validateBillingAddress, validateShippingAddress } = require('./validators.cjs');
exports.invoice = order => validateBillingAddress(order.billing);
exports.dispatch = order => validateShippingAddress(order.shipping);
