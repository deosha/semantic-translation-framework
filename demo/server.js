/**
 * Demo Server for Semantic Protocol Translation Framework
 * 
 * Serves the web demo and provides real API endpoints
 * for live translation demonstrations with error handling showcase
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the actual translation components
const { 
  SemanticTranslationEngine,
  createSemanticEngine,
  ToolCentricAdapter,
  TaskCentricAdapter,
  ProtocolParadigm
} = require('../dist/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize translation engine
let engine;

async function initializeComponents() {
  try {
    engine = createSemanticEngine({
      cacheEnabled: true,
      minConfidenceThreshold: 0.6,  // Lowered for demo to show task-to-tool working
      monitoringEnabled: true,
      maxRetries: 3,
      fallbackEnabled: true
    });
    
    // Register protocol adapters
    engine.registerAdapter(ProtocolParadigm.TOOL_CENTRIC, new ToolCentricAdapter());
    engine.registerAdapter(ProtocolParadigm.TASK_CENTRIC, new TaskCentricAdapter());
    
    console.log('✅ Semantic Translation Engine initialized');
    console.log('✅ Protocol adapters registered');
    console.log('✅ Engine ready for translations');
    
    // Test the engine
    const testMessage = {
      id: 'test-init',
      type: 'request',
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
      timestamp: Date.now(),
      payload: {
        toolName: 'test',
        arguments: {}
      }
    };
    
    const testResult = await engine.translate(
      testMessage,
      ProtocolParadigm.TASK_CENTRIC,
      'test-session'
    );
    
    console.log('✅ Engine test successful:', testResult.success);
    
  } catch (error) {
    console.error('❌ CRITICAL: Failed to initialize translation engine:', error);
    console.error('Stack trace:', error.stack);
    // Don't allow server to start without engine
    throw new Error('Cannot start server without translation engine');
  }
}

// API Endpoints

/**
 * Generic protocol translation endpoint
 */
