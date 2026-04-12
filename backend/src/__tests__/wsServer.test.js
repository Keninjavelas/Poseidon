// Feature: poseidon-smart-water-hub, Property 11: WebSocket connection pool integrity
// Validates: Requirements 6.5

'use strict';

const fc = require('fast-check');
const { createWsServer } = require('../services/wsServer');
const WebSocket = require('ws');

/**
 * Creates a mock WebSocket client object.
 * Mirrors the minimal interface used by wsServer.js.
 */
function createMockClient(readyState = WebSocket.OPEN) {
  const listeners = {};
  return {
    readyState,
    send: jest.fn(),
    ping: jest.fn(),
    on(event, cb) {
      listeners[event] = cb;
    },
    // Helper to trigger registered event handlers in tests
    _emit(event, ...args) {
      if (listeners[event]) listeners[event](...args);
    },
  };
}

/**
 * Builds a mock WebSocket.Server class that captures the 'connection' handler
 * so tests can trigger connections manually without a real HTTP server.
 */
function buildMockWsServerClass() {
  const serverListeners = {};

  class MockWsServer {
    constructor() {}
    on(event, cb) {
      serverListeners[event] = cb;
    }
  }

  MockWsServer._emit = (event, ...args) => {
    if (serverListeners[event]) serverListeners[event](...args);
  };

  return MockWsServer;
}

describe('wsServer — Property 11: WebSocket connection pool integrity', () => {
  test('pool size equals number of connected clients', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 50 }), (clientCount) => {
        const MockWsServer = buildMockWsServerClass();
        const { getClients, _handleConnection } = createWsServer(null, MockWsServer);

        // Connect N clients
        const clients = Array.from({ length: clientCount }, () => createMockClient());
        for (const client of clients) {
          _handleConnection(client);
        }

        expect(getClients().size).toBe(clientCount);
      }),
      { numRuns: 100 }
    );
  });

  test('pool size decreases by exactly the number of disconnected clients', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 49 }),
        (clientCount, disconnectSeed) => {
          const MockWsServer = buildMockWsServerClass();
          const { getClients, _handleConnection } = createWsServer(null, MockWsServer);

          const clients = Array.from({ length: clientCount }, () => createMockClient());
          for (const client of clients) {
            _handleConnection(client);
          }

          // Disconnect a deterministic subset based on disconnectSeed
          const disconnectCount = disconnectSeed % clientCount; // 0 to clientCount-1
          const toDisconnect = clients.slice(0, disconnectCount);
          for (const client of toDisconnect) {
            client._emit('close');
          }

          expect(getClients().size).toBe(clientCount - disconnectCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('broadcast does not send to disconnected clients', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        fc.integer({ min: 1, max: 49 }),
        (clientCount, disconnectSeed) => {
          const MockWsServer = buildMockWsServerClass();
          const { broadcast, _handleConnection } = createWsServer(null, MockWsServer);

          const clients = Array.from({ length: clientCount }, () => createMockClient(WebSocket.OPEN));
          for (const client of clients) {
            _handleConnection(client);
          }

          // Disconnect at least 1 client
          const disconnectCount = Math.max(1, disconnectSeed % clientCount);
          const toDisconnect = clients.slice(0, disconnectCount);
          const remaining = clients.slice(disconnectCount);

          for (const client of toDisconnect) {
            client._emit('close');
          }

          broadcast('rainfall', { value: 42 });

          // Disconnected clients must NOT have received the broadcast
          for (const client of toDisconnect) {
            expect(client.send).not.toHaveBeenCalled();
          }

          // Still-connected clients MUST have received the broadcast
          for (const client of remaining) {
            expect(client.send).toHaveBeenCalledWith(
              JSON.stringify({ channel: 'rainfall', data: { value: 42 } })
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
