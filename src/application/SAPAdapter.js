/**
 * SAP Adapter Main Class
 * Orchestrates the integration between IntegrationBridge and SAP systems
 */

const { SAPRFCService } = require('../infrastructure/sap/SAPRFCService')
const { SignalRClient } = require('../infrastructure/signalr/SignalRClient')
const { WebhookServer } = require('../infrastructure/http/WebhookServer')
const { IntegrationEvent } = require('../domain/entities/IntegrationEvent')
const { SAPRecord } = require('../domain/entities/SAPRecord')
const { ProcessingResult } = require('../domain/entities/ProcessingResult')

class SAPAdapter {
  constructor(config = {}, logger = console) {
    this.config = config
    this.logger = logger
    this.isInitialized = false
    this.isRunning = false
    
    // Initialize services
    this.sapService = new SAPRFCService(logger)
    this.signalRClient = new SignalRClient(logger)
    this.webhookServer = new WebhookServer(logger)
    
    // Event handlers
    this.eventHandlers = new Set()
    
    // Statistics
    this.stats = {
      startTime: null,
      eventsProcessed: 0,
      eventsSuccessful: 0,
      eventsFailed: 0,
      sapCallsExecuted: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0
    }
  }

  /**
   * Initialize the SAP adapter
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize() {
    try {
      this.logger.info('Initializing SAP Adapter')

      // Initialize SAP connection
      if (this.config.sap?.enabled !== false) {
        const sapConnected = await this.sapService.connect(this.config.sap)
        if (!sapConnected) {
          throw new Error('Failed to connect to SAP system')
        }
      }

      // Initialize SignalR client
      if (this.config.signalR?.enabled !== false) {
        await this.signalRClient.initialize(this.config.signalR)
        this._setupSignalRHandlers()
      }

      // Initialize webhook server
      if (this.config.webhook?.enabled !== false) {
        await this.webhookServer.initialize(this.config.webhook)
        this._setupWebhookHandlers()
      }

      this.isInitialized = true
      this.logger.info('SAP Adapter initialized successfully')
      
      return true

    } catch (error) {
      this.logger.error('Failed to initialize SAP Adapter', {
        error: error.message,
        stack: error.stack
      })
      
      return false
    }
  }

  /**
   * Start the SAP adapter
   * @returns {Promise<boolean>} Start success
   */
  async start() {
    if (!this.isInitialized) {
      const initialized = await this.initialize()
      if (!initialized) {
        return false
      }
    }

    try {
      this.logger.info('Starting SAP Adapter')

      // Start SignalR client
      if (this.config.signalR?.enabled !== false) {
        await this.signalRClient.start()
      }

      // Start webhook server
      if (this.config.webhook?.enabled !== false) {
        await this.webhookServer.start()
      }

      this.isRunning = true
      this.stats.startTime = new Date()

      this.logger.info('SAP Adapter started successfully', {
        signalR: this.config.signalR?.enabled !== false,
        webhook: this.config.webhook?.enabled !== false,
        sap: this.config.sap?.enabled !== false
      })

      return true

    } catch (error) {
      this.logger.error('Failed to start SAP Adapter', {
        error: error.message,
        stack: error.stack
      })

      return false
    }
  }

  /**
   * Stop the SAP adapter
   * @returns {Promise<boolean>} Stop success
   */
  async stop() {
    try {
      this.logger.info('Stopping SAP Adapter')

      // Stop SignalR client
      if (this.signalRClient) {
        await this.signalRClient.stop()
      }

      // Stop webhook server
      if (this.webhookServer) {
        await this.webhookServer.stop()
      }

      // Disconnect from SAP
      if (this.sapService) {
        await this.sapService.disconnect()
      }

      this.isRunning = false
      this.logger.info('SAP Adapter stopped successfully')

      return true

    } catch (error) {
      this.logger.error('Error stopping SAP Adapter', {
        error: error.message
      })

      return false
    }
  }

  /**
   * Process integration event
   * @param {Object} eventData - Integration event data
   * @returns {Promise<ProcessingResult>} Processing result
   */
  async processEvent(eventData) {
    const startTime = Date.now()
    
    try {
      // Convert to IntegrationEvent entity
      const integrationEvent = IntegrationEvent.fromIntegrationBridgeDto(eventData)
      
      this.logger.info('Processing integration event', {
        eventId: integrationEvent.eventId,
        eventType: integrationEvent.eventType,
        entityType: integrationEvent.entityType
      })

      // Create SAP record from integration event
      const sapRecord = SAPRecord.fromIntegrationEvent(integrationEvent, this.config.sap)

      // Process based on event type
      let result
      switch (integrationEvent.eventType) {
        case 'Create':
          result = await this.sapService.createRecord(
            sapRecord.sapEntityType,
            sapRecord.data,
            { integrationEvent, sapRecord }
          )
          break

        case 'Update':
          result = await this.sapService.updateRecord(
            sapRecord.sapEntityType,
            sapRecord.sapKey,
            sapRecord.data,
            { integrationEvent, sapRecord }
          )
          break

        case 'Delete':
          result = await this.sapService.deleteRecord(
            sapRecord.sapEntityType,
            sapRecord.sapKey,
            { integrationEvent, sapRecord }
          )
          break

        case 'Sync':
          // For sync operations, we might need to read from SAP and compare
          result = await this._handleSyncEvent(integrationEvent, sapRecord)
          break

        default:
          throw new Error(`Unsupported event type: ${integrationEvent.eventType}`)
      }

      // Update statistics
      const processingTime = Date.now() - startTime
      this._updateStats(processingTime, result.success)

      // Mark integration event as processed
      integrationEvent.markAsProcessed(result)
      result.setProcessingTime(startTime)

      // Notify event handlers
      this._notifyEventHandlers('event-processed', {
        integrationEvent,
        sapRecord,
        result
      })

      this.logger.info('Integration event processed successfully', {
        eventId: integrationEvent.eventId,
        processingTime,
        success: result.success
      })

      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      this._updateStats(processingTime, false)

      this.logger.error('Failed to process integration event', {
        eventId: eventData.eventId || eventData.EventId,
        error: error.message,
        stack: error.stack,
        processingTime
      })

      const result = ProcessingResult.failure(
        eventData.eventId || eventData.EventId,
        eventData.entityType || eventData.EntityType,
        'PROCESS',
        error
      )
      
      result.setProcessingTime(startTime)
      return result
    }
  }

