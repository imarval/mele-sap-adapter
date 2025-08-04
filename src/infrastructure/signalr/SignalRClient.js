/**
 * SignalR Client Implementation for SAP Adapter
 * Handles real-time communication with IntegrationBridge
 */

const signalR = require('@microsoft/signalr')
const { ISignalRClient } = require('../../domain/interfaces/ISignalRClient')

class SignalRClient extends ISignalRClient {
  constructor(logger) {
    super()
    this.logger = logger
    this.connection = null
    this.config = null
    this.isInitialized = false
    this.currentSubscriptionId = null
    this.eventHandlers = new Map()
    this.connectionStats = {
      connectTime: null,
      lastActivity: null,
      messagesReceived: 0,
      messagesSent: 0,
      reconnectionCount: 0,
      totalDowntime: 0
    }
    this.lastError = null
    this.autoReconnectEnabled = true
    this.autoReconnectOptions = {
      delays: [0, 2000, 10000, 30000] // Retry delays in milliseconds
    }
  }

  /**
   * Initialize SignalR connection
   * @param {Object} config - SignalR configuration
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config) {
    try {
      this.logger.info('Initializing SignalR client', {
        url: config.url,
        subscriptionId: config.subscriptionId
      })

      this.config = config
      this.currentSubscriptionId = config.subscriptionId

      // Create connection builder
      const connectionBuilder = new signalR.HubConnectionBuilder()
        .withUrl(config.url, {
          headers: config.headers || {},
          accessTokenFactory: config.accessTokenFactory || null
        })
        .withAutomaticReconnect(this.autoReconnectEnabled ? this.autoReconnectOptions.delays : [])
        .configureLogging(this._getSignalRLogLevel(config.logLevel || 'Information'))

      // Add additional configuration
      if (config.timeout) {
        connectionBuilder.withServerTimeout(config.timeout)
      }

      if (config.keepAliveInterval) {
        connectionBuilder.withKeepAliveInterval(config.keepAliveInterval)
      }

      // Build connection
      this.connection = connectionBuilder.build()

      // Setup connection event handlers
      this._setupConnectionEventHandlers()

      // Setup message handlers
      this._setupMessageHandlers()

      this.isInitialized = true
      this.logger.info('SignalR client initialized successfully')

      return true

    } catch (error) {
      this.lastError = error
      this.logger.error('Failed to initialize SignalR client', {
        error: error.message,
        stack: error.stack
      })

      return false
    }
  }

  /**
   * Start SignalR connection
   * @returns {Promise<boolean>} Connection success
   */
  async start() {
    if (!this.isInitialized || !this.connection) {
      throw new Error('SignalR client not initialized')
    }

    try {
      this.logger.info('Starting SignalR connection')

      await this.connection.start()

      this.connectionStats.connectTime = new Date()
      this.connectionStats.lastActivity = new Date()

      // Join tenant group if subscription ID is configured
      if (this.currentSubscriptionId) {
        await this.joinTenantGroup(this.currentSubscriptionId)
      }

      this.logger.info('SignalR connection started successfully', {
        connectionId: this.connection.connectionId,
        state: this.getConnectionState()
      })

      return true

    } catch (error) {
      this.lastError = error
      this.logger.error('Failed to start SignalR connection', {
        error: error.message,
        stack: error.stack
      })

      return false
    }
  }

  /**
   * Stop SignalR connection
   * @returns {Promise<boolean>} Disconnection success
   */
  async stop() {
    try {
      if (this.connection && this.isConnected()) {
        // Leave tenant group before disconnecting
        if (this.currentSubscriptionId) {
          await this.leaveTenantGroup(this.currentSubscriptionId)
        }

        await this.connection.stop()
        this.logger.info('SignalR connection stopped')
      }

      return true

    } catch (error) {
      this.lastError = error
      this.logger.error('Error stopping SignalR connection', {
        error: error.message
      })

      return false
    }
  }

