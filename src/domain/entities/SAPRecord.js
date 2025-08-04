/**
 * SAP Record Entity
 * Represents a record in SAP system with SAP-specific attributes and methods
 */

class SAPRecord {
  constructor({
    id,
    sapEntityType,
    sapKey,
    entityType,
    integrationEventId,
    data,
    sapClient,
    companyCode,
    plant = null,
    warehouse = null,
    language = 'EN',
    createdAt = null,
    updatedAt = null,
    status = 'active',
    version = null,
    changeNumber = null,
    validFrom = null,
    validTo = null
  }) {
    this.id = id
    this.sapEntityType = sapEntityType
    this.sapKey = sapKey
    this.entityType = entityType
    this.integrationEventId = integrationEventId
    this.data = data
    this.sapClient = sapClient
    this.companyCode = companyCode
    this.plant = plant
    this.warehouse = warehouse
    this.language = language
    this.createdAt = createdAt || new Date().toISOString()
    this.updatedAt = updatedAt || new Date().toISOString()
    this.status = status
    this.version = version
    this.changeNumber = changeNumber
    this.validFrom = validFrom
    this.validTo = validTo

    this._validate()
  }

  /**
   * Validate the SAP record
   * @private
   */
  _validate() {
    const errors = []

    if (!this.sapEntityType) {
      errors.push('Missing sapEntityType')
    }

    if (!this.sapKey) {
      errors.push('Missing sapKey')
    }

    if (!this.entityType) {
      errors.push('Missing entityType')
    }

    if (!this.sapClient) {
      errors.push('Missing sapClient')
    }

    if (!this.companyCode) {
      errors.push('Missing companyCode')
    }

    if (!this.data || typeof this.data !== 'object') {
      errors.push('Invalid or missing data')
    }

    if (errors.length > 0) {
      throw new Error(`SAP Record validation failed: ${errors.join(', ')}`)
    }
  }

  /**
   * Create SAP Record from integration event
   * @param {IntegrationEvent} event - Integration event
   * @param {Object} sapConfig - SAP configuration
   * @returns {SAPRecord}
   */
  static fromIntegrationEvent(event, sapConfig) {
    const { EntityType } = require('./IntegrationEvent')
    
    return new SAPRecord({
      id: event.eventId + '_' + Date.now(),
      sapEntityType: EntityType.getSAPEntityMapping(event.entityType),
      sapKey: event.payload?.data?.id || event.eventId,
      entityType: event.entityType,
      integrationEventId: event.eventId,
      data: event.payload?.data || {},
      sapClient: sapConfig.client,
      companyCode: sapConfig.companyCode,
      plant: sapConfig.plant,
      warehouse: sapConfig.warehouse,
      language: sapConfig.language || 'EN'
    })
  }

  /**
   * Convert to SAP RFC structure
   * @returns {Object}
   */
  toRFCStructure() {
    const structure = {
      CLIENT: this.sapClient,
      COMPANY_CODE: this.companyCode,
      ENTITY_TYPE: this.sapEntityType,
      ENTITY_KEY: this.sapKey,
      LANGUAGE: this.language
    }

    // Add plant and warehouse if applicable
    if (this.plant) {
      structure.PLANT = this.plant
    }

    if (this.warehouse) {
      structure.WAREHOUSE = this.warehouse
    }

    // Add validity dates if applicable
    if (this.validFrom) {
      structure.VALID_FROM = this._formatSAPDate(this.validFrom)
    }

    if (this.validTo) {
      structure.VALID_TO = this._formatSAPDate(this.validTo)
    }

    // Add data fields based on entity type
    return {
      ...structure,
      ...this._mapDataToSAPFields()
    }
  }

  /**
   * Map integration data to SAP-specific fields
   * @returns {Object}
   * @private
   */
  _mapDataToSAPFields() {
    const sapFields = {}

    switch (this.sapEntityType) {
      case 'MATERIAL':
        return this._mapMaterialFields()
      case 'CUSTOMER':
        return this._mapCustomerFields()
      case 'VENDOR':
        return this._mapVendorFields()
      case 'SALES_ORDER':
        return this._mapSalesOrderFields()
      case 'PURCHASE_ORDER':
        return this._mapPurchaseOrderFields()
      default:
        // Generic mapping
        return this._mapGenericFields()
    }
  }

