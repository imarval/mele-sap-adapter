/**
 * Webhook Server Implementation for SAP Adapter
 * Handles HTTP webhook endpoints for receiving integration events
 */

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const rateLimit = require('express-rate-limit')
const { body, validationResult } = require('express-validator')
const crypto = require('crypto')
const { IWebhookServer } = require('../../domain/interfaces/IWebhookServer')

class WebhookServer extends IWebhookServer {
  constructor(logger) {
    super()
    this.logger = logger
    this.app = null
    this.server = null
    this.config = null
    this.isRunning = false
    this.eventHandler = null
    this.healthCheckHandler = null
    this.statusHandler = null
    this.customRoutes = new Map()
    this.stats = {
      startTime: null,
      requestsReceived: 0,
      requestsProcessed: 0,
      requestsFailed: 0,
      eventsReceived: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    }
    this.webhookSecret = null
    this.signatureAlgorithm = 'sha256'
  }

  /**
   * Initialize webhook server
   * @param {Object} config - Server configuration
   * @returns {Promise<boolean>} Initialization success
   */
  async initialize(config) {
    try {
      this.logger.info('Initializing webhook server', {
        port: config.port,
        host: config.host || '0.0.0.0'
      })

      this.config = {
        port: config.port || 3000,
        host: config.host || '0.0.0.0',
        timeout: config.timeout || 30000,
        maxBodySize: config.maxBodySize || '10mb',
        cors: config.cors || { enabled: true },
        rateLimit: config.rateLimit || { max: 100, windowMs: 15 * 60 * 1000 },
        security: config.security || { enabled: true },
        compression: config.compression !== false,
        requestLogging: config.requestLogging !== false,
        ...config
      }

      // Store webhook secret if provided
      if (config.secret) {
        this.webhookSecret = config.secret
        this.signatureAlgorithm = config.signatureAlgorithm || 'sha256'
      }

      // Create Express app
      this.app = express()

      // Setup middleware
      this._setupMiddleware()

      // Setup routes
      this._setupRoutes()

      // Setup error handling
      this._setupErrorHandling()

      this.logger.info('Webhook server initialized successfully')
      return true

    } catch (error) {
      this.logger.error('Failed to initialize webhook server', {
        error: error.message,
        stack: error.stack
      })

      return false
    }
  }

  /**
   * Start webhook server
   * @returns {Promise<boolean>} Server start success
   */
  async start() {
    if (!this.app) {
      throw new Error('Webhook server not initialized')
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.isRunning = true
          this.stats.startTime = new Date()

          this.logger.info('Webhook server started successfully', {
            port: this.config.port,
            host: this.config.host,
            url: this.getUrl()
          })

          resolve(true)
        })

        // Set server timeout
        this.server.timeout = this.config.timeout

