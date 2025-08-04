/**
 * SAP RFC Service Implementation
 * Handles RFC connections and operations with SAP systems
 */

const rfcClient = require('node-rfc')
const { ISAPService } = require('../../domain/interfaces/ISAPService')
const { ProcessingResult, SAPOperation } = require('../../domain/entities/ProcessingResult')

class SAPRFCService extends ISAPService {
  constructor(logger) {
    super()
    this.logger = logger
    this.client = null
    this.isConnectedFlag = false
    this.connectionConfig = null
    this.lastError = null
    this.connectionStats = {
      connectTime: null,
      lastActivity: null,
      callsExecuted: 0,
      errorsCount: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    }
  }

  /**
   * Connect to SAP system
   * @param {Object} config - SAP connection configuration
   * @returns {Promise<boolean>} Connection success
   */
  async connect(config) {
    try {
      this.logger.info('Connecting to SAP system', {
        host: config.host,
        client: config.client,
        systemNumber: config.systemNumber
      })

      // Validate required configuration
      this._validateConfig(config)

      // Store connection config (excluding sensitive data)
      this.connectionConfig = {
        host: config.host,
        client: config.client,
        systemNumber: config.systemNumber,
        language: config.language || 'EN'
      }

      // Create RFC client
      this.client = new rfcClient.Client(config)

      // Attempt connection
      await this.client.connect()

      this.isConnectedFlag = true
      this.connectionStats.connectTime = new Date()
      this.connectionStats.lastActivity = new Date()
      this.lastError = null

      this.logger.info('Successfully connected to SAP system', {
        client: config.client,
        host: config.host
      })

      return true

    } catch (error) {
      this.lastError = error
      this.isConnectedFlag = false
      
      this.logger.error('Failed to connect to SAP system', {
        error: error.message,
        stack: error.stack
      })

      return false
    }
  }

  /**
   * Disconnect from SAP system
   * @returns {Promise<boolean>} Disconnection success
   */
  async disconnect() {
    try {
      if (this.client && this.isConnectedFlag) {
        await this.client.close()
        this.logger.info('Disconnected from SAP system')
      }

      this.client = null
      this.isConnectedFlag = false
      this.connectionConfig = null

      return true

    } catch (error) {
      this.lastError = error
      this.logger.error('Error disconnecting from SAP system', {
        error: error.message
      })

      return false
    }
  }