  /**
   * Map material-specific fields
   * @returns {Object}
   * @private
   */
  _mapMaterialFields() {
    const data = this.data
    return {
      MATERIAL: data.id || data.code || this.sapKey,
      MATERIAL_TYPE: data.type || 'FERT',
      INDUSTRY_SECTOR: data.industrySector || 'M',
      DESCRIPTION: data.name || data.description || '',
      BASE_UNIT: data.baseUnit || 'EA',
      WEIGHT_UNIT: data.weightUnit || 'KG',
      NET_WEIGHT: data.weight || 0,
      GROSS_WEIGHT: data.grossWeight || data.weight || 0,
      MATERIAL_GROUP: data.materialGroup || data.category,
      DIVISION: data.division || '00',
      CREATED_BY: data.createdBy || 'INTEGRATION',
      CREATED_ON: data.createdAt ? this._formatSAPDate(data.createdAt) : this._formatSAPDate(new Date())
    }
  }

  /**
   * Map customer-specific fields
   * @returns {Object}
   * @private
   */
  _mapCustomerFields() {
    const data = this.data
    return {
      CUSTOMER: data.id || this.sapKey,
      CUSTOMER_TYPE: data.type || 'SOLD_TO',
      NAME1: data.name || data.firstName || '',
      NAME2: data.lastName || '',
      COUNTRY: data.country || 'US',
      CITY: data.city || '',
      POSTAL_CODE: data.postalCode || data.zipCode || '',
      STREET: data.street || data.address || '',
      TELEPHONE: data.phone || '',
      EMAIL: data.email || '',
      CURRENCY: data.currency || 'USD',
      PAYMENT_TERMS: data.paymentTerms || '0001',
      CREATED_BY: data.createdBy || 'INTEGRATION',
      CREATED_ON: data.createdAt ? this._formatSAPDate(data.createdAt) : this._formatSAPDate(new Date())
    }
  }

  /**
   * Map vendor-specific fields
   * @returns {Object}
   * @private
   */
  _mapVendorFields() {
    const data = this.data
    return {
      VENDOR: data.id || this.sapKey,
      VENDOR_TYPE: data.type || 'VENDOR',
      NAME1: data.name || data.companyName || '',
      COUNTRY: data.country || 'US',
      CITY: data.city || '',
      POSTAL_CODE: data.postalCode || data.zipCode || '',
      STREET: data.street || data.address || '',
      TELEPHONE: data.phone || '',
      EMAIL: data.email || '',
      CURRENCY: data.currency || 'USD',
      PAYMENT_TERMS: data.paymentTerms || '0001',
      CREATED_BY: data.createdBy || 'INTEGRATION',
      CREATED_ON: data.createdAt ? this._formatSAPDate(data.createdAt) : this._formatSAPDate(new Date())
    }
  }

  /**
   * Map sales order-specific fields
   * @returns {Object}
   * @private
   */
  _mapSalesOrderFields() {
    const data = this.data
    return {
      SALES_ORDER: data.id || this.sapKey,
      ORDER_TYPE: data.orderType || 'OR',
      SALES_ORG: data.salesOrg || '1000',
      DISTRIBUTION_CHANNEL: data.distributionChannel || '10',
      DIVISION: data.division || '00',
      CUSTOMER: data.customerId || data.soldToParty,
      CURRENCY: data.currency || 'USD',
      ORDER_DATE: data.orderDate ? this._formatSAPDate(data.orderDate) : this._formatSAPDate(new Date()),
      REQUESTED_DELIVERY_DATE: data.requestedDeliveryDate ? this._formatSAPDate(data.requestedDeliveryDate) : null,
      NET_VALUE: data.netValue || data.totalAmount || 0,
      CREATED_BY: data.createdBy || 'INTEGRATION',
      CREATED_ON: data.createdAt ? this._formatSAPDate(data.createdAt) : this._formatSAPDate(new Date())
    }
  }

