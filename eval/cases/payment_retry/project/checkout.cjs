const { pay } = require('./payment.cjs');
// The payment ID is persisted with the order before this function is called.
exports.checkout = (gateway, order) => pay(gateway, { id: order.paymentId, amount: order.total });
