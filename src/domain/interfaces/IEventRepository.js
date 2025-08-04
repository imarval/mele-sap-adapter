/**
 * IEventRepository Interface
 * Defines the contract for integration event persistence in SAP adapter
 */

class IEventRepository {
  /**
   * Save integration event
   * @param {IntegrationEvent} event - Integration event to save
   * @returns {Promise<IntegrationEvent>} Saved event
   */
  async save(event) {
    throw new Error('Method save must be implemented')
  }

  /**
   * Find event by ID
   * @param {string} eventId - Event ID
   * @returns {Promise<IntegrationEvent|null>} Found event or null
   */
  async findById(eventId) {
    throw new Error('Method findById must be implemented')
  }

  /**
   * Find events by status
   * @param {string} status - Event status (pending, processing, completed, failed, retry)
   * @param {number} limit - Maximum number of events
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array<IntegrationEvent>>} Found events
   */
  async findByStatus(status, limit = 100, offset = 0) {
    throw new Error('Method findByStatus must be implemented')
  }

  /**
   * Find events by entity type
   * @param {string} entityType - Entity type
   * @param {number} limit - Maximum number of events
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array<IntegrationEvent>>} Found events
   */
  async findByEntityType(entityType, limit = 100, offset = 0) {
    throw new Error('Method findByEntityType must be implemented')
  }

  /**
   * Find events by date range
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @param {number} limit - Maximum number of events
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array<IntegrationEvent>>} Found events
   */
  async findByDateRange(fromDate, toDate, limit = 100, offset = 0) {
    throw new Error('Method findByDateRange must be implemented')
  }

  /**
   * Find failed events eligible for retry
   * @param {number} maxRetries - Maximum retry count
   * @param {number} limit - Maximum number of events
   * @returns {Promise<Array<IntegrationEvent>>} Failed events for retry
   */
  async findFailedForRetry(maxRetries = 3, limit = 100) {
    throw new Error('Method findFailedForRetry must be implemented')
  }

  /**
   * Update event status
   * @param {string} eventId - Event ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<IntegrationEvent>} Updated event
   */
  async updateStatus(eventId, status, additionalData = {}) {
    throw new Error('Method updateStatus must be implemented')
  }

  /**
   * Mark event as processed
   * @param {string} eventId - Event ID
   * @param {Object} processingResult - Processing result
   * @returns {Promise<IntegrationEvent>} Updated event
   */
  async markAsProcessed(eventId, processingResult) {
    throw new Error('Method markAsProcessed must be implemented')
  }

  /**
   * Mark event as failed
   * @param {string} eventId - Event ID
   * @param {Error|string} error - Error that occurred
   * @returns {Promise<IntegrationEvent>} Updated event
   */
  async markAsFailed(eventId, error) {
    throw new Error('Method markAsFailed must be implemented')
  }

  /**
   * Increment retry count
   * @param {string} eventId - Event ID
   * @returns {Promise<IntegrationEvent>} Updated event
   */
  async incrementRetryCount(eventId) {
    throw new Error('Method incrementRetryCount must be implemented')
  }

  /**
   * Get event statistics
   * @param {Date} fromDate - Start date
   * @param {Date} toDate - End date
   * @returns {Promise<Object>} Event statistics
   */
  async getStatistics(fromDate, toDate) {
    throw new Error('Method getStatistics must be implemented')
  }

  /**
   * Get event count by status
   * @param {string} status - Event status
   * @returns {Promise<number>} Event count
   */
  async countByStatus(status) {
    throw new Error('Method countByStatus must be implemented')
  }

  /**
   * Delete old events
   * @param {Date} olderThan - Date threshold
   * @returns {Promise<number>} Number of deleted events
   */
  async deleteOldEvents(olderThan) {
    throw new Error('Method deleteOldEvents must be implemented')
  }

  /**
   * Bulk save events
   * @param {Array<IntegrationEvent>} events - Events to save
   * @returns {Promise<Array<IntegrationEvent>>} Saved events
   */
  async bulkSave(events) {
    throw new Error('Method bulkSave must be implemented')
  }

  /**
   * Search events with complex criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Search options (limit, offset, sort)
   * @returns {Promise<Array<IntegrationEvent>>} Found events
   */
  async search(criteria, options = {}) {
    throw new Error('Method search must be implemented')
  }
}

module.exports = { IEventRepository }