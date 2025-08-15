"use strict";
/**
 * Capability Negotiator
 *
 * Automatically discovers and negotiates capabilities between different
 * protocol paradigms, generating fallback strategies for incompatible features.
 *
 * Based on paper Section IV.E: Capability Negotiation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityNegotiator = void 0;
const protocols_1 = require("../types/protocols");
/**
 * Capability Negotiator
 *
 * Handles protocol capability discovery and fallback generation
 */
class CapabilityNegotiator {
    fallbackStrategies;
    capabilityCache;
    constructor() {
        this.fallbackStrategies = this.initializeFallbackStrategies();
        this.capabilityCache = new Map();
    }
    /**
     * Negotiate capabilities between two protocol paradigms
     */
    async negotiate(sourceManifest, targetManifest) {
        // Check cache
        const cacheKey = `${sourceManifest.id}:${targetManifest.id}`;
        if (this.capabilityCache.has(cacheKey)) {
            return this.capabilityCache.get(cacheKey);
        }
        // Analyze feature compatibility
        const gaps = this.identifyCapabilityGaps(sourceManifest.features, targetManifest.features);
        // Generate fallback strategies
        const fallbacks = this.generateFallbackStrategies(gaps);
        // Calculate compatibility score
        const compatibility = this.calculateCompatibility(sourceManifest, targetManifest, gaps);
        // Find compatible capabilities
        const compatibleCapabilities = this.findCompatibleCapabilities(sourceManifest.capabilities, targetManifest.capabilities);
        // Generate recommendations
        const recommendations = this.generateRecommendations(gaps, fallbacks, compatibility);
        const result = {
            success: compatibility > 0.5,
            compatibility,
            capabilities: compatibleCapabilities,
            fallbacks,
            warnings: this.generateWarnings(gaps, fallbacks),
            recommendations
        };
        // Cache result
        this.capabilityCache.set(cacheKey, result);
        return result;
    }
    /**
     * Identify capability gaps between protocols
     */
    identifyCapabilityGaps(sourceFeatures, targetFeatures) {
        const gaps = [];
        // Check each feature
        const features = [
            'streaming',
            'stateful',
            'multiModal',
            'batching',
            'transactions',
            'async',
            'partialResults',
            'discovery'
        ];
        for (const feature of features) {
            const sourceSupport = sourceFeatures[feature];
            const targetSupport = targetFeatures[feature];
            if (sourceSupport && !targetSupport) {
                gaps.push({
                    feature,
                    sourceSupport,
                    targetSupport,
                    severity: this.assessSeverity(feature),
                    fallbackStrategies: this.getFallbacksForFeature(feature)
                });
            }
        }
        return gaps;
    }
    /**
     * Generate fallback strategies for capability gaps
     */
    generateFallbackStrategies(gaps) {
        const strategies = [];
        for (const gap of gaps) {
            const fallback = this.fallbackStrategies.get(gap.feature);
            if (fallback) {
                strategies.push(fallback);
            }
            else {
                // Generate generic fallback
                strategies.push(this.createGenericFallback(gap));
            }
        }
        return strategies;
    }
    /**
     * Calculate overall compatibility score
     */
    calculateCompatibility(sourceManifest, targetManifest, gaps) {
        // Base compatibility from paradigm match
        let score = this.getParadigmCompatibility(sourceManifest.paradigm, targetManifest.paradigm);
        // Reduce score based on gaps
        for (const gap of gaps) {
            const penalty = this.getGapPenalty(gap);
            score = Math.max(0, score - penalty);
        }
        // Boost score for matching constraints
        if (this.constraintsCompatible(sourceManifest.constraints, targetManifest.constraints)) {
            score = Math.min(1.0, score + 0.1);
        }
        return score;
    }
    /**
     * Find compatible capabilities between protocols
     */
    findCompatibleCapabilities(sourceCapabilities, targetCapabilities) {
        const compatible = [];
        for (const sourceCap of sourceCapabilities) {
            for (const targetCap of targetCapabilities) {
                const confidence = this.compareCapabilities(sourceCap, targetCap);
                if (confidence > 0.5) {
                    compatible.push({
                        name: sourceCap.name,
                        confidence
                    });
                }
            }
        }
        return compatible;
    }
    /**
     * Compare two capabilities for compatibility
     */
    compareCapabilities(source, target) {
        let score = 0;
        // Name similarity
        if (source.name === target.name) {
            score += 0.4;
        }
        else if (this.areNamesSimilar(source.name, target.name)) {
            score += 0.2;
        }
        // Feature compatibility
        const sourceFeatures = source.features || {};
        const targetFeatures = target.features || {};
        let featureMatches = 0;
        let totalFeatures = 0;
        for (const [key, value] of Object.entries(sourceFeatures)) {
            totalFeatures++;
            if (targetFeatures[key] === value) {
                featureMatches++;
            }
        }
        if (totalFeatures > 0) {
            score += (featureMatches / totalFeatures) * 0.3;
        }
        // Constraint compatibility
        if (this.constraintsCompatible(source.constraints, target.constraints)) {
            score += 0.3;
        }
        return Math.min(1.0, score);
    }
    /**
     * Check if two names are similar
     */
    areNamesSimilar(name1, name2) {
        // Simple similarity check
        const normalized1 = name1.toLowerCase().replace(/[-_]/g, '');
        const normalized2 = name2.toLowerCase().replace(/[-_]/g, '');
        return normalized1.includes(normalized2) || normalized2.includes(normalized1);
    }
    /**
     * Check if constraints are compatible
     */
    constraintsCompatible(source, target) {
        if (!source || !target)
            return true;
        // Check execution time
        if (source.maxExecutionTime && target.maxExecutionTime) {
            if (source.maxExecutionTime > target.maxExecutionTime) {
                return false;
            }
        }
        // Check size limits
        if (source.maxInputSize && target.maxInputSize) {
            if (source.maxInputSize > target.maxInputSize) {
                return false;
            }
        }
        return true;
    }
    /**
     * Get paradigm compatibility score
     */
    getParadigmCompatibility(source, target) {
        const compatibilityMatrix = {
            [protocols_1.ProtocolParadigm.TOOL_CENTRIC]: {
                [protocols_1.ProtocolParadigm.TOOL_CENTRIC]: 1.0,
                [protocols_1.ProtocolParadigm.TASK_CENTRIC]: 0.7,
                [protocols_1.ProtocolParadigm.FUNCTION_CALLING]: 0.9,
                [protocols_1.ProtocolParadigm.FRAMEWORK_SPECIFIC]: 0.5
            },
            [protocols_1.ProtocolParadigm.TASK_CENTRIC]: {
                [protocols_1.ProtocolParadigm.TOOL_CENTRIC]: 0.7,
                [protocols_1.ProtocolParadigm.TASK_CENTRIC]: 1.0,
                [protocols_1.ProtocolParadigm.FUNCTION_CALLING]: 0.6,
                [protocols_1.ProtocolParadigm.FRAMEWORK_SPECIFIC]: 0.5
            },
            [protocols_1.ProtocolParadigm.FUNCTION_CALLING]: {
                [protocols_1.ProtocolParadigm.TOOL_CENTRIC]: 0.9,
                [protocols_1.ProtocolParadigm.TASK_CENTRIC]: 0.6,
                [protocols_1.ProtocolParadigm.FUNCTION_CALLING]: 1.0,
                [protocols_1.ProtocolParadigm.FRAMEWORK_SPECIFIC]: 0.7
            },
            [protocols_1.ProtocolParadigm.FRAMEWORK_SPECIFIC]: {
                [protocols_1.ProtocolParadigm.TOOL_CENTRIC]: 0.5,
                [protocols_1.ProtocolParadigm.TASK_CENTRIC]: 0.5,
                [protocols_1.ProtocolParadigm.FUNCTION_CALLING]: 0.7,
                [protocols_1.ProtocolParadigm.FRAMEWORK_SPECIFIC]: 1.0
            }
        };
        return compatibilityMatrix[source]?.[target] || 0.3;
    }
    /**
     * Assess severity of a capability gap
     */
    assessSeverity(feature) {
        const severityMap = {
            'streaming': 'medium',
            'stateful': 'high',
            'multiModal': 'medium',
            'batching': 'low',
            'transactions': 'high',
            'async': 'medium',
            'partialResults': 'low',
            'discovery': 'low'
        };
        return severityMap[feature] || 'medium';
    }
    /**
     * Get penalty for a capability gap
     */
    getGapPenalty(gap) {
        const penalties = {
            'low': 0.05,
            'medium': 0.1,
            'high': 0.2,
            'critical': 0.4
        };
        return penalties[gap.severity] || 0.1;
    }
    /**
     * Get fallback strategies for a specific feature
     */
    getFallbacksForFeature(feature) {
        const fallbackMap = {
            'streaming': [
                {
                    name: 'polling-emulation',
                    description: 'Emulate streaming through periodic polling',
                    confidence: 0.7,
                    implementation: 'poll-with-backoff'
                },
                {
                    name: 'batch-results',
                    description: 'Return results in batches',
                    confidence: 0.6,
                    implementation: 'batch-accumulator'
                }
            ],
            'stateful': [
                {
                    name: 'shadow-state',
                    description: 'Maintain shadow state in translation layer',
                    confidence: 0.8,
                    implementation: 'state-synthesis'
                },
                {
                    name: 'session-tokens',
                    description: 'Use session tokens for state tracking',
                    confidence: 0.7,
                    implementation: 'token-management'
                }
            ],
            'multiModal': [
                {
                    name: 'base64-encoding',
                    description: 'Encode binary data as base64 strings',
                    confidence: 0.9,
                    implementation: 'base64-transform'
                },
                {
                    name: 'url-references',
                    description: 'Use URLs to reference media',
                    confidence: 0.8,
                    implementation: 'url-linking'
                }
            ]
        };
        return fallbackMap[feature] || [];
    }
    /**
     * Create generic fallback for unknown features
     */
    createGenericFallback(gap) {
        return {
            name: `generic-${gap.feature}-fallback`,
            feature: gap.feature,
            type: 'degradation',
            confidenceImpact: 0.2,
            implementation: {
                params: {
                    strategy: 'best-effort',
                    lossAcceptable: true
                }
            }
        };
    }
    /**
     * Generate warnings based on gaps and fallbacks
     */
    generateWarnings(gaps, fallbacks) {
        const warnings = [];
        for (const gap of gaps) {
            if (gap.severity === 'critical') {
                warnings.push(`Critical capability gap: ${gap.feature} not supported in target`);
            }
            else if (gap.severity === 'high') {
                warnings.push(`Significant capability gap: ${gap.feature} will be emulated`);
            }
        }
        for (const fallback of fallbacks) {
            if (fallback.confidenceImpact > 0.15) {
                warnings.push(`Fallback '${fallback.name}' may significantly impact translation quality`);
            }
        }
        return warnings;
    }
    /**
     * Generate recommendations for improving compatibility
     */
    generateRecommendations(gaps, fallbacks, compatibility) {
        const recommendations = {};
        if (compatibility < 0.5) {
            recommendations.warning = 'Low compatibility - consider alternative protocols';
        }
        // Streaming recommendations
        if (gaps.some(g => g.feature === 'streaming')) {
            recommendations.streaming = {
                strategy: 'Use polling with exponential backoff',
                interval: '100ms initial, max 5s',
                partial: 'Enable partial result accumulation'
            };
        }
        // State recommendations
        if (gaps.some(g => g.feature === 'stateful')) {
            recommendations.state = {
                strategy: 'Implement shadow state management',
                storage: 'Use Redis for distributed state',
                ttl: '3600 seconds recommended'
            };
        }
        // Performance recommendations
        if (gaps.length > 3) {
            recommendations.performance = {
                caching: 'Enable aggressive caching',
                batching: 'Batch similar requests',
                precompute: 'Pre-compute common translations'
            };
        }
        return recommendations;
    }
    /**
     * Initialize built-in fallback strategies
     */
    initializeFallbackStrategies() {
        const strategies = new Map();
        // Streaming fallback
        strategies.set('streaming', {
            name: 'streaming-to-polling',
            feature: 'streaming',
            type: 'emulation',
            confidenceImpact: 0.05,
            implementation: {
                params: {
                    pollingInterval: 100,
                    maxPolls: 100,
                    backoffMultiplier: 1.5
                },
                resources: ['timer', 'memory-buffer'],
                performanceImpact: {
                    latencyMs: 50,
                    memoryMb: 10,
                    cpuPercent: 5
                }
            }
        });
        // Stateful fallback
        strategies.set('stateful', {
            name: 'stateful-to-stateless',
            feature: 'stateful',
            type: 'synthesis',
            confidenceImpact: 0.1,
            implementation: {
                params: {
                    stateStore: 'shadow',
                    ttl: 3600,
                    maxStateSize: 1048576
                },
                resources: ['memory', 'storage'],
                performanceImpact: {
                    latencyMs: 5,
                    memoryMb: 50,
                    cpuPercent: 2
                }
            }
        });
        // Multi-modal fallback
        strategies.set('multiModal', {
            name: 'multimodal-to-text',
            feature: 'multiModal',
            type: 'degradation',
            confidenceImpact: 0.15,
            implementation: {
                params: {
                    encoding: 'base64',
                    compressionLevel: 6,
                    maxSize: 10485760
                },
                resources: ['cpu', 'memory'],
                performanceImpact: {
                    latencyMs: 20,
                    memoryMb: 100,
                    cpuPercent: 10
                }
            }
        });
        // Async fallback
        strategies.set('async', {
            name: 'async-to-sync',
            feature: 'async',
            type: 'emulation',
            confidenceImpact: 0.05,
            implementation: {
                params: {
                    timeout: 30000,
                    pollInterval: 100
                },
                performanceImpact: {
                    latencyMs: 100,
                    memoryMb: 5,
                    cpuPercent: 1
                }
            }
        });
        return strategies;
    }
    /**
     * Clear capability cache
     */
    clearCache() {
        this.capabilityCache.clear();
    }
}
exports.CapabilityNegotiator = CapabilityNegotiator;
//# sourceMappingURL=capability-negotiator.js.map