/**
 * Frontend Type Definitions & Documentation (JSDoc)
 */

/**
 * @typedef {Object} SchemaLink
 * @property {string} phrase
 * @property {string} table
 * @property {string} column
 * @property {string} type
 * @property {number} score
 * @property {string} explanation
 */

/**
 * @typedef {Object} SelectedSchemaTable
 * @property {string} tableName
 * @property {string} description
 * @property {Array<{name: string, type: string, description: string, reason: string}>} columns
 */

/**
 * @typedef {Object} AnalysisResponse
 * @property {string} question
 * @property {string} intent
 * @property {string[]} secondaryIntents
 * @property {Array<{phrase: string, type: string, value: string|number}>} entities
 * @property {Record<string, any>} filters
 * @property {SchemaLink[]} schemaLinks
 * @property {SelectedSchemaTable[]} selectedSchema
 * @property {Array<{from: string, to: string, type: string}>} joinPaths
 * @property {string} sql
 * @property {boolean} isAiGenerated
 * @property {string} modelUsed
 * @property {{isValid: boolean, queryType: string, analysis: Record<string, boolean>, error?: string}} validation
 * @property {{columns: string[], rows: Record<string, any>[], rowCount: number, executionTimeMs: number, source: string}} result
 * @property {{answer: string, keyInsights: string[], metricsSummary: Record<string, any>, formattedTableData: Record<string, any>, dataQuality: Record<string, any>}} analysis
 * @property {string} answer
 * @property {Array<{step: string, durationMs: number, details: string}>} pipelineTrace
 * @property {number} totalPipelineDurationMs
 */

/**
 * @typedef {Object} DatabaseSchema
 * @property {Array<{name: string, description: string, primaryKey: string, rowCount: number, columns: Array<any>, foreignKeys: Array<any>}>} tables
 * @property {string} databaseName
 * @property {string} version
 * @property {string} dialect
 */

/**
 * @typedef {Object} BenchmarkReport
 * @property {string} timestamp
 * @property {number} totalTests
 * @property {number} passedCount
 * @property {number} failedCount
 * @property {number} overallAccuracyPct
 * @property {number} intentAccuracyPct
 * @property {number} schemaLinkingAccuracyPct
 * @property {number} sqlValidityPct
 * @property {number} executionSuccessPct
 * @property {number} avgLatencyMs
 * @property {Array<any>} results
 */

/**
 * @typedef {Object} RequestLogEntry
 * @property {string} id
 * @property {string} timestamp
 * @property {string} question
 * @property {string} intent
 * @property {string[]} extractedPhrases
 * @property {string[]} selectedTables
 * @property {string} generatedSql
 * @property {boolean} isValid
 * @property {number} rowCount
 * @property {number} executionTimeMs
 * @property {string} modelUsed
 * @property {string} finalAnswer
 * @property {'SUCCESS'|'VALIDATION_ERROR'|'EXECUTION_ERROR'} status
 */

/**
 * @typedef {Object} FlowiseNode
 * @property {string} id
 * @property {string} name
 * @property {string} label
 * @property {string} category
 * @property {string} description
 * @property {Record<string, any>} inputs
 * @property {string[]} outputs
 * @property {string} status
 * @property {number} [executionTimeMs]
 * @property {string} [dataSummary]
 * @property {{x: number, y: number}} [position]
 */

/**
 * @typedef {Object} FlowiseWorkflowState
 * @property {string} workflowId
 * @property {string} workflowName
 * @property {string} version
 * @property {string} [description]
 * @property {string} [activeTemplateId]
 * @property {FlowiseNode[]} nodes
 * @property {Array<{id: string, source: string, target: string, label?: string}>} edges
 * @property {boolean} isRemoteConfigured
 * @property {string} [flowiseUrl]
 */

export const NavTabs = {
  STUDIO: 'studio',
  SCHEMA: 'schema',
  FLOWISE: 'flowise',
  BENCHMARKS: 'benchmarks',
  CONSOLE: 'console',
  LOGS: 'logs'
};