  /**
   * Join tenant group
   * @param {string} subscriptionId - Subscription/tenant ID
   * @returns {Promise<boolean>} Join success
   */
  async joinTenantGroup(subscriptionId) {
    try {
      if (!this.isConnected()) {
        throw new Error('SignalR connection not established')
      }

      await this.invoke('JoinTenantGroup', subscriptionId)
      this.currentSubscriptionId = subscriptionId

      this.logger.info('Joined tenant group', { subscriptionId })
      return true

    } catch (error) {
      this.logger.error('Failed to join tenant group', {
        subscriptionId,
        error: error.message
      })

      return false
    }
  }

  /**
   * Leave tenant group
   * @param {string} subscriptionId - Subscription/tenant ID
   * @returns {Promise<boolean>} Leave success
   */
  async leaveTenantGroup(subscriptionId) {
    try {
      if (!this.isConnected()) {
        return true // Already disconnected
      }

      await this.invoke('LeaveTenantGroup', subscriptionId)
      
      if (this.currentSubscriptionId === subscriptionId) {
        this.currentSubscriptionId = null
      }

      this.logger.info('Left tenant group', { subscriptionId })
      return true

    } catch (error) {
      this.logger.error('Failed to leave tenant group', {
        subscriptionId,
        error: error.message
      })

      return false
    }
  }

  /**
   * Register event handler
   * @param {string} eventName - Event name to listen for
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    if (!this.connection) {
      throw new Error('SignalR client not initialized')
    }

    // Store handler for management
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set())
    }
    this.eventHandlers.get(eventName).add(handler)

    // Register with SignalR connection
    this.connection.on(eventName, (...args) => {
      this.connectionStats.messagesReceived++
      this.connectionStats.lastActivity = new Date()
      
      try {
        handler(...args)
      } catch (error) {
        this.logger.error('Error in SignalR event handler', {
          eventName,
          error: error.message,
          stack: error.stack
        })
      }
    })

    this.logger.debug('Registered SignalR event handler', { eventName })
  }

  /**
   * Unregister event handler
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   */
  off(eventName, handler) {
    if (!this.connection) {
      return
    }

    // Remove from our handler tracking
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).delete(handler)
      
