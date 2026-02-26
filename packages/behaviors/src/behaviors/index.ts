/**
 * Behaviors Index
 *
 * Re-exports all behavior implementations.
 */

export {
  draggableSource,
  draggableMetadata,
  registerDraggable,
  default as Draggable,
} from './draggable';

export {
  sortableSource,
  sortableMetadata,
  registerSortable,
  default as Sortable,
} from './sortable';

export {
  resizableSource,
  resizableMetadata,
  registerResizable,
  default as Resizable,
} from './resizable';

export {
  removableSource,
  removableMetadata,
  registerRemovable,
  default as Removable,
} from './removable';

export {
  toggleableSource,
  toggleableMetadata,
  registerToggleable,
  default as Toggleable,
} from './toggleable';

export {
  clipboardSource,
  clipboardMetadata,
  registerClipboard,
  default as Clipboard,
} from './clipboard';

export {
  autoDismissSource,
  autoDismissMetadata,
  registerAutoDismiss,
  default as AutoDismiss,
} from './autodismiss';

export {
  clickOutsideSource,
  clickOutsideMetadata,
  registerClickOutside,
  default as ClickOutside,
} from './clickoutside';

export {
  focusTrapSource,
  focusTrapMetadata,
  registerFocusTrap,
  default as FocusTrap,
} from './focustrap';

export {
  scrollRevealSource,
  scrollRevealMetadata,
  registerScrollReveal,
  default as ScrollReveal,
} from './scrollreveal';

export { tabsSource, tabsMetadata, registerTabs, default as Tabs } from './tabs';
