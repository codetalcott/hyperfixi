import { describe, it, expect, beforeEach } from 'vitest';
import { HyperfixiPluginRegistry } from '../src/registry';
import type { CommandPlugin, FeaturePlugin } from '../src/types';

describe('Plugin Registry', () => {
  let registry: HyperfixiPluginRegistry;

  beforeEach(() => {
    registry = new HyperfixiPluginRegistry();
  });

  describe('loading plugins', () => {
    it('should load a command plugin', () => {
      const plugin: CommandPlugin = {
        type: 'command',
        name: 'test-command',
        pattern: /^test/,
        execute: async () => {}
      };

      registry.load(plugin);
      expect(registry.get('test-command')).toBe(plugin);
    });

    it('should load multiple plugins', () => {
      const command: CommandPlugin = {
        type: 'command',
        name: 'cmd1',
        pattern: /^cmd1/,
        execute: async () => {}
      };

      const feature: FeaturePlugin = {
        type: 'feature',
        name: 'feat1'
      };

      registry.load(command, feature);
      expect(registry.get('cmd1')).toBe(command);
      expect(registry.get('feat1')).toBe(feature);
    });

    it('should reject duplicate plugins', () => {
      const plugin: CommandPlugin = {
        type: 'command',
        name: 'duplicate',
        pattern: /^dup/,
        execute: async () => {}
      };

      registry.load(plugin);
      expect(() => registry.load(plugin)).toThrow('already loaded');
    });

    it('should check dependencies', () => {
      const dependent: CommandPlugin = {
        type: 'command',
        name: 'dependent',
        pattern: /^dep/,
        dependencies: ['required-plugin'],
        execute: async () => {}
      };

      expect(() => registry.load(dependent)).toThrow('depends on');
    });
  });

  describe('getting plugins', () => {
    it('should get plugins by type', () => {
      const cmd1: CommandPlugin = {
        type: 'command',
        name: 'cmd1',
        pattern: /^cmd1/,
        execute: async () => {}
      };

      const cmd2: CommandPlugin = {
        type: 'command',
        name: 'cmd2',
        pattern: /^cmd2/,
        execute: async () => {}
      };

      const feature: FeaturePlugin = {
        type: 'feature',
        name: 'feat1'
      };

      registry.load(cmd1, cmd2, feature);

      const commands = registry.getByType<CommandPlugin>('command');
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('command');
    });
  });

  describe('unloading plugins', () => {
    it('should unload a plugin', () => {
      const plugin: CommandPlugin = {
        type: 'command',
        name: 'to-unload',
        pattern: /^unload/,
        execute: async () => {}
      };

      registry.load(plugin);
      expect(registry.get('to-unload')).toBeDefined();

      registry.unload('to-unload');
      expect(registry.get('to-unload')).toBeUndefined();
    });
  });
});
