/**
 * Deserializer - Converts binary format back to JavaScript objects
 *
 * This module provides full deserialization of binary tree format back
 * to native JavaScript objects. For partial/selective access, use the
 * accessor module instead.
 */

import {
  ReadCursor,
  SerializableValue,
  ValueType,
  HEADER_SIZE,
  TYPE_TAG_SIZE,
  LENGTH_SIZE,
  OBJECT_ENTRY_SIZE,
  ARRAY_ENTRY_SIZE,
  NUMBER_SIZE,
  BOOLEAN_SIZE,
} from './types';

import {
  createReadCursor,
  readHeader,
  readUint8,
  readUint32,
  readFloat64,
  readString,
} from './buffer-context';

// =============================================================================
// Main Deserialization API
// =============================================================================

/**
 * Deserializes an ArrayBuffer in binary tree format back to a JavaScript value.
 * @throws Error if the buffer is invalid or corrupted
 */
export function deserialize(buffer: ArrayBuffer): unknown {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error('Buffer too small to contain valid binary tree data');
  }

  const cursor = createReadCursor(buffer);
  const header = readHeader(cursor);

  if (!header) {
    throw new Error('Invalid binary tree format: bad magic number');
  }

  if (header.version !== 1) {
    throw new Error(`Unsupported binary tree format version: ${header.version}`);
  }

  return deserializeValue(cursor, header.rootOffset);
}

// =============================================================================
// Value Deserialization
// =============================================================================

/**
 * Deserializes a value at the given offset
 */
function deserializeValue(cursor: ReadCursor, offset: number): SerializableValue {
  const type = readUint8(cursor, offset);

  switch (type) {
    case ValueType.Null:
      return null;

    case ValueType.Undefined:
      return undefined;

    case ValueType.Boolean:
      return deserializeBoolean(cursor, offset);

    case ValueType.Number:
      return deserializeNumber(cursor, offset);

    case ValueType.String:
      return deserializeString(cursor, offset);

    case ValueType.Array:
      return deserializeArray(cursor, offset);

    case ValueType.Object:
      return deserializeObject(cursor, offset);

    default:
      throw new Error(`Unknown value type: ${type}`);
  }
}

/**
 * Deserializes a boolean value
 * Layout: [type:1][value:1]
 */
function deserializeBoolean(cursor: ReadCursor, offset: number): boolean {
  const value = readUint8(cursor, offset + TYPE_TAG_SIZE);
  return value !== 0;
}

/**
 * Deserializes a number value
 * Layout: [type:1][float64:8]
 */
function deserializeNumber(cursor: ReadCursor, offset: number): number {
  return readFloat64(cursor, offset + TYPE_TAG_SIZE);
}

/**
 * Deserializes a string value
 * Layout: [type:1][length:4][utf8-data:length]
 */
function deserializeString(cursor: ReadCursor, offset: number): string {
  const length = readUint32(cursor, offset + TYPE_TAG_SIZE);
  const dataOffset = offset + TYPE_TAG_SIZE + LENGTH_SIZE;
  return readString(cursor, dataOffset, length);
}

/**
 * Deserializes an array value
 * Layout: [type:1][count:4][valueOffset0:4][valueOffset1:4]...[values...]
 */
function deserializeArray(cursor: ReadCursor, offset: number): SerializableValue[] {
  const count = readUint32(cursor, offset + TYPE_TAG_SIZE);
  const tableOffset = offset + TYPE_TAG_SIZE + LENGTH_SIZE;

  const result: SerializableValue[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const valueOffset = readUint32(cursor, tableOffset + i * ARRAY_ENTRY_SIZE);
    result[i] = deserializeValue(cursor, valueOffset);
  }

  return result;
}

/**
 * Deserializes an object value
 * Layout: [type:1][keyCount:4][entries:keyCount*12][...keys][...values]
 */
function deserializeObject(cursor: ReadCursor, offset: number): Record<string, SerializableValue> {
  const keyCount = readUint32(cursor, offset + TYPE_TAG_SIZE);
  const tableOffset = offset + TYPE_TAG_SIZE + LENGTH_SIZE;

  const result: Record<string, SerializableValue> = {};

  for (let i = 0; i < keyCount; i++) {
    const entryOffset = tableOffset + i * OBJECT_ENTRY_SIZE;

    // Read entry: keyOffset, keyLength, valueOffset
    const keyOffset = readUint32(cursor, entryOffset);
    const keyLength = readUint32(cursor, entryOffset + 4);
    const valueOffset = readUint32(cursor, entryOffset + 8);

    // Read key and value
    const key = readString(cursor, keyOffset, keyLength);
    const value = deserializeValue(cursor, valueOffset);

    result[key] = value;
  }

  return result;
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates that a buffer contains valid binary tree data without fully deserializing
 */
export function validate(buffer: ArrayBuffer): { valid: boolean; error?: string } {
  if (buffer.byteLength < HEADER_SIZE) {
    return { valid: false, error: 'Buffer too small' };
  }

  const cursor = createReadCursor(buffer);
  const header = readHeader(cursor);

  if (!header) {
    return { valid: false, error: 'Invalid magic number' };
  }

  if (header.version !== 1) {
    return { valid: false, error: `Unsupported version: ${header.version}` };
  }

  if (header.rootOffset < HEADER_SIZE || header.rootOffset >= buffer.byteLength) {
    return { valid: false, error: 'Invalid root offset' };
  }

  if (header.totalSize > buffer.byteLength) {
    return { valid: false, error: 'Declared size exceeds buffer' };
  }

  // Validate root value type
  const rootType = readUint8(cursor, header.rootOffset);
  if (rootType > ValueType.Undefined) {
    return { valid: false, error: `Invalid root type: ${rootType}` };
  }

  return { valid: true };
}

// =============================================================================
// Inspection Utilities
// =============================================================================

/**
 * Returns information about the binary tree structure without deserializing values
 */
export function inspect(buffer: ArrayBuffer): {
  valid: boolean;
  header?: { magic: number; version: number; rootOffset: number; totalSize: number };
  rootType?: string;
  error?: string;
} {
  const validation = validate(buffer);

  if (!validation.valid) {
    return { valid: false, error: validation.error };
  }

  const cursor = createReadCursor(buffer);
  const header = readHeader(cursor)!;
  const rootType = readUint8(cursor, header.rootOffset);

  const typeNames: Record<number, string> = {
    [ValueType.Null]: 'null',
    [ValueType.Boolean]: 'boolean',
    [ValueType.Number]: 'number',
    [ValueType.String]: 'string',
    [ValueType.Array]: 'array',
    [ValueType.Object]: 'object',
    [ValueType.Undefined]: 'undefined',
  };

  return {
    valid: true,
    header,
    rootType: typeNames[rootType] ?? 'unknown',
  };
}
