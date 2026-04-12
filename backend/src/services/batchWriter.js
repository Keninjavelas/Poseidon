'use strict';

const FLUSH_INTERVAL_MS = 1000;
const MAX_BATCH_SIZE = 50;

function createBatchWriter(dbQuery, logger) {
  const queues = new Map();
  const columnsByTable = new Map();
  let flushTimer = null;

  function flushQueue(tableName, columns) {
    const queue = queues.get(tableName);
    if (!queue || queue.length === 0) return Promise.resolve();

    const batch = queue.splice(0, MAX_BATCH_SIZE);
    const placeholders = batch
      .map((row, rowIndex) => {
        const offset = rowIndex * columns.length;
        const values = columns.map((_, columnIndex) => `$${offset + columnIndex + 1}`);
        return `(${values.join(', ')})`;
      })
      .join(', ');

    const params = batch.flatMap((row) => columns.map((column) => row[column]));
    const sql = `INSERT INTO "${tableName}" (${columns.join(', ')}) VALUES ${placeholders}`;
    return dbQuery(sql, params).catch((error) => {
      logger.error({ error, tableName }, 'batch write failed');
    });
  }

  async function enqueue(tableName, columns, row) {
    if (!queues.has(tableName)) {
      queues.set(tableName, []);
    }
    columnsByTable.set(tableName, columns);
    queues.get(tableName).push(row);
    if (queues.get(tableName).length >= MAX_BATCH_SIZE) {
      await flushQueue(tableName, columns);
    }
  }

  async function flushAll() {
    for (const [tableName, queue] of queues.entries()) {
      if (queue.length > 0) {
        await flushQueue(tableName, columnsByTable.get(tableName) || Object.keys(queue[0]));
      }
    }
  }

  function start() {
    if (flushTimer) return;
    flushTimer = setInterval(() => {
      flushAll().catch((error) => logger.error({ error }, 'scheduled batch flush failed'));
    }, FLUSH_INTERVAL_MS);
  }

  function stop() {
    if (flushTimer) clearInterval(flushTimer);
    flushTimer = null;
  }

  return { enqueue, flushAll, start, stop };
}

module.exports = { createBatchWriter };