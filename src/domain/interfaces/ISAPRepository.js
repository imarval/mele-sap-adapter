/**
 * ISAPRepository Interface
 * Defines the contract for SAP record persistence
 */

class ISAPRepository {
  /**
   * Save SAP record
   * @param {SAPRecord} sapRecord - SAP record to save
   * @returns {Promise<SAPRecord>} Saved record
   */
  async save(sapRecord) {
    throw new Error('Method save must be implemented')
  }

  /**
   * Find SAP record by ID
   * @param {string} id - Record ID
   * @returns {Promise<SAPRecord|null>} Found record or null
   */
  async findById(id) {
    throw new Error('Method findById must be implemented')
  }

  /**
   * Find SAP record by SAP key
   * @param {string} sapKey - SAP record key
   * @param {string} sapEntityType - SAP entity type
   * @param {string} sapClient - SAP client
   * @returns {Promise<SAPRecord|null>} Found record or null
   */
  async findBySAPKey(sapKey, sapEntityType, sapClient) {
    throw new Error('Method findBySAPKey must be implemented')
  }

  /**
   * Find SAP record by integration event ID
   * @param {string} integrationEventId - Integration event ID
   * @returns {Promise<SAPRecord|null>} Found record or null
   */
  async findByIntegrationEventId(integrationEventId) {
    throw new Error('Method findByIntegrationEventId must be implemented')
  }

  /**
   * Find SAP records by entity type
   * @param {string} entityType - Entity type
   * @param {number} limit - Record limit
   * @param {number} offset - Record offset
   * @returns {Promise<Array<SAPRecord>>} Found records
   */
  async findByEntityType(entityType, limit = 100, offset = 0) {
    throw new Error('Method findByEntityType must be implemented')
  }

  /**
   * Find SAP records by status
   * @param {string} status - Record status
   * @param {number} limit - Record limit
   * @param {number} offset - Record offset
   * @returns {Promise<Array<SAPRecord>>} Found records
   */
  async findByStatus(status, limit = 100, offset = 0) {
    throw new Error('Method findByStatus must be implemented')
  }

  /**
   * Search SAP records
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options
   * @returns {Promise<Array<SAPRecord>>} Found records
   */
  async search(criteria, options = {}) {
    throw new Error('Method search must be implemented')
  }

  /**
   * Update SAP record
   * @param {string} id - Record ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<SAPRecord>} Updated record
   */
  async update(id, updateData) {
    throw new Error('Method update must be implemented')
  }

  /**
   * Delete SAP record
   * @param {string} id - Record ID
   * @returns {Promise<boolean>} Deletion success
   */
  async delete(id) {
    throw new Error('Method delete must be implemented')
  }

  /**
   * Get SAP records count
   * @param {Object} criteria - Count criteria
   * @returns {Promise<number>} Records count
   */
  async count(criteria = {}) {
    throw new Error('Method count must be implemented')
  }

  /**
   * Get SAP records statistics
   * @param {Date} fromDate - From date
   * @param {Date} toDate - To date
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(fromDate, toDate) {
    throw new Error('Method getStatistics must be implemented')
  }

  /**
   * Cleanup old records
   * @param {Date} olderThan - Date threshold
   * @returns {Promise<number>} Number of cleaned records
   */
  async cleanup(olderThan) {
    throw new Error('Method cleanup must be implemented')
  }

  /**
   * Bulk save SAP records
   * @param {Array<SAPRecord>} sapRecords - SAP records to save
   * @returns {Promise<Array<SAPRecord>>} Saved records
   */
  async bulkSave(sapRecords) {
    throw new Error('Method bulkSave must be implemented')
  }

  /**
   * Get failed records for retry
   * @param {number} maxRetries - Maximum retry count
   * @param {number} limit - Record limit
   * @returns {Promise<Array<SAPRecord>>} Failed records
   */
  async getFailedRecords(maxRetries = 3, limit = 100) {
    throw new Error('Method getFailedRecords must be implemented')
  }
}

module.exports = { ISAPRepository }