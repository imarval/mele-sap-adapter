/**
 * Processing Result Entity
 * Represents the result of processing an integration event in SAP
 */

class ProcessingResult {
  constructor({
    success,
    eventId,
    entityType,
    operation,
    sapResult = null,
    message = null,
    error = null,
    metadata = null,
    timestamp = null,
    processingTime = null,
    retryable = true
  }) {
    this.success = success
    this.eventId = eventId
    this.entityType = entityType
    this.operation = operation
    this.sapResult = sapResult
    this.message = message
    this.error = error
    this.metadata = metadata || {}
    this.timestamp = timestamp || new Date().toISOString()
    this.processingTime = processingTime
    this.retryable = retryable
  }

  /**
   * Create a successful result
   * @param {string} eventId - Event ID
   * @param {string} entityType - Entity type
   * @param {string} operation - Operation performed
   * @param {Object} sapResult - SAP operation result
   * @param {Object} metadata - Additional metadata
   * @returns {ProcessingResult}
   */
  static success(eventId, entityType, operation, sapResult, metadata = {}) {
    return new ProcessingResult({
      success: true,
      eventId,
      entityType,
      operation,
      sapResult,
      message: `Successfully processed ${operation} for ${entityType}`,
      metadata,
      retryable: false
    })
  }

  /**
   * Create a failed result
   * @param {string} eventId - Event ID
   * @param {string} entityType - Entity type
   * @param {string} operation - Operation attempted
   * @param {Error|string} error - Error that occurred
   * @param {boolean} retryable - Whether the operation can be retried
   * @param {Object} metadata - Additional metadata
   * @returns {ProcessingResult}
   */
  static failure(eventId, entityType, operation, error, retryable = true, metadata = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    return new ProcessingResult({
      success: false,
      eventId,
      entityType,
      operation,
      error: errorMessage,
      message: `Failed to process ${operation} for ${entityType}: ${errorMessage}`,
      metadata,
      retryable
    })
  }

  /**
   * Create result from SAP RFC response
   * @param {string} eventId - Event ID
   * @param {string} entityType - Entity type
   * @param {string} operation - Operation performed
   * @param {Object} rfcResult - RFC function result
   * @returns {ProcessingResult}
   */
  static fromRFCResult(eventId, entityType, operation, rfcResult) {
    const hasErrors = rfcResult.ET_RETURN && 
                     rfcResult.ET_RETURN.some(msg => msg.TYPE === 'E' || msg.TYPE === 'A')

    if (hasErrors) {
      const errorMessages = rfcResult.ET_RETURN
        .filter(msg => msg.TYPE === 'E' || msg.TYPE === 'A')
        .map(msg => `${msg.ID}${msg.NUMBER}: ${msg.MESSAGE}`)
        .join('; ')

      return ProcessingResult.failure(
        eventId,
        entityType,
        operation,
        `SAP RFC Error: ${errorMessages}`,
        true,
        {
          rfcMessages: rfcResult.ET_RETURN,
          rfcFunction: rfcResult.FUNCTION_NAME
        }
      )
    }

    // Check for warnings
    const warnings = rfcResult.ET_RETURN && 
                     rfcResult.ET_RETURN.filter(msg => msg.TYPE === 'W')

    return ProcessingResult.success(
      eventId,
      entityType,
      operation,
      rfcResult,
      {
        warnings: warnings || [],
        rfcFunction: rfcResult.FUNCTION_NAME,
        sapMessages: rfcResult.ET_RETURN || []
      }
    )
  }

