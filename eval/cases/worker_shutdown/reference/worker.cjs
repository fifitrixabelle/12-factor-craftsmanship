exports.start = async (queue, handle, { shutdownMs = 30000 } = {}) => {
  let stopping = false;
  let deadline;
  function stop() {
    if (stopping) return;
    stopping = true;
    deadline = setTimeout(() => process.exit(1), shutdownMs);
    queue.close();
  }
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  try {
    while (!stopping) {
      const job = await queue.receive();
      if (stopping) break;
      if (job) { await handle(job); await queue.ack(job); }
    }
  } finally {
    clearTimeout(deadline);
    process.removeListener('SIGTERM', stop);
    process.removeListener('SIGINT', stop);
  }
};
