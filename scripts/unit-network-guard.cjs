// Loaded only by the isolated unit-test runner, never by the application.
const net = require('node:net');
const { syncBuiltinESMExports } = require('node:module');
const originalConnect = net.Socket.prototype.connect;

net.Socket.prototype.connect = function (...args) {
  const normalized = Array.isArray(args[0]) ? args[0] : args;
  const first = normalized[0];
  const host = typeof first === 'object' && first !== null
    ? first.host || first.hostname || 'localhost'
    : typeof normalized[1] === 'string' ? normalized[1] : 'localhost';
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Unit tests prohibit non-loopback connections: ${host}`);
  }
  return originalConnect.apply(this, args);
};

syncBuiltinESMExports();