app.post('/api/translate', async (req, res) => {
  try {
    const { message, targetParadigm, sourceParadigm, sessionId = 'demo-session' } = req.body;
    
    if (!message || !targetParadigm) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: message and targetParadigm'
      });
    }
    
    if (!engine) {
      throw new Error('Translation engine not initialized');
    }
    
    // If sourceParadigm is provided, use it; otherwise use message.paradigm
    if (sourceParadigm) {
      message.paradigm = sourceParadigm;
    }
    
    // Use real translation engine
    const result = await engine.translate(message, targetParadigm, sessionId);
    
    res.json({
      success: result.success,
      data: result.data,
      confidence: result.confidence,
      metrics: result.metrics,
      error: result.error,
      errorType: result.errorType,
      warnings: result.confidence?.warnings || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      errorType: error.type || 'UNKNOWN',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Error handling demonstration endpoint
 */
app.post('/api/translate/test-error-handling', async (req, res) => {
  try {
    const { scenario = 'invalid-message' } = req.body;
    
    let testMessage;
    let targetParadigm = ProtocolParadigm.TASK_CENTRIC;
    
    switch (scenario) {
      case 'missing-payload':
        testMessage = {
          id: 'test-1',
          type: 'request',
          paradigm: ProtocolParadigm.TOOL_CENTRIC,
          timestamp: Date.now()
          // Missing payload
        };
        break;
        
      case 'missing-paradigm':
        testMessage = {
          id: 'test-2',
          type: 'request',
          // Missing paradigm
          timestamp: Date.now(),
          payload: { toolName: 'test-tool' }
        };
        break;
        
      case 'invalid-tool':
        testMessage = {
          id: 'test-3',
          type: 'request',
          paradigm: ProtocolParadigm.TOOL_CENTRIC,
          timestamp: Date.now(),
          payload: {
            // Missing toolName/toolId
            arguments: { data: 'test' }
          }
        };
        break;
        
      case 'invalid-task':
        testMessage = {
          id: 'test-4',
          type: 'request',
          paradigm: ProtocolParadigm.TASK_CENTRIC,
          timestamp: Date.now(),
          payload: {
            // Missing taskType
            input: { data: 'test' }
          }
        };
        break;
        
      default:
        testMessage = {
          id: 'test-invalid',
          // Completely invalid structure
          data: 'invalid'
        };
    }
    
    if (!engine) {
      throw new Error('Translation engine not initialized');
    }
    
    // Use real engine to demonstrate error handling
    const result = await engine.translate(testMessage, targetParadigm, 'error-test-session');
    
    res.json({
      scenario,
      testMessage,
      result: {
        success: result.success,
        data: result.data,
        confidence: result.confidence,
        error: result.error,
        recovered: result.data ? true : false,
        warnings: result.confidence?.warnings || []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Translate Tool-Centric to Task-Centric
 */
app.post('/api/translate/tool-to-task', async (req, res) => {
  try {
    const { request, sessionId = 'demo-session' } = req.body;
    
    // Ensure proper structure
    const message = {
      id: request.id || `tool-${Date.now()}`,
      type: 'request',
      paradigm: ProtocolParadigm.TOOL_CENTRIC,
      timestamp: Date.now(),
      payload: request.payload || request
    };
    
    if (!engine) {
      throw new Error('Translation engine not initialized');
    }
    
    const result = await engine.translate(
      message,
      ProtocolParadigm.TASK_CENTRIC,
      sessionId
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Translate Task-Centric to Tool-Centric
 */
app.post('/api/translate/task-to-tool', async (req, res) => {
  try {
    const { request, sessionId = 'demo-session' } = req.body;
    
    // Ensure proper structure
    const message = {
      id: request.id || `task-${Date.now()}`,
      type: 'request',
      paradigm: ProtocolParadigm.TASK_CENTRIC,
      timestamp: Date.now(),
      payload: request.payload || request
    };
    
    if (!engine) {
      throw new Error('Translation engine not initialized');
    }
    
    const result = await engine.translate(
      message,
      ProtocolParadigm.TOOL_CENTRIC,
      sessionId
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get system metrics
 */
app.get('/api/metrics', async (req, res) => {
  try {
    if (!engine) {
      throw new Error('Translation engine not initialized');
    }
    
    const metrics = engine.getMetrics();
    
    res.json({
      translations: {
        total: metrics.totalTranslations || 0,
        successful: metrics.successfulTranslations || 0,
        failed: metrics.failedTranslations || 0,
        averageConfidence: metrics.averageConfidence || 0,
        averageLatencyMs: metrics.averageLatency || 0
      },
      cache: {
        hitRate: metrics.cacheHitRate || 0,
        entries: metrics.cacheEntries || 0
      },
      errors: {
        recoveryRate: metrics.errorRecoveryRate || 0,
        fallbackUsage: metrics.fallbackUsage || 0
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear cache
 */
app.post('/api/cache/clear', async (req, res) => {
  try {
    if (!engine) {
      throw new Error('Translation engine not initialized');
    }
    
    await engine.clear();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: engine ? 'healthy' : 'unhealthy',
    engine: engine ? 'active' : 'not initialized',
    version: '1.0.0',
    features: {
      errorHandling: true,
      paradigmInference: true,
      confidenceScoring: true,
      multiLevelCache: true,
      fallbackStrategies: true
    },
    timestamp: new Date().toISOString()
  });
});

// Start server
async function startServer() {
  await initializeComponents();
  
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║     🚀 Semantic Protocol Translation Framework            ║
║        Demo Server with Error Handling                    ║
║                                                            ║
║     Server running at: http://localhost:${PORT}              ║
║                                                            ║
║     API Endpoints:                                         ║
║       • POST /api/translate                                ║
║       • POST /api/translate/test-error-handling            ║
║       • POST /api/translate/tool-to-task                   ║
║       • POST /api/translate/task-to-tool                   ║
║       • GET  /api/metrics                                  ║
║       • POST /api/cache/clear                              ║
║       • GET  /api/health                                   ║
║                                                            ║
║     Open http://localhost:${PORT} in your browser           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  if (engine) await engine.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  if (engine) await engine.shutdown();
  process.exit(0);
});

startServer().catch(console.error);