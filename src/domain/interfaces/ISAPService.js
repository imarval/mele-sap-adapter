/**
 * ISAPService Interface
 * Defines the contract for SAP integration services
 */

class ISAPService {
  /**
   * Connect to SAP system
   * @param {Object} config - SAP connection configuration
   * @returns {Promise<boolean>} Connection success
   */
  async connect(config) {
    throw new Error('Method connect must be implemented')
  }

  /**
   * Disconnect from SAP system
   * @returns {Promise<boolean>} Disconnection success
   */
  async disconnect() {
    throw new Error('Method disconnect must be implemented')
  }

  /**
   * Test SAP connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    throw new Error('Method testConnection must be implemented')
  }

  /**
   * Execute RFC function
   * @param {string} functionName - RFC function name
   * @param {Object} parameters - Function parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} RFC result
   */
  async executeRFC(functionName, parameters, options = {}) {
    throw new Error('Method executeRFC must be implemented')
  }

  /**
   * Execute BAPI function
   * @param {string} bapiName - BAPI function name
   * @param {Object} parameters - BAPI parameters
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} BAPI result
   */
  async executeBAPI(bapiName, parameters, options = {}) {
    throw new Error('Method executeBAPI must be implemented')
  }

  /**
   * Create record in SAP
   * @param {string} entityType - SAP entity type
   * @param {Object} data - Record data
   * @param {Object} options - Creation options
   * @returns {Promise<Object>} Creation result
   */
  async createRecord(entityType, data, options = {}) {
    throw new Error('Method createRecord must be implemented')
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
    throw new Error('Method updateRecord must be implemented')
  }

  /**
   * Delete record in SAP
   * @param {string} entityType - SAP entity type
   * @param {string} sapKey - SAP record key
   * @param {Object} options - Deletion options
   * @returns {Promise<Object>} Deletion result
   */
  async deleteRecord(entityType, sapKey, options = {}) {
    throw new Error('Method deleteRecord must be implemented')
  }

  /**
   * Read record from SAP
   * @param {string} entityType - SAP entity type
   * @param {string} sapKey - SAP record key
   * @param {Object} options - Read options
   * @returns {Promise<Object>} Record data
   */
  async readRecord(entityType, sapKey, options = {}) {
    throw new Error('Method readRecord must be implemented')
  }

  /**
   * Search records in SAP
   * @param {string} entityType - SAP entity type
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Found records
   */
  async searchRecords(entityType, criteria, options = {}) {
    throw new Error('Method searchRecords must be implemented')
  }

  /**
   * Get SAP system information
   * @returns {Promise<Object>} System information
   */
  async getSystemInfo() {
    throw new Error('Method getSystemInfo must be implemented')
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  isConnected() {
    throw new Error('Method isConnected must be implemented')
  }

  /**
   * Get last error
   * @returns {Error|null} Last error
   */
  getLastError() {
    throw new Error('Method getLastError must be implemented')
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection statistics
   */
  getConnectionStats() {
    throw new Error('Method getConnectionStats must be implemented')
  }
}

module.exports = { ISAPService }