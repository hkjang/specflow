// AI Agent Interface Definitions
// Defines the structure for autonomous requirement generation agents

/**
 * Agent Types
 */
export enum AgentType {
  EXTRACTOR = 'EXTRACTOR',       // 요건 추출 에이전트
  REFINER = 'REFINER',           // 요건 정제 에이전트
  CLASSIFIER = 'CLASSIFIER',     // 카테고리 분류 에이전트
  EXPANDER = 'EXPANDER',         // 요건 확장 에이전트
  VALIDATOR = 'VALIDATOR',       // 정확도 검증 에이전트
  RISK_DETECTOR = 'RISK_DETECTOR' // 위험 탐지 에이전트
}

/**
 * Agent Execution Context
 */
export interface AgentContext {
  sessionId: string;
  userId?: string;
  industry?: string;
  systemType?: 'SAAS' | 'INTERNAL' | 'B2C' | 'B2B';
  organizationMaturity?: 'STARTUP' | 'MID' | 'ENTERPRISE';
  regulationLevel?: 'HIGH' | 'MEDIUM' | 'LOW';
  previousResults?: AgentResult[];
}

/**
 * Agent Input
 */
export interface AgentInput {
  type: 'TEXT' | 'FILE' | 'URL' | 'REQUIREMENTS';
  content?: string;
  fileBuffer?: Buffer;
  fileType?: string;
  url?: string;
  requirements?: RequirementCandidate[];
}

/**
 * Requirement Candidate (extracted/generated)
 */
export interface RequirementCandidate {
  id?: string;
  title: string;
  content: string;
  category?: string;
  type?: 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'INTERFACE' | 'CONSTRAINT';
  confidence: number;  // 0-1
  source?: string;
  thinkingLog?: ThinkingLogEntry[];
}

/**
 * Thinking Log Entry
 */
export interface ThinkingLogEntry {
  timestamp: Date;
  agentType: AgentType;
  reasoning: string;
  references?: string[];
  confidence: number;
}

/**
 * Agent Result
 */
export interface AgentResult {
  agentType: AgentType;
  success: boolean;
  executionTime: number;
  candidates?: RequirementCandidate[];
  metrics?: Record<string, number>;
  logs?: ThinkingLogEntry[];
  error?: string;
  cached?: boolean;
}

/**
 * Accuracy Heatmap Metrics
 */
export interface AccuracyMetrics {
  structuralFit: number;      // 구조 적합도 (0-100)
  industryFit: number;        // 산업 적합도 (0-100)
  missingRisk: number;        // 누락 위험도 (0-100)
  duplicateRatio: number;     // 중복도 (0-100)
  feasibility: number;        // 실행 가능성 (0-100)
  overallScore: number;       // 전체 점수
}

/**
 * Industry Benchmark
 */
export interface IndustryBenchmark {
  industry: string;
  function: string;
  avgAccuracy: number;
  cautionAreas: string[];
}

/**
 * Autonomous Generation Config
 */
export interface AutonomousGenerationConfig {
  industry: string;
  systemType: 'SAAS' | 'INTERNAL' | 'B2C' | 'B2B';
  organizationMaturity: 'STARTUP' | 'MID' | 'ENTERPRISE';
  regulationLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  maxRequirements?: number;
  includeNonFunctional?: boolean;
  includeSecurityRequirements?: boolean;
}

/**
 * Pipeline Configuration
 */
export interface AgentPipelineConfig {
  agents: AgentType[];
  stopOnError?: boolean;
  parallel?: boolean;
  maxConcurrency?: number;
}

/**
 * Risk Detection Result
 */
export interface RiskDetectionResult {
  requirementId: string;
  risks: {
    type: 'SECURITY' | 'PRIVACY' | 'REGULATION' | 'COMPLIANCE';
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    description: string;
    recommendation?: string;
  }[];
}

/**
 * Base Agent Interface
 */
export interface IRequirementAgent {
  type: AgentType;
  name: string;
  description: string;
  
  execute(input: AgentInput, context: AgentContext): Promise<AgentResult>;
  validate?(input: AgentInput): boolean;
}
