/**
 * Tailwind CSS Extension Implementation
 * Provides hide/show strategies for Tailwind CSS classes
 * Based on official _hyperscript/src/ext/tailwind.js
 */

export type TailwindOperation = 'hide' | 'show' | 'toggle';
export type TailwindStrategy = 'twDisplay' | 'twVisibility' | 'twOpacity';

export interface TailwindStrategyFunction {
  (operation: TailwindOperation, element: HTMLElement): Promise<void>;
}

export class TailwindExtension {
  private strategies: Record<TailwindStrategy, TailwindStrategyFunction>;
  private defaultStrategy: TailwindStrategy | null = null;

  constructor() {
    this.strategies = {
      twDisplay: this.createDisplayStrategy(),
      twVisibility: this.createVisibilityStrategy(),
      twOpacity: this.createOpacityStrategy(),
    };
  }

  /**
   * Get all available strategies
   */
  getStrategies(): Record<TailwindStrategy, TailwindStrategyFunction> {
    return { ...this.strategies };
  }

  /**
   * Set the default strategy globally
   */
  setDefaultStrategy(strategy: TailwindStrategy): void {
    if (!this.strategies[strategy]) {
      throw new Error(`Unknown Tailwind strategy: ${strategy}`);
    }
    this.defaultStrategy = strategy;
  }

  /**
   * Get the current default strategy
   */
  getDefaultStrategy(): TailwindStrategy | null {
    return this.defaultStrategy;
  }

  /**
   * Reset default strategy to null
   */
  resetDefaultStrategy(): void {
    this.defaultStrategy = null;
  }

  /**
   * Execute a specific strategy
   */
  async executeStrategy(
    strategy: TailwindStrategy,
    operation: TailwindOperation,
    element: HTMLElement
  ): Promise<void> {
    if (!element) {
      throw new Error('Element is required');
    }

    if (!this.strategies[strategy]) {
      throw new Error(`Unknown Tailwind strategy: ${strategy}`);
    }

    if (!['hide', 'show', 'toggle'].includes(operation)) {
      throw new Error(`Invalid operation: ${operation}`);
    }

    await this.strategies[strategy](operation, element);
  }

  /**
   * Execute using the default strategy (if set)
   */
  async executeWithDefaultStrategy(
    operation: TailwindOperation,
    element: HTMLElement
  ): Promise<void> {
    if (!this.defaultStrategy) {
      throw new Error('No default strategy set');
    }

    await this.executeStrategy(this.defaultStrategy, operation, element);
  }

  /**
   * Create the twDisplay strategy (uses 'hidden' class)
   */
  private createDisplayStrategy(): TailwindStrategyFunction {
    return async (operation: TailwindOperation, element: HTMLElement): Promise<void> => {
      switch (operation) {
        case 'toggle':
          if (element.classList.contains('hidden')) {
            await this.executeStrategy('twDisplay', 'show', element);
          } else {
            await this.executeStrategy('twDisplay', 'hide', element);
          }
          break;

        case 'hide':
          element.classList.add('hidden');
          break;

        case 'show':
          element.classList.remove('hidden');
          break;
      }
    };
  }

  /**
   * Create the twVisibility strategy (uses 'invisible' class)
   */
  private createVisibilityStrategy(): TailwindStrategyFunction {
    return async (operation: TailwindOperation, element: HTMLElement): Promise<void> => {
      switch (operation) {
        case 'toggle':
          if (element.classList.contains('invisible')) {
            await this.executeStrategy('twVisibility', 'show', element);
          } else {
            await this.executeStrategy('twVisibility', 'hide', element);
          }
          break;

        case 'hide':
          element.classList.add('invisible');
          break;

        case 'show':
          element.classList.remove('invisible');
          break;
      }
    };
  }

  /**
   * Create the twOpacity strategy (uses 'opacity-0' class)
   */
  private createOpacityStrategy(): TailwindStrategyFunction {
    return async (operation: TailwindOperation, element: HTMLElement): Promise<void> => {
      switch (operation) {
        case 'toggle':
          if (element.classList.contains('opacity-0')) {
            await this.executeStrategy('twOpacity', 'show', element);
          } else {
            await this.executeStrategy('twOpacity', 'hide', element);
          }
          break;

        case 'hide':
          element.classList.add('opacity-0');
          break;

        case 'show':
          element.classList.remove('opacity-0');
          break;
      }
    };
  }
}

// Create and export a singleton instance
export const tailwindExtension = new TailwindExtension();

export default TailwindExtension;
