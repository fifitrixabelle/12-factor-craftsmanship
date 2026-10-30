const { randomUUID } = require('node:crypto');
exports.pay = async (gateway, payment) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await gateway.charge(payment.amount, { idempotencyKey: randomUUID(), maxAttempts: 2 });
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
};
