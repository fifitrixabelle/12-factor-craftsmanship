const { setTimeout: sleep } = require('node:timers/promises');
exports.pay = async (gateway, payment) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await gateway.charge(payment.amount, { idempotencyKey: payment.id, maxAttempts: 1 });
    } catch (error) {
      const transient = error.status === 429 || (error.status >= 500 && error.status < 600)
        || ['ETIMEDOUT', 'ECONNRESET'].includes(error.code);
      if (!transient || attempt === 2) throw error;
      await sleep(10 * 2 ** attempt);
    }
  }
};
