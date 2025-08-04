/**
 * ISignalRClient Interface
 * Defines the contract for SignalR client implementation
 */

class ISignalRClient {
  /**
   * Initialize SignalR connection
   * @param {Object} config - SignalR configuration
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config) {
    throw new Error('Method initialize must be implemented')
  }

  /**
   * Start SignalR connection
   * @returns {Promise<boolean>} Connection success
   */
  async start() {
    throw new Error('Method start must be implemented')
  }

  /**
   * Stop SignalR connection
   * @returns {Promise<boolean>} Disconnection success
   */
  async stop() {
    throw new Error('Method stop must be implemented')
  }

  /**
   * Join tenant group
   * @param {string} subscriptionId - Subscription/tenant ID
   * @returns {Promise<boolean>} Join success
   */
  async joinTenantGroup(subscriptionId) {
    throw new Error('Method joinTenantGroup must be implemented')
  }

  /**
   * Leave tenant group
   * @param {string} subscriptionId - Subscription/tenant ID
   * @returns {Promise<boolean>} Leave success
   */
  async leaveTenantGroup(subscriptionId) {
    throw new Error('Method leaveTenantGroup must be implemented')
  }

  /**
   * Register event handler
   * @param {string} eventName - Event name to listen for
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    throw new Error('Method on must be implemented')
  }

  /**
   * Unregister event handler
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   */
  off(eventName, handler) {
    throw new Error('Method off must be implemented')
  }

  /**
   * Send message to server
   * @param {string} methodName - Server method name
   * @param {...any} args - Method arguments
   * @returns {Promise<any>} Server response
   */
  async invoke(methodName, ...args) {
    throw new Error('Method invoke must be implemented')
  }

  /**
   * Send message to server without waiting for response
   * @param {string} methodName - Server method name
   * @param {...any} args - Method arguments
   * @returns {Promise<void>}
   */
  async send(methodName, ...args) {
    throw new Error('Method send must be implemented')
  }

  /**
   * Get connection state
   * @returns {string} Connection state (Disconnected, Connecting, Connected, etc.)
   */
  getConnectionState() {
    throw new Error('Method getConnectionState must be implemented')
  }

  /**
   * Check if client is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    throw new Error('Method isConnected must be implemented')
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    throw new Error('Method getConnectionStats must be implemented')
  }

  /**
   * Get last error
   * @returns {Error|null} Last connection error
   */
  getLastError() {
    throw new Error('Method getLastError must be implemented')
  }

  /**
   * Enable/disable automatic reconnection
   * @param {boolean} enabled - Auto-reconnect enabled
   * @param {Object} options - Reconnection options
   */
  setAutoReconnect(enabled, options = {}) {
    throw new Error('Method setAutoReconnect must be implemented')
  }

  /**
   * Set connection timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  setTimeout(timeoutMs) {
    throw new Error('Method setTimeout must be implemented')
  }
}

module.exports = { ISignalRClient }