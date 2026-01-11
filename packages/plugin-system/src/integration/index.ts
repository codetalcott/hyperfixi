/**
 * Integration Module
 * Provides bridges between plugin-system and core hyperfixi components
 */

// Parser integration
export {
  ParserBridge,
  createParserBridge,
  tokenize,
  type ExtendedParseContext,
  type ParserBridgeConfig,
  type PluginRegistration,
} from './parser-bridge';
