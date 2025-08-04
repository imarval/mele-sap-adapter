/**
 * SAP Adapter Main Entry Point
 * Entry point for the SAP Integration Adapter
 */

const { SAPAdapter } = require('./src/application/SAPAdapter')
const { SAPRFCService } = require('./src/infrastructure/sap/SAPRFCService')
const { SignalRClient } = require('./src/infrastructure/signalr/SignalRClient')
const { WebhookServer } = require('./src/infrastructure/http/WebhookServer')
const { IntegrationEvent, EventType, EntityType } = require('./src/domain/entities/IntegrationEvent')
const { SAPRecord } = require('./src/domain/entities/SAPRecord')
const { ProcessingResult, SAPOperation } = require('./src/domain/entities/ProcessingResult')

// Export main classes for external use
module.exports = {
  // Main adapter class
  SAPAdapter,
  
  // Infrastructure services
  SAPRFCService,
  SignalRClient,
  WebhookServer,
  
  // Domain entities
  IntegrationEvent,
  SAPRecord,
  ProcessingResult,
  
  // Enums and constants
  EventType,
  EntityType,
  SAPOperation,
  
  // Utility functions
  createSAPAdapter: (config, logger) => {
    return new SAPAdapter(config, logger)
  },
  
  // Version information
  version: require('./package.json').version
}