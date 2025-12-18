/**
 * SendCommand - Re-export from consolidated EventDispatchCommand
 *
 * This file exists for backwards compatibility.
 * All functionality is now in trigger.ts (EventDispatchCommand).
 */

export {
  EventDispatchCommand as SendCommand,
  createSendCommand,
  type SendCommandInput,
  type EventOptions,
} from './trigger';

export { EventDispatchCommand as default } from './trigger';