  /**
   * Create result from SAP BAPI response
   * @param {string} eventId - Event ID
   * @param {string} entityType - Entity type
   * @param {string} operation - Operation performed
   * @param {Object} bapiResult - BAPI function result
   * @returns {ProcessingResult}
   */
  static fromBAPIResult(eventId, entityType, operation, bapiResult) {
    // Check BAPI return structure
    const returnMessages = bapiResult.RETURN || bapiResult.ET_RETURN || []
    const messages = Array.isArray(returnMessages) ? returnMessages : [returnMessages]
    
    const hasErrors = messages.some(msg => 
      msg.TYPE === 'E' || msg.TYPE === 'A' || msg.MESSAGE_TYPE === 'E'
    )

    if (hasErrors) {
      const errorMessages = messages
        .filter(msg => msg.TYPE === 'E' || msg.TYPE === 'A' || msg.MESSAGE_TYPE === 'E')
        .map(msg => `${msg.ID || msg.MESSAGE_ID}${msg.NUMBER || msg.MESSAGE_NUMBER}: ${msg.MESSAGE}`)
        .join('; ')

      return ProcessingResult.failure(
        eventId,
        entityType,
        operation,
        `SAP BAPI Error: ${errorMessages}`,
        true,
        {
          bapiMessages: messages,
          bapiFunction: bapiResult.FUNCTION_NAME
        }
      )
    }

    // Extract created/changed object key if available
    const objectKey = bapiResult.MATERIAL || 
                     bapiResult.CUSTOMER || 
                     bapiResult.VENDOR || 
                     bapiResult.SALESDOCUMENT ||
                     bapiResult.PURCHASEORDER ||
                     bapiResult.DOCUMENT_NUMBER

    return ProcessingResult.success(
      eventId,
      entityType,
      operation,
      bapiResult,
      {
        objectKey,
        bapiMessages: messages,
        bapiFunction: bapiResult.FUNCTION_NAME
      }
    )
  }

  /**
   * Add processing time information
   * @param {number} startTime - Start time in milliseconds
   */
  setProcessingTime(startTime) {
    this.processingTime = Date.now() - startTime
    this.metadata.processingTimeMs = this.processingTime
  }

  /**
   * Add SAP-specific metadata
   * @param {Object} sapMetadata - SAP metadata to add
   */
  addSAPMetadata(sapMetadata) {
    this.metadata = {
      ...this.metadata,
      sap: {
        ...this.metadata.sap,
        ...sapMetadata
      }
    }
  }

  /**
   * Check if the operation should be retried
   * @param {number} currentAttempt - Current retry attempt
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {boolean}
   */
  shouldRetry(currentAttempt, maxRetries) {
    return !this.success && 
           this.retryable && 
           currentAttempt < maxRetries
  }

  /**
   * Get summary message for logging
   * @returns {string}
   */
  getSummary() {
    const status = this.success ? 'SUCCESS' : 'FAILURE'
    const processingTime = this.processingTime ? ` (${this.processingTime}ms)` : ''
    
    return `[${status}] ${this.operation} ${this.entityType} - Event: ${this.eventId}${processingTime}`
  }

  /**
   * Get detailed information for debugging
   * @returns {Object}
   */
  getDetails() {
    return {
      success: this.success,
      eventId: this.eventId,
      entityType: this.entityType,
      operation: this.operation,
      message: this.message,
      error: this.error,
      timestamp: this.timestamp,
      processingTime: this.processingTime,
      retryable: this.retryable,
      sapResult: this.sapResult,
      metadata: this.metadata
    }
  }

  /**
   * Convert to JSON for storage or transmission
   * @returns {Object}
   */
  toJSON() {
    return {
      success: this.success,
      eventId: this.eventId,
      entityType: this.entityType,
      operation: this.operation,
      sapResult: this.sapResult,
      message: this.message,
      error: this.error,
      metadata: this.metadata,
      timestamp: this.timestamp,
      processingTime: this.processingTime,
      retryable: this.retryable
    }
  }

  /**
   * Create ProcessingResult from JSON
   * @param {Object} json - JSON representation
   * @returns {ProcessingResult}
   */
  static fromJSON(json) {
    return new ProcessingResult(json)
  }
}

/**
 * SAP Operation Types
 */
class SAPOperation {
  static CREATE = 'CREATE'
  static UPDATE = 'UPDATE'
  static DELETE = 'DELETE'
  static READ = 'READ'
  static SYNC = 'SYNC'
  static VALIDATE = 'VALIDATE'

  static getAllOperations() {
    return [
      this.CREATE, this.UPDATE, this.DELETE, 
      this.READ, this.SYNC, this.VALIDATE
    ]
  }

  static isValid(operation) {
    return this.getAllOperations().includes(operation)
  }
}

module.exports = {
  ProcessingResult,
  SAPOperation
}