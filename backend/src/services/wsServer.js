'use strict';

const WebSocket = require('ws');

/**
 * Creates a WebSocket server attached to an existing HTTP server.
 *
 * Designed for testability: accepts an optional `WsServerClass` parameter so
 * tests can inject a mock instead of a real ws.Server.
 *
 * @param {import('http').Server} httpServer - The HTTP server to attach to
 * @param {typeof WebSocket.Server} [WsServerClass] - WebSocket.Server constructor (injectable for tests)
 * @returns {{ broadcast: Function, getClients: Function, _handleConnection: Function }}
 */
function createWsServer(httpServer, WsServerClass = WebSocket.Server) {
  /** @type {Set<WebSocket>} */
  const clients = new Set();

  const wss = new WsServerClass({ server: httpServer });

  /**
   * Handles a new WebSocket connection.
   * Adds the client to the pool and removes it on close.
   *
   * @param {WebSocket} ws
   */
  function handleConnection(ws) {
    clients.add(ws);

    ws.on('close', () => {
      clients.delete(ws);
    });
  }

  wss.on('connection', handleConnection);

  // Send ping frames every 30 s to keep connections alive
  const pingInterval = setInterval(() => {
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }
  }, 30_000);
  pingInterval.unref?.();

  // Clean up interval if the wss closes
  wss.on('close', () => clearInterval(pingInterval));

  /**
   * Broadcasts a message to all open WebSocket clients.
   *
   * @param {string} channel - The channel name (e.g. 'rainfall', 'alerts')
   * @param {unknown} data - The payload to send
   */
  function broadcast(channel, data) {
    const message = JSON.stringify({ channel, data });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  /**
   * Returns the current set of active clients.
   *
   * @returns {Set<WebSocket>}
   */
  function getClients() {
    return clients;
  }

  return { broadcast, getClients, _handleConnection: handleConnection };
}

module.exports = { createWsServer };
