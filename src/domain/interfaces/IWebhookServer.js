/**
 * IWebhookServer Interface
 * Defines the contract for HTTP webhook server implementation
 */

class IWebhookServer {
  /**
   * Initialize webhook server
   * @param {Object} config - Server configuration
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config) {
    throw new Error('Method initialize must be implemented')
  }

  /**
   * Start webhook server
   * @returns {Promise<boolean>} Server start success
   */
  async start() {
    throw new Error('Method start must be implemented')
  }

  /**
   * Stop webhook server
   * @returns {Promise<boolean>} Server stop success
   */
  async stop() {
    throw new Error('Method stop must be implemented')
  }

  /**
   * Register event handler for webhook events
   * @param {Function} handler - Event handler function
   */
  onEvent(handler) {
    throw new Error('Method onEvent must be implemented')
  }

  /**
   * Register health check handler
   * @param {Function} handler - Health check handler function
   */
  onHealthCheck(handler) {
    throw new Error('Method onHealthCheck must be implemented')
  }

  /**
   * Register status handler
   * @param {Function} handler - Status handler function
   */
  onStatus(handler) {
    throw new Error('Method onStatus must be implemented')
  }

  /**
   * Register custom route handler
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - Route path
   * @param {Function} handler - Route handler function
   */
  addRoute(method, path, handler) {
    throw new Error('Method addRoute must be implemented')
  }

  /**
   * Add middleware to the server
   * @param {Function} middleware - Express middleware function
   */
  addMiddleware(middleware) {
    throw new Error('Method addMiddleware must be implemented')
  }

  /**
   * Get server statistics
   * @returns {Object} Server statistics
   */
  getStats() {
    throw new Error('Method getStats must be implemented')
  }

  /**
   * Get server configuration
   * @returns {Object} Current server configuration
   */
  getConfig() {
    throw new Error('Method getConfig must be implemented')
  }

  /**
   * Check if server is running
   * @returns {boolean} Server running status
   */
  isRunning() {
    throw new Error('Method isRunning must be implemented')
  }

  /**
   * Get server port
   * @returns {number} Server port number
   */
  getPort() {
    throw new Error('Method getPort must be implemented')
  }

  /**
   * Get server host
   * @returns {string} Server host
   */
  getHost() {
    throw new Error('Method getHost must be implemented')
  }

  /**
   * Get server URL
   * @returns {string} Full server URL
   */
  getUrl() {
    throw new Error('Method getUrl must be implemented')
  }

  /**
   * Enable/disable request logging
   * @param {boolean} enabled - Logging enabled
   * @param {Object} options - Logging options
   */
  setRequestLogging(enabled, options = {}) {
    throw new Error('Method setRequestLogging must be implemented')
  }

  /**
   * Set request timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  setTimeout(timeoutMs) {
    throw new Error('Method setTimeout must be implemented')
  }

  /**
   * Configure CORS settings
   * @param {Object} corsOptions - CORS configuration
   */
  configureCORS(corsOptions) {
    throw new Error('Method configureCORS must be implemented')
  }

  /**
   * Configure rate limiting
   * @param {Object} rateLimitOptions - Rate limit configuration
   */
  configureRateLimit(rateLimitOptions) {
    throw new Error('Method configureRateLimit must be implemented')
  }

  /**
   * Set webhook signature validation
   * @param {string} secret - Webhook secret for signature validation
   * @param {string} algorithm - Hash algorithm (sha256, sha1, etc.)
   */
  setSignatureValidation(secret, algorithm = 'sha256') {
    throw new Error('Method setSignatureValidation must be implemented')
  }
}

module.exports = { IWebhookServer }