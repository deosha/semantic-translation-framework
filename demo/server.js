/**
 * Demo Server for MCP-A2A Translation Layer
 * 
 * Serves the web demo and provides real API endpoints
 * for live translation demonstrations
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

// Import the actual translation components
const { TranslationEngine } = require('../dist/translation/translation-engine');
const { CacheManager } = require('../dist/cache/cache-manager');
const { SemanticMapper } = require('../dist/translation/semantic-mapper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize translation engine
let engine;
let cacheManager;
let semanticMapper;

async function initializeComponents() {
  try {
    engine = new TranslationEngine({
      cacheEnabled: true,
      minConfidenceThreshold: 0.7,
      monitoringEnabled: true
    });
    
    cacheManager = new CacheManager();
    semanticMapper = new SemanticMapper();
    
    console.log('✅ Translation components initialized');
  } catch (error) {
    console.error('Failed to initialize components:', error);
    // Use mock mode if components fail
    engine = null;
  }
}

// API Endpoints

/**
 * Translate MCP to A2A
 */
app.post('/api/translate/mcp-to-a2a', async (req, res) => {
  try {
    const { request, sessionId = 'demo-session' } = req.body;
    
    if (engine) {
      // Use real translation engine
      const result = await engine.translateMCPToA2A(request, sessionId);
      
      res.json({
        success: result.success,
        data: result.data,
        confidence: result.confidence,
        metrics: result.metrics,
        warnings: result.confidence.warnings
      });
    } else {
      // Mock response for demo
      res.json({
        success: true,
        data: {
          taskId: `a2a-${Date.now()}`,
          taskType: request.params?.name || 'unknown',
          input: request.params?.arguments || {},
          state: 'PENDING',
          metadata: {
            sourceProtocol: 'MCP',
            sourceId: request.id
          }
        },
        confidence: {
          score: 0.94,
          factors: {
            semanticMatch: 0.95,
            structuralAlignment: 0.93,
            dataPreservation: 0.96,
            contextRetention: 0.92
          },
          warnings: [],
          lossyTranslation: false
        },
        metrics: {
          latencyMs: 0.2 + Math.random() * 0.3,
          cacheHit: Math.random() > 0.3
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Translate A2A to MCP
 */
app.post('/api/translate/a2a-to-mcp', async (req, res) => {
  try {
    const { response, sessionId = 'demo-session' } = req.body;
    
    if (engine) {
      // Use real translation engine
      const result = await engine.translateA2AToMCP(response, sessionId);
      
      res.json({
        success: result.success,
        data: result.data,
        confidence: result.confidence,
        metrics: result.metrics,
        warnings: result.confidence.warnings
      });
    } else {
      // Mock response for demo
      const content = [];
      
      if (response.output) {
        response.output.forEach(item => {
          if (item.type === 'text') {
            content.push({ type: 'text', text: item.text });
          } else if (item.type === 'data') {
            content.push({ type: 'resource', resource: item.data });
          } else if (item.type === 'code') {
            content.push({ 
              type: 'text', 
              text: `\`\`\`${item.language}\n${item.code}\n\`\`\`` 
            });
          }
        });
      }
      
      res.json({
        success: true,
        data: {
          jsonrpc: '2.0',
          id: `mcp-${Date.now()}`,
          result: {
            content: content
          }
        },
        confidence: {
          score: 0.92,
          factors: {
            semanticMatch: 0.93,
            structuralAlignment: 0.91,
            dataPreservation: 0.94,
            contextRetention: 0.90
          },
          warnings: [],
          lossyTranslation: false
        },
        metrics: {
          latencyMs: 0.15 + Math.random() * 0.25,
          cacheHit: Math.random() > 0.4
        }
      });
    }
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
    if (engine) {
      const metrics = engine.getMetrics();
      const cacheStats = cacheManager.getStats();
      
      res.json({
        engine: metrics,
        cache: cacheStats,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    } else {
      // Mock metrics
      res.json({
        engine: {
          totalTranslations: 1234,
          successfulTranslations: 1220,
          averageConfidence: 0.94,
          averageLatencyMs: 0.25,
          cacheHitRate: 85.5
        },
        cache: {
          entriesCount: 450,
          hitRate: 85.5,
          memoryUsageMB: 12.3
        },
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    engine: engine ? 'active' : 'mock',
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
║     🚀 MCP-A2A Translation Layer Demo Server              ║
║                                                            ║
║     Server running at: http://localhost:${PORT}              ║
║     API Endpoints:                                         ║
║       • POST /api/translate/mcp-to-a2a                    ║
║       • POST /api/translate/a2a-to-mcp                    ║
║       • GET  /api/metrics                                  ║
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
  if (cacheManager) await cacheManager.close();
  process.exit(0);
});

startServer().catch(console.error);