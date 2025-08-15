"use strict";
/**
 * Protocol Capability Negotiation Layer
 *
 * Dynamically negotiates and advertises capabilities between MCP and A2A protocols
 * Based on paper Section IV.C: Production Deployment Considerations
 *
 * Features:
 * - Automatic capability discovery
 * - Feature compatibility checking
 * - Fallback strategy determination
 * - Version negotiation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityNegotiator = void 0;
const events_1 = require("events");
/**
 * Capability Negotiator
 *
 * Handles dynamic capability discovery and negotiation
 */
class CapabilityNegotiator extends events_1.EventEmitter {
    // Protocol manifests
    mcpManifest = null;
    a2aManifest = null;
    // Capability mappings
    mappings;
    // Negotiation cache
    negotiationCache;
    // Compatibility matrix
    compatibilityMatrix;
    constructor() {
        super();
        this.mappings = new Map();
        this.negotiationCache = new Map();
        this.compatibilityMatrix = new Map();
        // Initialize default mappings
        this.initializeDefaultMappings();
    }
    /**
     * Discover MCP capabilities
     */
    async discoverMCPCapabilities(tools, resources, prompts) {
        const capabilities = [];
        // Analyze tools
        if (tools && tools.length > 0) {
            capabilities.push({
                name: 'tools',
                version: '1.0',
                required: true,
                features: tools.map(t => t.name),
                metadata: { count: tools.length }
            });
        }
        // Analyze resources
        if (resources && resources.length > 0) {
            capabilities.push({
                name: 'resources',
                version: '1.0',
                required: false,
                features: ['uri-based-access'],
                metadata: { count: resources.length }
            });
        }
        // Analyze prompts
        if (prompts && prompts.length > 0) {
            capabilities.push({
                name: 'prompts',
                version: '1.0',
                required: false,
                features: prompts.map(p => p.name),
                metadata: { count: prompts.length }
            });
        }
        // Create manifest
        const manifest = {
            protocol: 'mcp',
            version: '1.0.0',
            capabilities,
            features: {
                streaming: false, // MCP doesn't support streaming by default
                batching: true,
                compression: false,
                encryption: false,
                stateful: false, // MCP is stateless
                multiModal: true, // Supports text, images, resources
                contextAware: false
            },
            performance: {
                maxConcurrency: 10,
                maxMessageSize: 1024 * 1024, // 1MB
                timeout: 30000,
                rateLimit: 100
            },
            authentication: {
                type: 'none',
                required: false
            }
        };
        this.mcpManifest = manifest;
        this.emit('capabilities:discovered', {
            protocol: 'mcp',
            capabilities: capabilities.length
        });
        return manifest;
    }
    /**
     * Discover A2A capabilities
     */
    async discoverA2ACapabilities(agentCards) {
        const capabilities = [];
        const allFeatures = [];
        // Analyze agent cards
        if (agentCards && agentCards.length > 0) {
            for (const card of agentCards) {
                const features = card.capabilities.map(c => `${card.agentId}.${c.name}`);
                allFeatures.push(...features);
                capabilities.push({
                    name: card.agentId,
                    version: card.version,
                    required: false,
                    features: card.capabilities.map(c => c.name),
                    metadata: {
                        description: card.description,
                        streaming: card.capabilities.some(c => c.streaming),
                        rateLimits: card.metadata?.rateLimits
                    }
                });
            }
        }
        // Create manifest
        const manifest = {
            protocol: 'a2a',
            version: '1.0.0',
            capabilities,
            features: {
                streaming: true, // A2A supports Server-Sent Events
                batching: true,
                compression: true,
                encryption: true,
                stateful: true, // A2A maintains conversation context
                multiModal: true, // Supports various message parts
                contextAware: true
            },
            performance: {
                maxConcurrency: 50,
                maxMessageSize: 10 * 1024 * 1024, // 10MB
                timeout: 60000,
                rateLimit: agentCards?.[0]?.metadata?.rateLimits?.requestsPerMinute || 1000
            },
            authentication: {
                type: agentCards?.[0]?.metadata?.authentication || 'api-key',
                required: true
            }
        };
        this.a2aManifest = manifest;
        this.emit('capabilities:discovered', {
            protocol: 'a2a',
            capabilities: capabilities.length
        });
        return manifest;
    }
    /**
     * Negotiate capabilities between protocols
     */
    async negotiate(mcpManifest, a2aManifest) {
        // Use provided manifests or cached ones
        const mcp = mcpManifest || this.mcpManifest;
        const a2a = a2aManifest || this.a2aManifest;
        if (!mcp || !a2a) {
            throw new Error('Protocol manifests not available for negotiation');
        }
        // Check cache
        const cacheKey = `${mcp.version}-${a2a.version}`;
        const cached = this.negotiationCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const negotiatedCapabilities = [];
        const fallbacks = [];
        const warnings = [];
        const recommendations = {};
        // Negotiate feature compatibility
        this.negotiateFeatures(mcp.features, a2a.features);
        // Handle streaming mismatch
        if (!mcp.features.streaming && a2a.features.streaming) {
            fallbacks.push({
                feature: 'streaming',
                strategy: 'polling-emulation',
                confidence: 0.7
            });
            warnings.push('MCP does not support streaming; will use polling emulation');
        }
        // Handle state management mismatch
        if (!mcp.features.stateful && a2a.features.stateful) {
            fallbacks.push({
                feature: 'state-management',
                strategy: 'context-preservation',
                confidence: 0.85
            });
            warnings.push('MCP is stateless; using context preservation for state management');
        }
        // Map capabilities
        for (const mcpCap of mcp.capabilities) {
            const mapping = this.findBestMapping(mcpCap, a2a.capabilities);
            if (mapping) {
                negotiatedCapabilities.push({
                    name: `${mcpCap.name}-${mapping.name}`,
                    version: '1.0',
                    required: mcpCap.required || mapping.required,
                    features: [...mcpCap.features, ...mapping.features],
                    metadata: {
                        source: mcpCap.name,
                        target: mapping.name,
                        confidence: this.calculateMappingConfidence(mcpCap, mapping)
                    }
                });
            }
            else if (mcpCap.required) {
                warnings.push(`Required MCP capability '${mcpCap.name}' has no A2A equivalent`);
            }
        }
        // Calculate overall compatibility
        const compatibility = this.calculateCompatibility(negotiatedCapabilities, mcp.capabilities, a2a.capabilities);
        // Generate recommendations
        if (compatibility < 0.8) {
            recommendations.caching = 'aggressive';
            recommendations.retryStrategy = 'exponential-backoff';
            recommendations.confidenceThreshold = 0.6;
        }
        if (mcp.performance && a2a.performance) {
            recommendations.maxConcurrency = Math.min(mcp.performance.maxConcurrency || 10, a2a.performance.maxConcurrency || 50);
            recommendations.timeout = Math.max(mcp.performance.timeout || 30000, a2a.performance.timeout || 60000);
        }
        const result = {
            success: compatibility >= 0.5 && !warnings.some(w => w.includes('Required')),
            capabilities: negotiatedCapabilities,
            compatibility,
            fallbacks,
            warnings,
            recommendations
        };
        // Cache result
        this.negotiationCache.set(cacheKey, result);
        this.emit('negotiation:complete', {
            success: result.success,
            compatibility,
            warnings: warnings.length
        });
        return result;
    }
    /**
     * Check if a specific capability is supported
     */
    isCapabilitySupported(capability, protocol) {
        const manifest = protocol === 'mcp' ? this.mcpManifest : this.a2aManifest;
        if (!manifest)
            return false;
        return manifest.capabilities.some(cap => cap.name === capability || cap.features.includes(capability));
    }
    /**
     * Get fallback strategy for unsupported capability
     */
    getFallbackStrategy(capability, sourceProtocol) {
        const key = `${sourceProtocol}:${capability}`;
        // Predefined fallback strategies
        const fallbackStrategies = {
            'mcp:streaming': { strategy: 'polling-emulation', confidence: 0.7 },
            'a2a:tools': { strategy: 'capability-mapping', confidence: 0.9 },
            'mcp:state': { strategy: 'context-preservation', confidence: 0.85 },
            'a2a:stateless': { strategy: 'session-simulation', confidence: 0.8 }
        };
        return fallbackStrategies[key] || null;
    }
    /**
     * Update capability mapping
     */
    updateMapping(source, target, confidence, transformations) {
        const mapping = {
            source,
            target,
            confidence,
            transformations
        };
        this.mappings.set(`${source}-${target}`, mapping);
        // Clear negotiation cache as mappings have changed
        this.negotiationCache.clear();
        this.emit('mapping:updated', { source, target, confidence });
    }
    /**
     * Get compatibility score between two capabilities
     */
    getCompatibilityScore(mcpCapability, a2aCapability) {
        const key = `${mcpCapability}-${a2aCapability}`;
        return this.compatibilityMatrix.get(key) || 0;
    }
    // Private helper methods
    initializeDefaultMappings() {
        // Default MCP to A2A mappings
        this.mappings.set('tools-capabilities', {
            source: 'tools',
            target: 'capabilities',
            confidence: 0.9,
            transformations: ['tool-to-capability']
        });
        this.mappings.set('resources-data', {
            source: 'resources',
            target: 'data-sources',
            confidence: 0.85,
            transformations: ['uri-to-data-source']
        });
        this.mappings.set('prompts-templates', {
            source: 'prompts',
            target: 'templates',
            confidence: 0.8,
            transformations: ['prompt-to-template']
        });
        // Initialize compatibility matrix
        this.compatibilityMatrix.set('tools-capabilities', 0.9);
        this.compatibilityMatrix.set('resources-data', 0.85);
        this.compatibilityMatrix.set('prompts-templates', 0.8);
    }
    negotiateFeatures(mcpFeatures, a2aFeatures) {
        if (!mcpFeatures || !a2aFeatures)
            return 0;
        let matchCount = 0;
        let totalCount = 0;
        for (const [key, mcpValue] of Object.entries(mcpFeatures)) {
            totalCount++;
            if (a2aFeatures[key] === mcpValue) {
                matchCount++;
            }
        }
        return totalCount > 0 ? matchCount / totalCount : 0;
    }
    findBestMapping(mcpCap, a2aCaps) {
        let bestMatch = null;
        let bestScore = 0;
        for (const a2aCap of a2aCaps) {
            const score = this.calculateMappingConfidence(mcpCap, a2aCap);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = a2aCap;
            }
        }
        return bestScore > 0.5 ? bestMatch : null;
    }
    calculateMappingConfidence(mcpCap, a2aCap) {
        // Check for direct mapping
        const mappingKey = `${mcpCap.name}-${a2aCap.name}`;
        const mapping = this.mappings.get(mappingKey);
        if (mapping) {
            return mapping.confidence;
        }
        // Calculate based on feature overlap
        const mcpFeatures = new Set(mcpCap.features);
        const a2aFeatures = new Set(a2aCap.features);
        let overlap = 0;
        for (const feature of mcpFeatures) {
            if (a2aFeatures.has(feature)) {
                overlap++;
            }
        }
        const total = Math.max(mcpFeatures.size, a2aFeatures.size);
        return total > 0 ? overlap / total : 0;
    }
    calculateCompatibility(negotiated, mcpCaps, a2aCaps) {
        const requiredMcp = mcpCaps.filter(c => c.required).length;
        const requiredA2a = a2aCaps.filter(c => c.required).length;
        const totalRequired = requiredMcp + requiredA2a;
        if (totalRequired === 0)
            return 1;
        const negotiatedRequired = negotiated.filter(c => c.required).length;
        return negotiatedRequired / totalRequired;
    }
}
exports.CapabilityNegotiator = CapabilityNegotiator;
//# sourceMappingURL=capability-negotiator.js.map