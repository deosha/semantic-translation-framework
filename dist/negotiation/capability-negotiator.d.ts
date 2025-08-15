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
import { EventEmitter } from 'events';
import { MCPTool, MCPResource, MCPPrompt } from '../protocols/mcp.types';
import { A2AAgentCard } from '../protocols/a2a.types';
/**
 * Protocol Capability
 */
export interface ProtocolCapability {
    /** Capability name */
    name: string;
    /** Capability version */
    version: string;
    /** Whether this capability is required */
    required: boolean;
    /** Supported features */
    features: string[];
    /** Metadata */
    metadata?: Record<string, any>;
}
/**
 * Negotiation Result
 */
export interface NegotiationResult {
    /** Whether negotiation was successful */
    success: boolean;
    /** Negotiated capabilities */
    capabilities: ProtocolCapability[];
    /** Compatibility score (0-1) */
    compatibility: number;
    /** Features that require fallback */
    fallbacks: Array<{
        feature: string;
        strategy: string;
        confidence: number;
    }>;
    /** Warnings about compatibility issues */
    warnings: string[];
    /** Recommended configuration */
    recommendations: Record<string, any>;
}
/**
 * Protocol Manifest
 */
export interface ProtocolManifest {
    /** Protocol name */
    protocol: 'mcp' | 'a2a';
    /** Protocol version */
    version: string;
    /** Supported capabilities */
    capabilities: ProtocolCapability[];
    /** Feature flags */
    features: {
        streaming?: boolean;
        batching?: boolean;
        compression?: boolean;
        encryption?: boolean;
        stateful?: boolean;
        multiModal?: boolean;
        contextAware?: boolean;
    };
    /** Performance characteristics */
    performance?: {
        maxConcurrency?: number;
        maxMessageSize?: number;
        timeout?: number;
        rateLimit?: number;
    };
    /** Authentication requirements */
    authentication?: {
        type: 'none' | 'api-key' | 'oauth2' | 'custom';
        required: boolean;
    };
}
/**
 * Capability Negotiator
 *
 * Handles dynamic capability discovery and negotiation
 */
export declare class CapabilityNegotiator extends EventEmitter {
    private mcpManifest;
    private a2aManifest;
    private mappings;
    private negotiationCache;
    private compatibilityMatrix;
    constructor();
    /**
     * Discover MCP capabilities
     */
    discoverMCPCapabilities(tools?: MCPTool[], resources?: MCPResource[], prompts?: MCPPrompt[]): Promise<ProtocolManifest>;
    /**
     * Discover A2A capabilities
     */
    discoverA2ACapabilities(agentCards?: A2AAgentCard[]): Promise<ProtocolManifest>;
    /**
     * Negotiate capabilities between protocols
     */
    negotiate(mcpManifest?: ProtocolManifest, a2aManifest?: ProtocolManifest): Promise<NegotiationResult>;
    /**
     * Check if a specific capability is supported
     */
    isCapabilitySupported(capability: string, protocol: 'mcp' | 'a2a'): boolean;
    /**
     * Get fallback strategy for unsupported capability
     */
    getFallbackStrategy(capability: string, sourceProtocol: 'mcp' | 'a2a'): {
        strategy: string;
        confidence: number;
    } | null;
    /**
     * Update capability mapping
     */
    updateMapping(source: string, target: string, confidence: number, transformations?: string[]): void;
    /**
     * Get compatibility score between two capabilities
     */
    getCompatibilityScore(mcpCapability: string, a2aCapability: string): number;
    private initializeDefaultMappings;
    private negotiateFeatures;
    private findBestMapping;
    private calculateMappingConfidence;
    private calculateCompatibility;
}
//# sourceMappingURL=capability-negotiator.d.ts.map