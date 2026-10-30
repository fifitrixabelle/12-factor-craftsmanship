exports.start = async (queue, handle, { shutdownMs = 30000 } = {}) => {
  process.on('SIGTERM', () => process.exit(0));
  process.on('SIGINT', () => process.exit(0));
  while (true) {
    const job = await queue.receive();
    if (job) { await handle(job); await queue.ack(job); }
  }
};