        // Handle server errors
        this.server.on('error', (error) => {
          this.logger.error('Webhook server error', { error: error.message })
          reject(error)
        })

      } catch (error) {
        this.logger.error('Failed to start webhook server', {
          error: error.message
        })
        reject(error)
      }
    })
  }

  /**
   * Stop webhook server
   * @returns {Promise<boolean>} Server stop success
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server && this.isRunning) {
        this.server.close((error) => {
          if (error) {
            this.logger.error('Error stopping webhook server', {
              error: error.message
            })
          } else {
            this.logger.info('Webhook server stopped')
          }

          this.isRunning = false
          resolve(!error)
        })
      } else {
        resolve(true)
      }
    })
  }

  /**
   * Register event handler for webhook events
   * @param {Function} handler - Event handler function
   */
  onEvent(handler) {
    this.eventHandler = handler
    this.logger.debug('Webhook event handler registered')
  }

  /**
   * Register health check handler
   * @param {Function} handler - Health check handler function
   */
  onHealthCheck(handler) {
    this.healthCheckHandler = handler
    this.logger.debug('Health check handler registered')
  }

  /**
   * Register status handler
   * @param {Function} handler - Status handler function
   */
  onStatus(handler) {
    this.statusHandler = handler
    this.logger.debug('Status handler registered')
  }

  /**
   * Register custom route handler
   * @param {string} method - HTTP method
   * @param {string} path - Route path
   * @param {Function} handler - Route handler function
   */
  addRoute(method, path, handler) {
    if (!this.app) {
      throw new Error('Webhook server not initialized')
    }

    const key = `${method.toLowerCase()}:${path}`
    this.customRoutes.set(key, handler)

    this.app[method.toLowerCase()](path, (req, res, next) => {
      this._trackRequest(req, res)
      handler(req, res, next)
    })

    this.logger.debug('Custom route added', { method, path })
  }

  /**
   * Add middleware to the server
   * @param {Function} middleware - Express middleware function
   */
  addMiddleware(middleware) {
    if (!this.app) {
      throw new Error('Webhook server not initialized')
    }

    this.app.use(middleware)
    this.logger.debug('Custom middleware added')
  }

  /**
   * Get server statistics
   * @returns {Object} Server statistics
   */
  getStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0
    
    return {
      ...this.stats,
      uptime,
      isRunning: this.isRunning,
      customRoutes: this.customRoutes.size,
      port: this.config?.port,
      host: this.config?.host
    }
  }

  /**
   * Get server configuration
   * @returns {Object} Current server configuration
   */
  getConfig() {
    return { ...this.config }
  }

  /**
   * Check if server is running
   * @returns {boolean} Server running status
   */
  isRunning() {
    return this.isRunning
  }

  /**
   * Get server port
   * @returns {number} Server port number
   */
  getPort() {
    return this.config?.port || null
  }

  /**
   * Get server host
   * @returns {string} Server host
   */
  getHost() {
    return this.config?.host || null
  }

  /**
   * Get server URL
   * @returns {string} Full server URL
   */
  getUrl() {
    if (!this.config) return null
    
    const protocol = this.config.https ? 'https' : 'http'
    const host = this.config.host === '0.0.0.0' ? 'localhost' : this.config.host
    
    return `${protocol}://${host}:${this.config.port}`
  }

  /**
   * Enable/disable request logging
   * @param {boolean} enabled - Logging enabled
   * @param {Object} options - Logging options
   */
  setRequestLogging(enabled, options = {}) {
    this.config.requestLogging = enabled
    this.config.requestLoggingOptions = options
    this.logger.info('Request logging settings updated', { enabled, options })
  }

  /**
   * Set request timeout
   * @param {number} timeoutMs - Timeout in milliseconds
   */
  setTimeout(timeoutMs) {
    this.config.timeout = timeoutMs
    if (this.server) {
      this.server.timeout = timeoutMs
    }
    this.logger.info('Request timeout updated', { timeoutMs })
  }

  /**
   * Configure CORS settings
   * @param {Object} corsOptions - CORS configuration
   */
  configureCORS(corsOptions) {
    this.config.cors = corsOptions
    this.logger.info('CORS settings updated', corsOptions)
  }

  /**
   * Configure rate limiting
   * @param {Object} rateLimitOptions - Rate limit configuration
   */
  configureRateLimit(rateLimitOptions) {
    this.config.rateLimit = rateLimitOptions
    this.logger.info('Rate limit settings updated', rateLimitOptions)
  }

  /**
   * Set webhook signature validation
   * @param {string} secret - Webhook secret
   * @param {string} algorithm - Hash algorithm
   */
  setSignatureValidation(secret, algorithm = 'sha256') {
    this.webhookSecret = secret
    this.signatureAlgorithm = algorithm
    this.logger.info('Webhook signature validation configured', { algorithm })
  }

  // Private helper methods

  /**
   * Setup middleware
   * @private
   */
  _setupMiddleware() {
    // Security middleware
    if (this.config.security.enabled) {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"]
          }
        }
      }))
    }

    // Compression
    if (this.config.compression) {
      this.app.use(compression())
    }

    // CORS
    if (this.config.cors.enabled) {
      this.app.use(cors(this.config.cors))
    }

    // Rate limiting
    if (this.config.rateLimit.max > 0) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimit.windowMs || 15 * 60 * 1000,
        max: this.config.rateLimit.max,
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          this.stats.requestsFailed++
          this.logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path
          })
          res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.round(this.config.rateLimit.windowMs / 1000)
          })
        }
      })
      this.app.use(limiter)
    }

    // Body parsing
    this.app.use(express.json({
      limit: this.config.maxBodySize,
      verify: (req, res, buf) => {
        // Store raw body for signature verification
        req.rawBody = buf
      }
    }))

    this.app.use(express.urlencoded({ 
      extended: true,
      limit: this.config.maxBodySize
    }))

    // Request logging
    if (this.config.requestLogging) {
      this.app.use((req, res, next) => {
        const startTime = Date.now()
        
        res.on('finish', () => {
          const responseTime = Date.now() - startTime
          this.logger.debug('HTTP request processed', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime,
            ip: req.ip,
            userAgent: req.get('User-Agent')
          })
        })
        
        next()
      })
    }

    // Request tracking
    this.app.use((req, res, next) => {
      this._trackRequest(req, res)
      next()
    })
  }

  /**
   * Setup routes
   * @private
   */
  _setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        let healthResult = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
          server: {
            isRunning: this.isRunning,
            port: this.config.port,
            stats: this.getStats()
          }
        }

        // Call custom health check handler if registered
        if (this.healthCheckHandler) {
          const customHealth = await this.healthCheckHandler()
          healthResult = { ...healthResult, ...customHealth }
        }

        const statusCode = healthResult.status === 'healthy' ? 200 : 503
        res.status(statusCode).json(healthResult)

      } catch (error) {
        this.logger.error('Health check failed', { error: error.message })
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        })
      }
    })

    // Status endpoint
    this.app.get('/status', async (req, res) => {
      try {
        let statusResult = {
          timestamp: new Date().toISOString(),
          server: this.getStats(),
          config: {
            port: this.config.port,
            host: this.config.host,
            cors: this.config.cors.enabled,
            rateLimit: this.config.rateLimit,
            security: this.config.security.enabled
          }
        }

        // Call custom status handler if registered
        if (this.statusHandler) {
          const customStatus = await this.statusHandler()
          statusResult = { ...statusResult, ...customStatus }
        }

        res.json(statusResult)

      } catch (error) {
        this.logger.error('Status check failed', { error: error.message })
        res.status(500).json({
          error: 'Failed to get status',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Main webhook endpoint for integration events
    this.app.post('/webhook/events', 
      // Validation middleware
      [
        body('eventType').notEmpty().withMessage('Event type is required'),
        body('entityType').notEmpty().withMessage('Entity type is required'),
        body('eventId').notEmpty().withMessage('Event ID is required'),
        body('timeStamp').isISO8601().withMessage('Valid timestamp is required')
      ],
      async (req, res) => {
        try {
          // Validate request
          const errors = validationResult(req)
          if (!errors.isEmpty()) {
            this.stats.requestsFailed++
            return res.status(400).json({
              error: 'Validation failed',
              details: errors.array()
            })
          }

          // Verify webhook signature if configured
          if (this.webhookSecret && !this._verifySignature(req)) {
            this.stats.requestsFailed++
            return res.status(401).json({
              error: 'Invalid signature'
            })
          }

          const eventData = req.body
          this.stats.eventsReceived++

          this.logger.info('Received webhook event', {
            eventId: eventData.eventId || eventData.EventId,
            eventType: eventData.eventType || eventData.EventType,
            entityType: eventData.entityType || eventData.EntityType
          })

          // Call event handler if registered
          let result = { success: true, message: 'Event received' }
          
          if (this.eventHandler) {
            result = await this.eventHandler(eventData)
          }

          if (result.success) {
            this.stats.requestsProcessed++
            res.json({
              success: true,
              message: result.message || 'Event processed successfully',
              eventId: eventData.eventId || eventData.EventId,
              timestamp: new Date().toISOString()
            })
          } else {
            this.stats.requestsFailed++
            res.status(400).json({
              success: false,
              message: result.message || 'Event processing failed',
              error: result.error,
              eventId: eventData.eventId || eventData.EventId,
              timestamp: new Date().toISOString()
            })
          }

        } catch (error) {
          this.stats.requestsFailed++
          this.logger.error('Webhook event processing failed', {
            error: error.message,
            stack: error.stack
          })

          res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message,
            timestamp: new Date().toISOString()
          })
        }
      }
    )

    // Test endpoint
    this.app.post('/webhook/test', (req, res) => {
      this.logger.info('Test webhook endpoint called', {
        body: req.body,
        headers: req.headers
      })

      res.json({
        success: true,
        message: 'Test endpoint working',
        received: req.body,
        timestamp: new Date().toISOString()
      })
    })

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'SAP Integration Adapter',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          status: '/status',
          webhook: '/webhook/events',
          test: '/webhook/test'
        }
      })
    })
  }

  /**
   * Setup error handling
   * @private
   */
  _setupErrorHandling() {
    // 404 handler
    this.app.use((req, res) => {
      this.stats.requestsFailed++
      res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      })
    })

    // Global error handler
    this.app.use((error, req, res, next) => {
      this.stats.requestsFailed++
      
      this.logger.error('Unhandled server error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      })

      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    })
  }

  /**
   * Track request metrics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   * @private
   */
  _trackRequest(req, res) {
    const startTime = Date.now()
    this.stats.requestsReceived++

    res.on('finish', () => {
      const responseTime = Date.now() - startTime
      this.stats.totalResponseTime += responseTime
      this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.requestsReceived
    })
  }

  /**
   * Verify webhook signature
   * @param {Object} req - Express request
   * @returns {boolean} Signature valid
   * @private
   */
  _verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-signature']
    
    if (!signature) {
      return false
    }

    const expectedSignature = crypto
      .createHmac(this.signatureAlgorithm, this.webhookSecret)
      .update(req.rawBody)
      .digest('hex')

    const expected = `${this.signatureAlgorithm}=${expectedSignature}`
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  }
}

module.exports = { WebhookServer }