/**
 * Basic Usage Example for SAP Adapter
 * Demonstrates how to initialize and use the SAP Integration Adapter
 */

const { SAPAdapter } = require('../index')

async function main() {
  // Create logger (in production, use winston or similar)
  const logger = {
    info: (message, meta) => console.log(`[INFO] ${message}`, meta || ''),
    warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ''),
    error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ''),
    debug: (message, meta) => console.log(`[DEBUG] ${message}`, meta || '')
  }

  // SAP Adapter configuration
  const config = {
    app: {
      name: 'SAP Integration Demo',
      version: '1.0.0'
    },
    sap: {
      enabled: true,
      host: process.env.SAP_HOST || 'localhost',
      systemNumber: process.env.SAP_SYSNR || '00',
      client: process.env.SAP_CLIENT || '100',
      user: process.env.SAP_USER || 'DEVELOPER',
      passwd: process.env.SAP_PASSWORD || 'password',
      language: 'EN',
      companyCode: '1000',
      plant: '1000'
    },
    signalR: {
      enabled: true,
      url: process.env.SIGNALR_URL || 'http://localhost:5000/hubs/outbound-events',
      subscriptionId: process.env.TENANT_ID || 'sap-demo-tenant'
    },
    webhook: {
      enabled: true,
      port: process.env.PORT || 3000,
      host: '0.0.0.0'
    },
    logging: {
      level: 'info',
      console: { enabled: true, colorize: true }
    }
  }

  try {
    // Create SAP adapter instance
    logger.info('Creating SAP Adapter instance')
    const adapter = new SAPAdapter(config, logger)

    // Register event handler for monitoring
    adapter.onEvent((eventType, data) => {
      logger.info(`Event: ${eventType}`, {
        eventId: data.integrationEvent?.eventId,
        success: data.result?.success
      })
    })

    // Initialize and start the adapter
    logger.info('Starting SAP Adapter...')
    const started = await adapter.start()

    if (!started) {
      logger.error('Failed to start SAP Adapter')
      process.exit(1)
    }

    // Display status information
    const status = adapter.getStatus()
    logger.info('SAP Adapter Status:', status)

    // Display health information
    const health = await adapter.getHealth()
    logger.info('SAP Adapter Health:', health)

    logger.info('SAP Adapter is running successfully!')
    logger.info(`Webhook URL: http://localhost:${config.webhook.port}/webhook/events`)
    logger.info('Health Check: http://localhost:' + config.webhook.port + '/health')
    logger.info('Status: http://localhost:' + config.webhook.port + '/status')

    // Test event processing (simulate receiving an event)
    setTimeout(async () => {
      try {
        logger.info('Processing test event...')
        
        const testEvent = {
          eventType: 'Create',
          entityType: 'Product',
          eventId: 'test-product-' + Date.now(),
          timeStamp: new Date().toISOString(),
          sourceSystem: {
            erpName: 'TestERP',
            instanceId: 'test-instance'
          },
          payload: {
            data: {
              id: 'PROD001',
              name: 'Test Product',
              description: 'This is a test product for SAP integration',
              type: 'FERT',
              baseUnit: 'EA',
              materialGroup: 'TEST_GROUP'
            }
          },
          context: {
            header: {
              tenantId: 'test-tenant',
              correlationId: 'test-correlation-' + Date.now()
            }
          }
        }

        const result = await adapter.processEvent(testEvent)
        
        if (result.success) {
          logger.info('Test event processed successfully', {
            eventId: testEvent.eventId,
            processingTime: result.processingTime
          })
        } else {
          logger.error('Test event processing failed', {
            eventId: testEvent.eventId,
            error: result.error
          })
        }

      } catch (error) {
        logger.error('Error processing test event:', error.message)
      }
    }, 5000)

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`)
      
      try {
        await adapter.stop()
        logger.info('SAP Adapter stopped successfully')
        process.exit(0)
      } catch (error) {
        logger.error('Error during shutdown:', error.message)
        process.exit(1)
      }
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Display periodic statistics
    setInterval(async () => {
      try {
        const currentStatus = adapter.getStatus()
        logger.info('Adapter Statistics', {
          eventsProcessed: currentStatus.stats.eventsProcessed,
          eventsSuccessful: currentStatus.stats.eventsSuccessful,
          eventsFailed: currentStatus.stats.eventsFailed,
          averageProcessingTime: Math.round(currentStatus.stats.averageProcessingTime),
          uptime: Math.round(currentStatus.uptime / 1000) + 's'
        })
      } catch (error) {
        logger.error('Error getting statistics:', error.message)
      }
    }, 60000) // Every minute

  } catch (error) {
    logger.error('Fatal error in SAP Adapter:', error.message)
    logger.error('Stack trace:', error.stack)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

// Run the example
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { main }