      if (this.eventHandlers.get(eventName).size === 0) {
        this.eventHandlers.delete(eventName)
        // Remove all handlers for this event from SignalR
        this.connection.off(eventName)
      }
    }

    this.logger.debug('Unregistered SignalR event handler', { eventName })
  }

  /**
   * Send message to server
   * @param {string} methodName - Server method name
   * @param {...any} args - Method arguments
   * @returns {Promise<any>} Server response
   */
  async invoke(methodName, ...args) {
    if (!this.isConnected()) {
      throw new Error('SignalR connection not established')
    }

    try {
      this.connectionStats.messagesSent++
      this.connectionStats.lastActivity = new Date()

      const result = await this.connection.invoke(methodName, ...args)

      this.logger.debug('SignalR method invoked successfully', {
        method: methodName,
        argsCount: args.length
      })

      return result

    } catch (error) {
      this.lastError = error
      this.logger.error('SignalR method invocation failed', {
        method: methodName,
        error: error.message
      })

      throw error
    }
  }

  /**
   * Send message to server without waiting for response
   * @param {string} methodName - Server method name
   * @param {...any} args - Method arguments
   * @returns {Promise<void>}
   */
  async send(methodName, ...args) {
    if (!this.isConnected()) {
      throw new Error('SignalR connection not established')
    }

    try {
      this.connectionStats.messagesSent++
      this.connectionStats.lastActivity = new Date()

      await this.connection.send(methodName, ...args)

      this.logger.debug('SignalR message sent successfully', {
        method: methodName,
        argsCount: args.length
      })

    } catch (error) {
      this.lastError = error
      this.logger.error('SignalR message send failed', {
        method: methodName,
        error: error.message
      })

      throw error
    }
  }

  /**
   * Get connection state
   * @returns {string} Connection state
   */
  getConnectionState() {
    if (!this.connection) {
      return 'Not Initialized'
    }

    const states = {
      0: 'Disconnected',
      1: 'Connecting',
      2: 'Connected',
      3: 'Disconnecting',
      4: 'Reconnecting'
    }

    return states[this.connection.state] || 'Unknown'
  }

  /**
   * Check if client is connected
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.connection && this.connection.state === signalR.HubConnectionState.Connected
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      isConnected: this.isConnected(),
      connectionState: this.getConnectionState(),
      connectionId: this.connection?.connectionId || null,
      currentSubscriptionId: this.currentSubscriptionId,
      registeredEvents: Array.from(this.eventHandlers.keys())
    }
  }

  /**
   * Get last error
   * @returns {Error|null} Last connection error
   */
  getLastError() {
    return this.lastError
  }

  /**
   * Enable/disable automatic reconnection
   * @param {boolean} enabled - Auto-reconnect enabled
   * @param {Object} options - Reconnection options
   */
  setAutoReconnect(enabled, options = {}) {
    this.autoReconnectEnabled = enabled
    this.autoReconnectOptions = {
      ...this.autoReconnectOptions,
      ...options
    }

    this.logger.info('Auto-reconnect settings updated', {
      enabled,
      options: this.autoReconnectOptions
    })
  }

  /**
   * Set connection timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  setTimeout(timeoutMs) {
    if (this.connection) {
      this.connection.serverTimeoutInMilliseconds = timeoutMs
      this.logger.info('Connection timeout updated', { timeoutMs })
    }
  }

  // Private helper methods

  /**
   * Setup connection event handlers
   * @private
   */
  _setupConnectionEventHandlers() {
    // Connection closed
    this.connection.onclose((error) => {
      if (error) {
        this.lastError = error
        this.logger.error('SignalR connection closed with error', {
          error: error.message
        })
      } else {
        this.logger.info('SignalR connection closed')
      }
    })

    // Reconnecting
    this.connection.onreconnecting((error) => {
      this.connectionStats.reconnectionCount++
      this.logger.warn('SignalR connection reconnecting', {
        error: error?.message,
        reconnectionCount: this.connectionStats.reconnectionCount
      })
    })

    // Reconnected
    this.connection.onreconnected(async (connectionId) => {
      this.connectionStats.connectTime = new Date()
      this.connectionStats.lastActivity = new Date()

      this.logger.info('SignalR connection reconnected', {
        connectionId,
        reconnectionCount: this.connectionStats.reconnectionCount
      })

      // Rejoin tenant group if needed
      if (this.currentSubscriptionId) {
        try {
          await this.joinTenantGroup(this.currentSubscriptionId)
        } catch (error) {
          this.logger.error('Failed to rejoin tenant group after reconnection', {
            subscriptionId: this.currentSubscriptionId,
            error: error.message
          })
        }
      }
    })
  }

  /**
   * Setup message handlers for integration events
   * @private
   */
  _setupMessageHandlers() {
    // Handle integration events from the hub
    this.on('IntegrationEvent', (eventData) => {
      this.logger.debug('Received integration event via SignalR', {
        eventId: eventData.eventId || eventData.EventId,
        eventType: eventData.eventType || eventData.EventType,
        entityType: eventData.entityType || eventData.EntityType
      })

      // Emit to application handlers
      this._emitToApplicationHandlers('integration-event', eventData)
    })

    // Handle system messages
    this.on('SystemMessage', (message) => {
      this.logger.info('Received system message via SignalR', { message })
      this._emitToApplicationHandlers('system-message', message)
    })

    // Handle heartbeat/ping messages
    this.on('Ping', (data) => {
      this.logger.debug('Received ping via SignalR')
      this._emitToApplicationHandlers('ping', data)
    })
  }

  /**
   * Emit events to application-level handlers
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   * @private
   */
  _emitToApplicationHandlers(eventType, data) {
    // This method can be overridden or extended to integrate with
    // application-level event handling systems
    process.nextTick(() => {
      process.emit(`signalr-${eventType}`, data)
    })
  }

  /**
   * Convert log level to SignalR log level
   * @param {string} level - Log level
   * @returns {number} SignalR log level
   * @private
   */
  _getSignalRLogLevel(level) {
    const levels = {
      'Trace': signalR.LogLevel.Trace,
      'Debug': signalR.LogLevel.Debug,
      'Information': signalR.LogLevel.Information,
      'Warning': signalR.LogLevel.Warning,
      'Error': signalR.LogLevel.Error,
      'Critical': signalR.LogLevel.Critical,
      'None': signalR.LogLevel.None
    }

    return levels[level] || signalR.LogLevel.Information
  }
}

module.exports = { SignalRClient }