  /**
   * Map purchase order-specific fields
   * @returns {Object}
   * @private
   */
  _mapPurchaseOrderFields() {
    const data = this.data
    return {
      PURCHASE_ORDER: data.id || this.sapKey,
      DOC_TYPE: data.documentType || 'NB',
      PURCHASING_ORG: data.purchasingOrg || '1000',
      PURCHASING_GROUP: data.purchasingGroup || '001',
      VENDOR: data.vendorId || data.supplier,
      CURRENCY: data.currency || 'USD',
      DOC_DATE: data.documentDate ? this._formatSAPDate(data.documentDate) : this._formatSAPDate(new Date()),
      NET_VALUE: data.netValue || data.totalAmount || 0,
      CREATED_BY: data.createdBy || 'INTEGRATION',
      CREATED_ON: data.createdAt ? this._formatSAPDate(data.createdAt) : this._formatSAPDate(new Date())
    }
  }

  /**
   * Generic field mapping for unknown entity types
   * @returns {Object}
   * @private
   */
  _mapGenericFields() {
    const genericFields = {}
    
    // Map common fields
    Object.entries(this.data).forEach(([key, value]) => {
      // Convert camelCase to UPPER_CASE
      const sapFieldName = key.replace(/([A-Z])/g, '_$1').toUpperCase()
      
      if (typeof value === 'object' && value !== null) {
        genericFields[sapFieldName] = JSON.stringify(value)
      } else {
        genericFields[sapFieldName] = String(value || '')
      }
    })

    return genericFields
  }

  /**
   * Format date for SAP (YYYYMMDD)
   * @param {string|Date} date - Date to format
   * @returns {string}
   * @private
   */
  _formatSAPDate(date) {
    const d = new Date(date)
    if (isNaN(d.getTime())) {
      return ''
    }
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    return `${year}${month}${day}`
  }

  /**
   * Update the record data
   * @param {Object} newData - New data to merge
   */
  updateData(newData) {
    this.data = { ...this.data, ...newData }
    this.updatedAt = new Date().toISOString()
    this.version = (this.version || 0) + 1
  }

  /**
   * Mark record as processed
   * @param {string} changeNumber - SAP change number
   */
  markAsProcessed(changeNumber = null) {
    this.status = 'processed'
    this.updatedAt = new Date().toISOString()
    if (changeNumber) {
      this.changeNumber = changeNumber
    }
  }

  /**
   * Mark record as failed
   * @param {string} error - Error message
   */
  markAsFailed(error) {
    this.status = 'failed'
    this.updatedAt = new Date().toISOString()
    this.error = error
  }

  /**
   * Check if record is valid for processing
   * @returns {boolean}
   */
  isValid() {
    return this.status === 'active' && 
           this.sapKey && 
           this.sapEntityType && 
           this.data
  }

  /**
   * Get SAP table name for this entity type
   * @returns {string}
   */
  getSAPTableName() {
    const tableNames = {
      'MATERIAL': 'MARA',
      'CUSTOMER': 'KNA1',
      'VENDOR': 'LFA1',
      'SALES_ORDER': 'VBAK',
      'PURCHASE_ORDER': 'EKKO',
      'GOODS_RECEIPT': 'MKPF',
      'GOODS_ISSUE': 'MKPF',
      'STOCK': 'MARD',
      'COST_CENTER': 'CSKS',
      'PROFIT_CENTER': 'CEPC',
      'GL_ACCOUNT': 'SKA1'
    }
    
    return tableNames[this.sapEntityType] || 'GENERIC'
  }

  /**
   * Convert to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      sapEntityType: this.sapEntityType,
      sapKey: this.sapKey,
      entityType: this.entityType,
      integrationEventId: this.integrationEventId,
      data: this.data,
      sapClient: this.sapClient,
      companyCode: this.companyCode,
      plant: this.plant,
      warehouse: this.warehouse,
      language: this.language,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status,
      version: this.version,
      changeNumber: this.changeNumber,
      validFrom: this.validFrom,
      validTo: this.validTo
    }
  }
}

module.exports = { SAPRecord }