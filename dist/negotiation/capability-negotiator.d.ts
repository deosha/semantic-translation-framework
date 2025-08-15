/**
 * Capability Negotiator
 *
 * Automatically discovers and negotiates capabilities between different
 * protocol paradigms, generating fallback strategies for incompatible features.
 *
 * Based on paper Section IV.E: Capability Negotiation
 */
import { ProtocolFeatures, ProtocolManifest } from '../types/protocols';
import { CapabilityGap, NegotiationResult } from '../types/semantic-translation';
/**
 * Capability Negotiator
 *
 * Handles protocol capability discovery and fallback generation
 */
export declare class CapabilityNegotiator {
    private fallbackStrategies;
    private capabilityCache;
    constructor();
    /**
     * Negotiate capabilities between two protocol paradigms
     */
    negotiate(sourceManifest: ProtocolManifest, targetManifest: ProtocolManifest): Promise<NegotiationResult>;
    /**
     * Identify capability gaps between protocols
     */
    identifyCapabilityGaps(sourceFeatures: ProtocolFeatures, targetFeatures: ProtocolFeatures): CapabilityGap[];
    /**
     * Generate fallback strategies for capability gaps
     */
    private generateFallbackStrategies;
    /**
     * Calculate overall compatibility score
     */
    private calculateCompatibility;
    /**
     * Find compatible capabilities between protocols
     */
    private findCompatibleCapabilities;
    /**
     * Compare two capabilities for compatibility
     */
    private compareCapabilities;
    /**
     * Check if two names are similar
     */
    private areNamesSimilar;
    /**
     * Check if constraints are compatible
     */
    private constraintsCompatible;
    /**
     * Get paradigm compatibility score
     */
    private getParadigmCompatibility;
    /**
     * Assess severity of a capability gap
     */
    private assessSeverity;
    /**
     * Get penalty for a capability gap
     */
    private getGapPenalty;
    /**
     * Get fallback strategies for a specific feature
     */
    private getFallbacksForFeature;
    /**
     * Create generic fallback for unknown features
     */
    private createGenericFallback;
    /**
     * Generate warnings based on gaps and fallbacks
     */
    private generateWarnings;
    /**
     * Generate recommendations for improving compatibility
     */
    private generateRecommendations;
    /**
     * Initialize built-in fallback strategies
     */
    private initializeFallbackStrategies;
    /**
     * Clear capability cache
     */
    clearCache(): void;
}
//# sourceMappingURL=capability-negotiator.d.ts.map