  /**
   * Get adapter status
   * @returns {Object} Adapter status
   */
  getStatus() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0
    
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      uptime,
      stats: this.stats,
      services: {
        sap: {
          connected: this.sapService?.isConnected() || false,
          stats: this.sapService?.getConnectionStats() || null
        },
        signalR: {
          connected: this.signalRClient?.isConnected() || false,
          stats: this.signalRClient?.getConnectionStats() || null
        },
        webhook: {
          running: this.webhookServer?.isRunning() || false,
          stats: this.webhookServer?.getStats() || null
        }
      }
    }
  }

  /**
   * Get adapter health information
   * @returns {Object} Health information
   */
  async getHealth() {
    const status = this.getStatus()
    let overallHealth = 'healthy'
    const issues = []

    // Check SAP connection
    if (this.config.sap?.enabled !== false) {
      if (!status.services.sap.connected) {
        overallHealth = 'degraded'
        issues.push('SAP connection not established')
      } else {
        // Test SAP connection
        const sapTest = await this.sapService.testConnection()
        if (!sapTest.success) {
          overallHealth = 'degraded'
          issues.push(`SAP connection test failed: ${sapTest.message}`)
        }
      }
    }

    // Check SignalR connection
    if (this.config.signalR?.enabled !== false && !status.services.signalR.connected) {
      overallHealth = 'degraded'
      issues.push('SignalR connection not established')
    }

    // Check webhook server
    if (this.config.webhook?.enabled !== false && !status.services.webhook.running) {
      overallHealth = 'unhealthy'
      issues.push('Webhook server not running')
    }

    return {
      status: overallHealth,
      timestamp: new Date().toISOString(),
      uptime: status.uptime,
      issues,
      services: status.services
    }
  }

  /**
   * Register event handler
   * @param {Function} handler - Event handler function
   */
  onEvent(handler) {
    this.eventHandlers.add(handler)
  }

  /**
   * Unregister event handler
   * @param {Function} handler - Event handler function
   */
  offEvent(handler) {
    this.eventHandlers.delete(handler)
  }

  // Private helper methods

  /**
   * Setup SignalR event handlers
   * @private
   */
  _setupSignalRHandlers() {
    // Handle integration events from SignalR
    process.on('signalr-integration-event', async (eventData) => {
      try {
        await this.processEvent(eventData)
      } catch (error) {
        this.logger.error('Error processing SignalR event', {
          error: error.message,
          eventData
        })
      }
    })
  }

  /**
   * Setup webhook event handlers
   * @private
   */
  _setupWebhookHandlers() {
    // Handle webhook events
    this.webhookServer.onEvent(async (eventData) => {
      try {
        const result = await this.processEvent(eventData)
        return {
          success: result.success,
          message: result.message,
          error: result.error
        }
      } catch (error) {
        this.logger.error('Error processing webhook event', {
          error: error.message,
          eventData
        })
        
        return {
          success: false,
          message: 'Event processing failed',
          error: error.message
        }
      }
    })

    // Handle health checks
    this.webhookServer.onHealthCheck(async () => {
      return await this.getHealth()
    })

    // Handle status requests
    this.webhookServer.onStatus(async () => {
      return this.getStatus()
    })
  }

  /**
   * Handle sync events
   * @param {IntegrationEvent} integrationEvent - Integration event
   * @param {SAPRecord} sapRecord - SAP record
   * @returns {Promise<ProcessingResult>} Processing result
   * @private
   */
  async _handleSyncEvent(integrationEvent, sapRecord) {
    // Read current data from SAP
    const readResult = await this.sapService.readRecord(
      sapRecord.sapEntityType,
      sapRecord.sapKey
    )

    if (!readResult.success) {
      // Record doesn't exist in SAP, create it
      return await this.sapService.createRecord(
        sapRecord.sapEntityType,
        sapRecord.data
      )
    }

    // Compare and update if necessary
    // This is a simplified comparison - in real implementation,
    // you would compare specific fields and timestamps
    return await this.sapService.updateRecord(
      sapRecord.sapEntityType,
      sapRecord.sapKey,
      sapRecord.data
    )
  }

  /**
   * Update processing statistics
   * @param {number} processingTime - Processing time in milliseconds
   * @param {boolean} success - Processing success
   * @private
   */
  _updateStats(processingTime, success) {
    this.stats.eventsProcessed++
    this.stats.totalProcessingTime += processingTime
    this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.eventsProcessed

    if (success) {
      this.stats.eventsSuccessful++
    } else {
      this.stats.eventsFailed++
    }
  }

  /**
   * Notify registered event handlers
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   * @private
   */
  _notifyEventHandlers(eventType, data) {
    this.eventHandlers.forEach(handler => {
      try {
        handler(eventType, data)
      } catch (error) {
        this.logger.error('Error in event handler', {
          eventType,
          error: error.message
        })
      }
    })
  }
}

module.exports = { SAPAdapter }