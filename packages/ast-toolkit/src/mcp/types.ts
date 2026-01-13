/**
 * Model Context Protocol types for AST Toolkit MCP Server
 * Based on MCP schema 2025-03-26
 */

export const JSONRPC_VERSION = '2.0';
export const LATEST_PROTOCOL_VERSION = '2025-03-26';

// ============================================================================
// Base Protocol Types
// ============================================================================

export type RequestId = string | number;
export type ProgressToken = string | number;

export interface Request {
  method: string;
  params?: {
    _meta?: {
      progressToken?: ProgressToken;
    };
    [key: string]: unknown;
  };
}

export interface Result {
  _meta?: { [key: string]: unknown };
  [key: string]: unknown;
}

export interface JSONRPCRequest extends Request {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
}

export interface JSONRPCResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  result: Result;
}

export interface JSONRPCError {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RequestId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// ============================================================================
// Initialization Types
// ============================================================================

export interface Implementation {
  name: string;
  version: string;
}

export interface ClientCapabilities {
  experimental?: { [key: string]: object };
  roots?: {
    listChanged?: boolean;
  };
  sampling?: object;
}

export interface ServerCapabilities {
  experimental?: { [key: string]: object };
  logging?: object;
  completions?: object;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface InitializeRequest extends Request {
  method: 'initialize';
  params: {
    protocolVersion: string;
    capabilities: ClientCapabilities;
    clientInfo: Implementation;
  };
}

export interface InitializeResult extends Result {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
  instructions?: string;
}

// ============================================================================
// Tool Types
// ============================================================================

export interface Tool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: { [key: string]: object };
    required?: string[];
  };
  annotations?: ToolAnnotations;
}

export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ListToolsRequest extends Request {
  method: 'tools/list';
}

export interface ListToolsResult extends Result {
  tools: Tool[];
}

export interface CallToolRequest extends Request {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: { [key: string]: unknown };
  };
}

export interface CallToolResult extends Result {
  content: (TextContent | ImageContent | AudioContent | EmbeddedResource)[];
  isError?: boolean;
}

// ============================================================================
// Resource Types
// ============================================================================

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
  size?: number;
}

export interface ResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
  annotations?: Annotations;
}

export interface ListResourcesRequest extends Request {
  method: 'resources/list';
}

export interface ListResourcesResult extends Result {
  resources: Resource[];
}

export interface ReadResourceRequest extends Request {
  method: 'resources/read';
  params: {
    uri: string;
  };
}

export interface ReadResourceResult extends Result {
  contents: (TextResourceContents | BlobResourceContents)[];
}

export interface ResourceContents {
  uri: string;
  mimeType?: string;
}

export interface TextResourceContents extends ResourceContents {
  text: string;
}

export interface BlobResourceContents extends ResourceContents {
  blob: string;
}

// ============================================================================
// Content Types
// ============================================================================

export interface Annotations {
  audience?: Role[];
  priority?: number;
}

export type Role = 'user' | 'assistant';

export interface TextContent {
  type: 'text';
  text: string;
  annotations?: Annotations;
}

export interface ImageContent {
  type: 'image';
  data: string;
  mimeType: string;
  annotations?: Annotations;
}

export interface AudioContent {
  type: 'audio';
  data: string;
  mimeType: string;
  annotations?: Annotations;
}

export interface EmbeddedResource {
  type: 'resource';
  resource: TextResourceContents | BlobResourceContents;
  annotations?: Annotations;
}

// ============================================================================
// Pagination Types
// ============================================================================

export type Cursor = string;

export interface PaginatedRequest extends Request {
  params?: {
    cursor?: Cursor;
  };
}

export interface PaginatedResult extends Result {
  nextCursor?: Cursor;
}

// ============================================================================
// Error Codes
// ============================================================================

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

// ============================================================================
// Message Union Types
// ============================================================================

export type MCPRequest =
  | InitializeRequest
  | ListToolsRequest
  | CallToolRequest
  | ListResourcesRequest
  | ReadResourceRequest;

export type MCPResult =
  | InitializeResult
  | ListToolsResult
  | CallToolResult
  | ListResourcesResult
  | ReadResourceResult;

export type MCPMessage = MCPRequest | JSONRPCResponse | JSONRPCError;
