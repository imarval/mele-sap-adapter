/**
 * SAP Integration Event Entity
 * Represents an integration event with SAP-specific validations and transformations
 */

class IntegrationEvent {
  constructor({
    eventType,
    entityType,
    eventId,
    timestamp,
    sourceSystem,
    payload,
    context,
    sapSpecific = null
  }) {
    this.eventType = eventType
    this.entityType = entityType
    this.eventId = eventId
    this.timestamp = timestamp || new Date().toISOString()
    this.sourceSystem = sourceSystem
    this.payload = payload
    this.context = context
    this.sapSpecific = sapSpecific
    this.processedAt = null
    this.retryCount = 0
    this.status = 'pending'
    this.errors = []

    this._validate()
  }

  /**
   * Validate the integration event
   * @private
   */
  _validate() {
    const errors = []

    if (!this.eventType || !EventType.isValid(this.eventType)) {
      errors.push('Invalid or missing eventType')
    }

    if (!this.entityType || !EntityType.isValid(this.entityType)) {
      errors.push('Invalid or missing entityType')
    }

    if (!this.eventId) {
      errors.push('Missing eventId')
    }

    if (!this.timestamp) {
      errors.push('Missing timestamp')
    }

    if (this.payload && !this.payload.data) {
      errors.push('Payload must contain data property')
    }

    if (errors.length > 0) {
      throw new Error(`Integration Event validation failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Create IntegrationEvent from IntegrationBridge DTO
   * @param {Object} dto - Integration Bridge DTO
   * @returns {IntegrationEvent}
   */
  static fromIntegrationBridgeDto(dto) {
    return new IntegrationEvent({
      eventType: dto.eventType || dto.EventType,
      entityType: dto.entityType || dto.EntityType,
      eventId: dto.eventId || dto.EventId,
      timestamp: dto.timeStamp || dto.TimeStamp,
      sourceSystem: dto.sourceSystem || dto.SourceSystem,
      payload: dto.payload || dto.Payload,
      context: dto.context || dto.Context
    })
  }

  /**
   * Convert to SAP-compatible format
   * @returns {Object}
   */
  toSAPFormat() {
    const sapData = {
      EVENT_TYPE: this.eventType,
      ENTITY_TYPE: this.entityType,
      EVENT_ID: this.eventId,
      TIMESTAMP: this.timestamp,
      SOURCE_SYSTEM: this.sourceSystem?.erpName || 'IntegrationBridge',
      DATA: this.payload?.data || {},
      TENANT_ID: this.context?.header?.tenantId || '',
      CORRELATION_ID: this.context?.header?.correlationId || this.eventId
    }

    // Add SAP-specific fields if available
    if (this.sapSpecific) {
      sapData.SAP_CLIENT = this.sapSpecific.client
      sapData.SAP_COMPANY_CODE = this.sapSpecific.companyCode
      sapData.SAP_PLANT = this.sapSpecific.plant
      sapData.SAP_WAREHOUSE = this.sapSpecific.warehouse
    }

    return sapData
  }

  /**
   * Convert to RFC parameters format
   * @returns {Object}
   */
  toRFCParameters() {
    const rfcParams = {
      IV_EVENT_TYPE: this.eventType,
      IV_ENTITY_TYPE: this.entityType,
      IV_EVENT_ID: this.eventId,
      IV_TIMESTAMP: this.timestamp,
      IV_SOURCE_SYSTEM: this.sourceSystem?.erpName || 'IntegrationBridge'
    }

    // Convert payload data to RFC table format
    if (this.payload?.data) {
      rfcParams.IT_DATA = this._convertToRFCTable(this.payload.data)
    }

    // Add context information
    if (this.context?.header) {
      rfcParams.IV_TENANT_ID = this.context.header.tenantId || ''
      rfcParams.IV_CORRELATION_ID = this.context.header.correlationId || this.eventId
    }

    return rfcParams
  }

  /**
   * Convert JavaScript object to SAP RFC table format
   * @param {Object} data - Data to convert
   * @returns {Array}
   * @private
   */
  _convertToRFCTable(data) {
    if (Array.isArray(data)) {
      return data
    }

    // Convert object to RFC table structure
    return Object.entries(data).map(([key, value]) => ({
      FIELD_NAME: key,
      FIELD_VALUE: typeof value === 'object' ? JSON.stringify(value) : String(value),
      DATA_TYPE: this._getSAPDataType(value)
    }))
  }

  /**
   * Determine SAP data type for a value
   * @param {*} value - Value to analyze
   * @returns {string}
   * @private
   */
  _getSAPDataType(value) {
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'I' : 'P' // Integer or Packed
    }
    if (typeof value === 'boolean') {
      return 'C' // Character
    }
    if (value instanceof Date) {
      return 'D' // Date
    }
    if (typeof value === 'string') {
      return value.length > 255 ? 'STRING' : 'C' // String or Character
    }
    return 'STRING' // Default to string
  }

  /**
   * Mark event as processed
   * @param {Object} result - Processing result
   */
  markAsProcessed(result) {
    this.status = result.success ? 'completed' : 'failed'
    this.processedAt = new Date().toISOString()
    
    if (!result.success && result.error) {
      this.errors.push({
        timestamp: new Date().toISOString(),
        error: result.error,
        retryCount: this.retryCount
      })
    }
  }

  /**
   * Mark event for retry
   */
  markForRetry() {
    this.retryCount += 1
    this.status = 'retry'
  }

  /**
   * Check if event can be retried
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {boolean}
   */
  canRetry(maxRetries = 3) {
    return this.retryCount < maxRetries && this.status === 'failed'
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      eventType: this.eventType,
      entityType: this.entityType,
      eventId: this.eventId,
      timestamp: this.timestamp,
      sourceSystem: this.sourceSystem,
      payload: this.payload,
      context: this.context,
      sapSpecific: this.sapSpecific,
      processedAt: this.processedAt,
      retryCount: this.retryCount,
      status: this.status,
      errors: this.errors
    }
  }
}

/**
 * Event Types enumeration
 */
class EventType {
  static CREATE = 'Create'
  static UPDATE = 'Update'
  static DELETE = 'Delete'
  static SYNC = 'Sync'

  static getAllTypes() {
    return [this.CREATE, this.UPDATE, this.DELETE, this.SYNC]
  }

  static isValid(eventType) {
    return this.getAllTypes().includes(eventType)
  }
}

/**
 * SAP Entity Types enumeration
 */
class EntityType {
  // Standard entities
  static PRODUCT = 'Product'
  static USER = 'User'
  static STORE = 'Store'
  static INVOICE = 'Invoice'

  // SAP-specific entities
  static MATERIAL = 'Material'
  static CUSTOMER = 'Customer'
  static VENDOR = 'Vendor'
  static SALES_ORDER = 'SalesOrder'
  static PURCHASE_ORDER = 'PurchaseOrder'
  static GOODS_RECEIPT = 'GoodsReceipt'
  static GOODS_ISSUE = 'GoodsIssue'
  static INVENTORY = 'Inventory'
  static COST_CENTER = 'CostCenter'
  static PROFIT_CENTER = 'ProfitCenter'
  static GL_ACCOUNT = 'GLAccount'

  static getAllTypes() {
    return [
      this.PRODUCT, this.USER, this.STORE, this.INVOICE,
      this.MATERIAL, this.CUSTOMER, this.VENDOR,
      this.SALES_ORDER, this.PURCHASE_ORDER,
      this.GOODS_RECEIPT, this.GOODS_ISSUE, this.INVENTORY,
      this.COST_CENTER, this.PROFIT_CENTER, this.GL_ACCOUNT
    ]
  }

  static isValid(entityType) {
    return this.getAllTypes().includes(entityType)
  }

  static getSAPEntityMapping(entityType) {
    const mappings = {
      [this.PRODUCT]: 'MATERIAL',
      [this.USER]: 'USER',
      [this.STORE]: 'PLANT',
      [this.INVOICE]: 'BILLING_DOCUMENT',
      [this.MATERIAL]: 'MATERIAL',
      [this.CUSTOMER]: 'CUSTOMER',
      [this.VENDOR]: 'VENDOR',
      [this.SALES_ORDER]: 'SALES_ORDER',
      [this.PURCHASE_ORDER]: 'PURCHASE_ORDER',
      [this.GOODS_RECEIPT]: 'GOODS_RECEIPT',
      [this.GOODS_ISSUE]: 'GOODS_ISSUE',
      [this.INVENTORY]: 'STOCK',
      [this.COST_CENTER]: 'COST_CENTER',
      [this.PROFIT_CENTER]: 'PROFIT_CENTER',
      [this.GL_ACCOUNT]: 'GL_ACCOUNT'
    }
    return mappings[entityType] || entityType
  }
}

/**
 * Source System information
 */
class SourceSystem {
  constructor({ erpName, instanceId, version = null }) {
    this.erpName = erpName
    this.instanceId = instanceId
    this.version = version
  }

  static fromDTO(dto) {
    if (!dto) return null
    return new SourceSystem({
      erpName: dto.erpName,
      instanceId: dto.instanceId,
      version: dto.version
    })
  }
}

/**
 * Event Payload
 */
class Payload {
  constructor({ data, metadata = null }) {
    this.data = data
    this.metadata = metadata
  }

  static fromDTO(dto) {
    if (!dto) return null
    return new Payload({
      data: dto.data,
      metadata: dto.metadata
    })
  }
}

/**
 * Event Context
 */
class Context {
  constructor({ header, retryCount = 0 }) {
    this.header = header
    this.retryCount = retryCount
  }

  static fromDTO(dto) {
    if (!dto) return null
    return new Context({
      header: dto.header,
      retryCount: dto.retryCount || 0
    })
  }
}

module.exports = {
  IntegrationEvent,
  EventType,
  EntityType,
  SourceSystem,
  Payload,
  Context
}