  /**
   * Test SAP connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      if (!this.isConnected()) {
        return {
          success: false,
          message: 'Not connected to SAP system',
          timestamp: new Date().toISOString()
        }
      }

      const startTime = Date.now()

      // Execute RFC_SYSTEM_INFO to test connection
      const result = await this.client.call('RFC_SYSTEM_INFO')
      
      const responseTime = Date.now() - startTime

      return {
        success: true,
        message: 'SAP connection test successful',
        timestamp: new Date().toISOString(),
        responseTime,
        systemInfo: {
          rfcSysId: result.RFCSYSID,
          rfcDbSys: result.RFCDBSYS,
          rfcHost: result.RFCHOST,
          rfcOpSys: result.RFCOPSYS,
          rfcRel: result.RFCREL,
          rfcKernRel: result.RFCKERNREL,
          rfcMachClass: result.RFCMACH_CLASS,
          rfcCpuTime: result.RFCCPUTIME,
          rfcTimezone: result.RFCTIMEZONE
        }
      }

    } catch (error) {
      this.lastError = error
      this.connectionStats.errorsCount++

      return {
        success: false,
        message: `SAP connection test failed: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }

  /**
   * Execute RFC function
   * @param {string} functionName - RFC function name
   * @param {Object} parameters - Function parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} RFC result
   */
  async executeRFC(functionName, parameters = {}, options = {}) {
    if (!this.isConnected()) {
      throw new Error('Not connected to SAP system')
    }

    const startTime = Date.now()

    try {
      this.logger.debug('Executing RFC function', {
        function: functionName,
        parameters: this._sanitizeParameters(parameters)
      })

      const result = await this.client.call(functionName, parameters)
      
      const responseTime = Date.now() - startTime
      this._updateConnectionStats(responseTime)

      this.logger.debug('RFC function executed successfully', {
        function: functionName,
        responseTime
      })

      return {
        ...result,
        FUNCTION_NAME: functionName,
        EXECUTION_TIME: responseTime,
        SUCCESS: true
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      this.lastError = error
      this.connectionStats.errorsCount++
      this._updateConnectionStats(responseTime)

      this.logger.error('RFC function execution failed', {
        function: functionName,
        error: error.message,
        responseTime
      })

      throw error
    }
  }

  /**
   * Execute BAPI function
   * @param {string} bapiName - BAPI function name
   * @param {Object} parameters - BAPI parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} BAPI result
   */
  async executeBAPI(bapiName, parameters = {}, options = {}) {
    // BAPIs are special RFC functions, but we can use the same execution method
    const result = await this.executeRFC(bapiName, parameters, options)

    // Add BAPI-specific processing
    if (options.commitWork !== false && result.RETURN && !this._hasBAPIErrors(result.RETURN)) {
      try {
        // Execute BAPI_TRANSACTION_COMMIT if no errors
        await this.executeRFC('BAPI_TRANSACTION_COMMIT', { WAIT: 'X' })
        this.logger.debug('BAPI transaction committed', { bapi: bapiName })
      } catch (commitError) {
        this.logger.warn('Failed to commit BAPI transaction', {
          bapi: bapiName,
          error: commitError.message
        })
      }
    }

    return result
  }

  /**
   * Create record in SAP
   * @param {string} entityType - SAP entity type
   * @param {Object} data - Record data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Creation result
   */
  async createRecord(entityType, data, options = {}) {
    const operation = SAPOperation.CREATE
    let bapiFunction = null
    let parameters = {}

    try {
      // Determine appropriate BAPI based on entity type
      switch (entityType.toUpperCase()) {
        case 'MATERIAL':
          bapiFunction = 'BAPI_MATERIAL_SAVEDATA'
          parameters = this._buildMaterialCreateParameters(data)
          break

        case 'CUSTOMER':
          bapiFunction = 'BAPI_CUSTOMER_CREATEFROMDATA1'
          parameters = this._buildCustomerCreateParameters(data)
          break

        case 'VENDOR':
          bapiFunction = 'BAPI_VENDOR_CREATE'
          parameters = this._buildVendorCreateParameters(data)
          break

        case 'SALES_ORDER':
          bapiFunction = 'BAPI_SALESORDER_CREATEFROMDAT2'
          parameters = this._buildSalesOrderCreateParameters(data)
          break

        case 'PURCHASE_ORDER':
          bapiFunction = 'BAPI_PO_CREATE1'
          parameters = this._buildPurchaseOrderCreateParameters(data)
          break

        default:
          throw new Error(`Unsupported entity type for creation: ${entityType}`)
      }

      // Execute BAPI
      const result = await this.executeBAPI(bapiFunction, parameters, options)

      return ProcessingResult.fromBAPIResult('', entityType, operation, result)

    } catch (error) {
      return ProcessingResult.failure('', entityType, operation, error)
    }
  }

  /**
   * Update record in SAP
   * @param {string} entityType - SAP entity type
   * @param {string} sapKey - SAP record key
   * @param {Object} data - Updated data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateRecord(entityType, sapKey, data, options = {}) {
    const operation = SAPOperation.UPDATE
    let bapiFunction = null
    let parameters = {}

    try {
      // Determine appropriate BAPI based on entity type
      switch (entityType.toUpperCase()) {
        case 'MATERIAL':
          bapiFunction = 'BAPI_MATERIAL_SAVEDATA'
          parameters = this._buildMaterialUpdateParameters(sapKey, data)
          break

        case 'CUSTOMER':
          bapiFunction = 'BAPI_CUSTOMER_CHANGE'
          parameters = this._buildCustomerUpdateParameters(sapKey, data)
          break

        case 'VENDOR':
          bapiFunction = 'BAPI_VENDOR_CHANGE'
          parameters = this._buildVendorUpdateParameters(sapKey, data)
          break

        case 'SALES_ORDER':
          bapiFunction = 'BAPI_SALESORDER_CHANGE'
          parameters = this._buildSalesOrderUpdateParameters(sapKey, data)
          break

        default:
          throw new Error(`Unsupported entity type for update: ${entityType}`)
      }

      // Execute BAPI
      const result = await this.executeBAPI(bapiFunction, parameters, options)

      return ProcessingResult.fromBAPIResult('', entityType, operation, result)

    } catch (error) {
      return ProcessingResult.failure('', entityType, operation, error)
    }
  }

  /**
   * Delete record in SAP
   * @param {string} entityType - SAP entity type
   * @param {string} sapKey - SAP record key
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteRecord(entityType, sapKey, options = {}) {
    const operation = SAPOperation.DELETE

    try {
      // Most SAP entities use flagging for deletion rather than physical deletion
      const flagForDeletion = options.flagForDeletion !== false

      if (flagForDeletion) {
        // Flag record for deletion
        return await this.updateRecord(entityType, sapKey, { 
          DELETION_FLAG: 'X',
          DELETION_DATE: new Date().toISOString().split('T')[0].replace(/-/g, '')
        }, options)
      } else {
        throw new Error(`Physical deletion not supported for entity type: ${entityType}`)
      }

    } catch (error) {
      return ProcessingResult.failure('', entityType, operation, error)
    }
  }

  /**
   * Read record from SAP
   * @param {string} entityType - SAP entity type
   * @param {string} sapKey - SAP record key
   * @param {Object} options - Read options
   * @returns {Promise<Object>} Record data
   */
  async readRecord(entityType, sapKey, options = {}) {
    const operation = SAPOperation.READ
    let bapiFunction = null
    let parameters = {}

    try {
      // Determine appropriate BAPI based on entity type
      switch (entityType.toUpperCase()) {
        case 'MATERIAL':
          bapiFunction = 'BAPI_MATERIAL_GET_DETAIL'
          parameters = { MATERIAL: sapKey }
          break

        case 'CUSTOMER':
          bapiFunction = 'BAPI_CUSTOMER_GETDETAIL2'
          parameters = { CUSTOMERNO: sapKey }
          break

        case 'VENDOR':
          bapiFunction = 'BAPI_VENDOR_GETDETAIL'
          parameters = { VENDORNO: sapKey }
          break

        case 'SALES_ORDER':
          bapiFunction = 'BAPI_SALESORDER_GETDETAIL'
          parameters = { SALESDOCUMENT: sapKey }
          break

        default:
          throw new Error(`Unsupported entity type for read: ${entityType}`)
      }

      // Execute BAPI
      const result = await this.executeBAPI(bapiFunction, parameters, { commitWork: false })

      return ProcessingResult.fromBAPIResult('', entityType, operation, result)

    } catch (error) {
      return ProcessingResult.failure('', entityType, operation, error)
    }
  }

  /**
   * Search records in SAP
   * @param {string} entityType - SAP entity type
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Found records
   */
  async searchRecords(entityType, criteria, options = {}) {
    const operation = SAPOperation.READ
    let bapiFunction = null
    let parameters = {}

    try {
      // Determine appropriate BAPI based on entity type
      switch (entityType.toUpperCase()) {
        case 'MATERIAL':
          bapiFunction = 'BAPI_MATERIAL_GETLIST'
          parameters = this._buildMaterialSearchParameters(criteria, options)
          break

        case 'CUSTOMER':
          bapiFunction = 'BAPI_CUSTOMER_GETLIST'
          parameters = this._buildCustomerSearchParameters(criteria, options)
          break

        case 'VENDOR':
          bapiFunction = 'BAPI_VENDOR_GETLIST'
          parameters = this._buildVendorSearchParameters(criteria, options)
          break

        default:
          // Use generic table read for other entity types
          return await this._searchUsingRFC(entityType, criteria, options)
      }

      // Execute BAPI
      const result = await this.executeBAPI(bapiFunction, parameters, { commitWork: false })

      if (result.SUCCESS) {
        return result
      } else {
        return ProcessingResult.failure('', entityType, operation, 'Search failed')
      }

    } catch (error) {
      return ProcessingResult.failure('', entityType, operation, error)
    }
  }

  /**
   * Get SAP system information
   * @returns {Promise<Object>} System information
   */
  async getSystemInfo() {
    try {
      const result = await this.executeRFC('RFC_SYSTEM_INFO')
      return {
        success: true,
        systemInfo: result,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  isConnected() {
    return this.isConnectedFlag && this.client !== null
  }

  /**
   * Get last error
   * @returns {Error|null} Last error
   */
  getLastError() {
    return this.lastError
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    return {
      ...this.connectionStats,
      isConnected: this.isConnected(),
      config: this.connectionConfig
    }
  }

  // Private helper methods

  /**
   * Validate SAP connection configuration
   * @param {Object} config - Configuration to validate
   * @private
   */
  _validateConfig(config) {
    const required = ['host', 'systemNumber', 'client', 'user', 'passwd']
    const missing = required.filter(field => !config[field])
    
    if (missing.length > 0) {
      throw new Error(`Missing required SAP configuration: ${missing.join(', ')}`)
    }
  }

  /**
   * Update connection statistics
   * @param {number} responseTime - Response time in milliseconds
   * @private
   */
  _updateConnectionStats(responseTime) {
    this.connectionStats.lastActivity = new Date()
    this.connectionStats.callsExecuted++
    this.connectionStats.totalResponseTime += responseTime
    this.connectionStats.averageResponseTime = 
      this.connectionStats.totalResponseTime / this.connectionStats.callsExecuted
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   * @param {Object} parameters - Parameters to sanitize
   * @returns {Object} Sanitized parameters
   * @private
   */
  _sanitizeParameters(parameters) {
    const sensitiveFields = ['passwd', 'password', 'pwd', 'secret', 'token']
    const sanitized = { ...parameters }

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '***'
      }
    })

    return sanitized
  }

  /**
   * Check if BAPI result contains errors
   * @param {Array|Object} returnMessages - BAPI return messages
   * @returns {boolean} Has errors
   * @private
   */
  _hasBAPIErrors(returnMessages) {
    const messages = Array.isArray(returnMessages) ? returnMessages : [returnMessages]
    return messages.some(msg => msg.TYPE === 'E' || msg.TYPE === 'A')
  }

  // Entity-specific parameter builders (simplified versions)

  _buildMaterialCreateParameters(data) {
    return {
      HEADDATA: {
        MATERIAL: data.MATERIAL || '',
        IND_SECTOR: data.INDUSTRY_SECTOR || 'M',
        MATL_TYPE: data.MATERIAL_TYPE || 'FERT',
        BASIC_VIEW: 'X'
      },
      CLIENTDATA: {
        BASE_UOM: data.BASE_UNIT || 'EA'
      },
      CLIENTDATAX: {
        BASE_UOM: 'X'
      }
    }
  }

  _buildMaterialUpdateParameters(sapKey, data) {
    return {
      HEADDATA: {
        MATERIAL: sapKey
      },
      CLIENTDATA: data,
      CLIENTDATAX: this._buildUpdateFlags(data)
    }
  }

  _buildCustomerCreateParameters(data) {
    return {
      PI_CUSTOMER: data.CUSTOMER || '',
      PI_PERSONALDATA: {
        FIRSTNAME: data.NAME1 || '',
        LASTNAME: data.NAME2 || '',
        COUNTRY: data.COUNTRY || 'US'
      }
    }
  }

  _buildUpdateFlags(data) {
    const flags = {}
    Object.keys(data).forEach(key => {
      flags[key] = 'X'
    })
    return flags
  }

  async _searchUsingRFC(entityType, criteria, options) {
    // Generic search using RFC_READ_TABLE
    const tableName = this._getTableNameForEntity(entityType)
    const parameters = {
      QUERY_TABLE: tableName,
      DELIMITER: '|',
      ROWCOUNT: options.limit || 100,
      ROWSKIPS: options.offset || 0
    }

    // Build WHERE conditions
    if (criteria && Object.keys(criteria).length > 0) {
      parameters.OPTIONS = Object.entries(criteria).map(([field, value]) => ({
        TEXT: `${field} EQ '${value}'`
      }))
    }

    const result = await this.executeRFC('RFC_READ_TABLE', parameters)
    return result
  }

  _getTableNameForEntity(entityType) {
    const tableNames = {
      'MATERIAL': 'MARA',
      'CUSTOMER': 'KNA1',
      'VENDOR': 'LFA1',
      'SALES_ORDER': 'VBAK',
      'PURCHASE_ORDER': 'EKKO'
    }
    return tableNames[entityType.toUpperCase()] || entityType
  }
}

module.exports = { SAPRFCService }