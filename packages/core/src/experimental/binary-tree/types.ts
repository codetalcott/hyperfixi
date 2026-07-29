/**
 * Lite³-inspired Binary Tree Serialization Types
 *
 * This module defines the binary format for storing JavaScript objects
 * as a B-tree inside a single ArrayBuffer, enabling O(log n) field access
 * without full deserialization.
 */

// =============================================================================
// Binary Format Constants
// =============================================================================

/** Magic number "LIT3" in ASCII (0x4C495433) */
export const MAGIC_NUMBER = 0x4c495433;

/** Current format version */
export const FORMAT_VERSION = 1;

/** Header size in bytes */
export const HEADER_SIZE = 16;

// =============================================================================
// Value Type Tags
// =============================================================================

/** Type tags for serialized values */
export const enum ValueType {
  Null = 0,
  Boolean = 1,
  Number = 2,
  String = 3,
  Array = 4,
  Object = 5,
  Undefined = 6,
}

// =============================================================================
// Binary Layout Structures
// =============================================================================

/**
 * Header layout (16 bytes):
 * - [0-3]   magic: uint32 (0x4C495433 = "LIT3")
 * - [4-7]   version: uint32
 * - [8-11]  rootOffset: uint32 (offset to root value)
 * - [12-15] totalSize: uint32 (total buffer size)
 */
export interface HeaderLayout {
  magic: number;
  version: number;
  rootOffset: number;
  totalSize: number;
}

/**
 * Object entry in the sorted key table:
 * - keyOffset: offset to key string data
 * - keyLength: length of key string
 * - valueOffset: offset to value data
 */
export interface ObjectEntry {
  keyOffset: number;
  keyLength: number;
  valueOffset: number;
}

// =============================================================================
// API Types
// =============================================================================

/** Options for BinaryTree operations */
export interface BinaryTreeOptions {
  /** Initial buffer size in bytes (default: 4096) */
  initialSize?: number;
  /** Buffer growth multiplier when resizing (default: 2) */
  growthFactor?: number;
}

/** Result of a serialization operation */
export interface SerializeResult {
  /** The serialized buffer */
  buffer: ArrayBuffer;
  /** Total bytes used */
  bytesUsed: number;
}

/** Supported primitive types for serialization */
export type SerializablePrimitive = null | undefined | boolean | number | string;

/** Supported value types for serialization */
export type SerializableValue =
  SerializablePrimitive | SerializableValue[] | { [key: string]: SerializableValue };

// =============================================================================
// Internal Types
// =============================================================================

/** Write cursor state for serialization */
export interface WriteCursor {
  buffer: ArrayBuffer;
  view: DataView;
  uint8: Uint8Array;
  offset: number;
}

/** Read cursor state for deserialization */
export interface ReadCursor {
  view: DataView;
  uint8: Uint8Array;
  offset: number;
}

// =============================================================================
// Size Constants
// =============================================================================

/** Size of a value type tag (1 byte) */
export const TYPE_TAG_SIZE = 1;

/** Size of a length/count field (4 bytes) */
export const LENGTH_SIZE = 4;

/** Size of an offset field (4 bytes) */
export const OFFSET_SIZE = 4;

/** Size of an object entry (12 bytes: keyOffset + keyLength + valueOffset) */
export const OBJECT_ENTRY_SIZE = 12;

/** Size of an array entry (4 bytes: valueOffset) */
export const ARRAY_ENTRY_SIZE = 4;

/** Size of a number value (8 bytes: float64) */
export const NUMBER_SIZE = 8;

/** Size of a boolean value (1 byte) */
export const BOOLEAN_SIZE = 1;
