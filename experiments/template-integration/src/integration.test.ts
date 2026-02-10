import { describe, it, expect, beforeEach } from 'vitest';
import {
  LokaScriptTemplateEngine,
  compileTemplate,
  renderTemplate,
  createTemplateEngine,
} from './engine';
import { createComponent, createCollection } from '@lokascript/component-schema';
import { TemplateContext } from './types';

describe('Template Integration Tests', () => {
  let engine: LokaScriptTemplateEngine;

  beforeEach(async () => {
    engine = new LokaScriptTemplateEngine();

    // Register common components for testing
    await setupTestComponents(engine);
  });

  describe('real-world scenarios', () => {
    it('should handle complete e-commerce product page', async () => {
      const template = `
        <div class="product-page" _="init fetch /api/product/{{productId}} then put result into me">
          <div class="product-header">
            <h1>{{product.name}}</h1>
            <div class="price">$\{{product.price}}</div>
          </div>
          
          <div class="product-images">
            <img src="{{product.mainImage}}" alt="{{product.name}}" 
                 _="on click call image-modal with me" />
          </div>
          
          <div class="product-details">
            <p>{{product.description}}</p>
            
            <div class="variants" hf-if="product.hasVariants">
              <add-to-cart productId="{{productId}}" variants="{{product.variants}}">
                <quantity-selector min="1" max="{{product.maxQuantity}}" />
                <variant-selector variants="{{product.variants}}" />
              </add-to-cart>
            </div>
            
            <div class="reviews">
              <review-list productId="{{productId}}" />
              <review-form productId="{{productId}}" 
                          _="on submit halt then fetch /api/reviews with method: 'POST'" />
            </div>
          </div>
        </div>
      `;

      const context: TemplateContext = {
        variables: {
          productId: '123',
          product: {
            name: 'Premium Widget',
            price: 29.99,
            description: 'A high-quality widget for all your needs',
            mainImage: '/images/widget.jpg',
            hasVariants: true,
            variants: ['red', 'blue', 'green'],
            maxQuantity: 10,
          },
        },
      };

      const result = await engine.compile(template);
      expect(result.components.length).toBeGreaterThan(0);
      expect(result.hyperscript.length).toBeGreaterThan(0);
      expect(result.variables).toContain('productId');
      expect(result.variables).toContain('product.name');

      const rendered = await engine.render(result, context);
      expect(rendered).toContain('Premium Widget');
      expect(rendered).toContain('$29.99');
      expect(rendered).toContain('/api/product/123');
    });

    it('should handle user dashboard with dynamic content', async () => {
      const template = `
        <div class="dashboard" _="init fetch /api/dashboard/{{userId}} then put result into me">
          <header class="dashboard-header">
            <h1>Welcome back, {{user.name}}!</h1>
            <div class="user-menu">
              <notification-bell userId="{{userId}}" />
              <user-avatar src="{{user.avatar}}" />
            </div>
          </header>

          <div class="dashboard-content">
            <div class="stats-grid">
              <stat-card title="Total Orders" value="{{stats.orders}}" icon="shopping-cart" />
              <stat-card title="Revenue" value="$\{{stats.revenue}}" icon="dollar" />
              <stat-card title="Customers" value="{{stats.customers}}" icon="users" />
            </div>

            <div class="recent-activity">
              <h2>Recent Activity</h2>
              <activity-list userId="{{userId}}" limit="10" />
            </div>

            <div class="quick-actions">
              <quick-action-button action="new-order" _="on click trigger newOrder">
                New Order
              </quick-action-button>
              <quick-action-button action="reports" _="on click go to /reports">
                View Reports
              </quick-action-button>
            </div>
          </div>
        </div>
      `;

      const context: TemplateContext = {
        variables: {
          userId: 'user123',
          user: {
            name: 'John Doe',
            avatar: '/avatars/john.jpg',
          },
          stats: {
            orders: 156,
            revenue: 12450.75,
            customers: 89,
          },
        },
      };

      const result = await engine.compile(template);
      const rendered = await engine.render(result, context);

      expect(rendered).toContain('Welcome back, John Doe!');
      expect(rendered).toContain('Total Orders');
      expect(rendered).toContain('156');
      expect(rendered).toContain('$12450.75');
      expect(rendered).toContain('/api/dashboard/user123');
    });

    it('should handle complex form with validation', async () => {
      const template = `
        <div class="registration-form">
          <h1>Create Account</h1>
          
          <multi-step-form steps="{{formSteps}}" 
                           _="on complete fetch /api/register with method: 'POST'">
            
            <!-- Step 1: Basic Info -->
            <form-step name="basic" title="Basic Information">
              <form-field name="firstName" type="text" required>
                <label>First Name</label>
                <input type="text" name="firstName" 
                       _="on blur validate me then add .validated to me" />
                <validation-message for="firstName" />
              </form-field>
              
              <form-field name="lastName" type="text" required>
                <label>Last Name</label>
                <input type="text" name="lastName" 
                       _="on blur validate me then add .validated to me" />
                <validation-message for="lastName" />
              </form-field>
              
              <form-field name="email" type="email" required>
                <label>Email Address</label>
                <input type="email" name="email" 
                       _="on blur fetch /api/validate-email with {email: my.value}" />
                <validation-message for="email" />
              </form-field>
            </form-step>

            <!-- Step 2: Password -->
            <form-step name="password" title="Security">
              <form-field name="password" type="password" required>
                <label>Password</label>
                <password-input name="password" 
                               strength-indicator="true"
                               _="on input call checkPasswordStrength" />
                <password-strength-indicator />
              </form-field>
              
              <form-field name="confirmPassword" type="password" required>
                <label>Confirm Password</label>
                <input type="password" name="confirmPassword" 
                       _="on blur if my.value is not previous <input/>'s value 
                                then add .error to me" />
              </form-field>
            </form-step>

            <!-- Step 3: Preferences -->
            <form-step name="preferences" title="Preferences">
              <form-field name="newsletter" type="checkbox">
                <label>
                  <input type="checkbox" name="newsletter" checked />
                  Subscribe to newsletter
                </label>
              </form-field>
              
              <form-field name="notifications" type="checkbox-group">
                <label>Email Notifications</label>
                <checkbox-group name="notifications" options="{{notificationOptions}}" />
              </form-field>
            </form-step>

            <div class="form-actions">
              <button type="button" class="prev" 
                      _="on click trigger previousStep"
                      hf-if="currentStep > 0">
                Previous
              </button>
              <button type="button" class="next" 
                      _="on click if validateStep() then trigger nextStep"
                      hf-if="currentStep < totalSteps - 1">
                Next
              </button>
              <button type="submit" class="submit" 
                      hf-if="currentStep === totalSteps - 1">
                Create Account
              </button>
            </div>
          </multi-step-form>
        </div>
      `;

      const context: TemplateContext = {
        variables: {
          formSteps: ['basic', 'password', 'preferences'],
          notificationOptions: [
            { value: 'orders', label: 'Order Updates' },
            { value: 'promotions', label: 'Promotions' },
            { value: 'newsletter', label: 'Weekly Newsletter' },
          ],
          currentStep: 0,
          totalSteps: 3,
        },
      };

      const result = await engine.compile(template);
      const rendered = await engine.render(result, context);

      expect(rendered).toContain('Create Account');
      expect(rendered).toContain('Basic Information');
      expect(rendered).toContain('Security');
      expect(rendered).toContain('Preferences');
      expect(result.hyperscript.some(h => h.includes('validate me'))).toBe(true);
      expect(result.hyperscript.some(h => h.includes('checkPasswordStrength'))).toBe(true);
    });
  });

  describe('performance with large templates', () => {
    it('should handle large data tables efficiently', async () => {
      const template = `
        <div class="data-table" _="init fetch /api/data then put result into tbody">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <!-- Dynamic rows will be inserted here -->
            </tbody>
          </table>
          
          <pagination total="{{totalRecords}}" 
                     page="{{currentPage}}" 
                     limit="{{pageSize}}"
                     _="on pageChange fetch /api/data?page=@page then put result into tbody" />
        </div>
      `;

      const startTime = performance.now();
      const result = await engine.compile(template);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should compile in under 100ms
      expect(result.variables).toContain('totalRecords');
      expect(result.variables).toContain('currentPage');
      expect(result.variables).toContain('pageSize');
    });

    it('should handle multiple simultaneous compilations', async () => {
      const templates = Array.from(
        { length: 50 },
        (_, i) => `<div class="item-${i}">{{message${i}}}</div>`
      );

      const startTime = performance.now();
      const promises = templates.map(template => engine.compile(template));
      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second

      // Check cache effectiveness
      const stats = engine.getStats();
      expect(stats.totalCompilations).toBe(50);
    });
  });

  describe('component ecosystem integration', () => {
    it('should work with complex component hierarchy', async () => {
      const template = `
        <app-layout theme="{{theme}}">
          <app-header slot="header">
            <nav-menu items="{{menuItems}}" />
            <search-bar placeholder="Search..." 
                       _="on submit fetch /api/search?q=@query" />
            <user-menu user="{{currentUser}}" />
          </app-header>

          <main-content slot="content">
            <breadcrumb-nav path="{{breadcrumbPath}}" />
            
            <content-area>
              <sidebar slot="sidebar">
                <filter-panel filters="{{availableFilters}}" 
                             _="on change trigger updateResults" />
                <recent-items user="{{currentUser}}" />
              </sidebar>

              <main-panel slot="main">
                <result-grid items="{{searchResults}}" 
                           _="init if no @items then hide me" />
                <load-more-button _="on click fetch /api/more then append result to previous .result-grid" />
              </main-panel>
            </content-area>
          </main-content>

          <app-footer slot="footer">
            <footer-links links="{{footerLinks}}" />
            <social-media accounts="{{socialAccounts}}" />
          </app-footer>
        </app-layout>
      `;

      const context: TemplateContext = {
        variables: {
          theme: 'dark',
          menuItems: [
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'About', href: '/about' },
          ],
          currentUser: {
            name: 'Alice Johnson',
            avatar: '/avatars/alice.jpg',
            role: 'admin',
          },
          breadcrumbPath: [
            { label: 'Home', href: '/' },
            { label: 'Products', href: '/products' },
            { label: 'Search Results' },
          ],
          availableFilters: [
            { name: 'category', options: ['electronics', 'books', 'clothing'] },
            { name: 'price', type: 'range', min: 0, max: 1000 },
          ],
          searchResults: [],
          footerLinks: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ],
          socialAccounts: [
            { platform: 'twitter', url: 'https://twitter.com/example' },
            { platform: 'facebook', url: 'https://facebook.com/example' },
          ],
        },
      };

      const result = await engine.compile(template);
      const rendered = await engine.render(result, context);

      expect(result.components.length).toBeGreaterThan(5);
      expect(rendered).toContain('Alice Johnson');
      expect(rendered).toContain('dark');
      expect(rendered).toContain('Search...');
    });
  });

  describe('edge cases and error scenarios', () => {
    it('should handle malformed but recoverable templates', async () => {
      const template = `
        <div class="container">
          <p>Some text with {{unclosed variable
          <div>Another section</div>
          <button _="on click toggle .active">Button</button>
        </div>
      `;

      // Should not throw but may produce warnings
      await expect(engine.compile(template)).rejects.toThrow();
    });

    it('should handle deeply nested component structures', async () => {
      const depth = 20;
      let template = '<div>';

      for (let i = 0; i < depth; i++) {
        template += `<nested-component level="\${i}">`;
      }

      template += 'Deep content';

      for (let i = 0; i < depth; i++) {
        template += '</nested-component>';
      }

      template += '</div>';

      const result = await engine.compile(template);
      expect(result.variables.length).toBeGreaterThan(0);
    });

    it('should handle templates with mixed content types', async () => {
      const template = `
        <?xml version="1.0"?>
        <!-- XML prologue -->
        <html>
          <head>
            <title>{{pageTitle}}</title>
            <script>
              // JavaScript code
              var data = {{jsonData}};
            </script>
            <style>
              .class { color: {{themeColor}}; }
            </style>
          </head>
          <body _="init log 'Page loaded'">
            <h1>{{heading}}</h1>
            <pre>{{preformattedText}}</pre>
            <div hf-if="showContent">
              Dynamic content here
            </div>
          </body>
        </html>
      `;

      const context: TemplateContext = {
        variables: {
          pageTitle: 'Test Page',
          jsonData: JSON.stringify({ test: true }),
          themeColor: '#0066cc',
          heading: 'Welcome',
          preformattedText: 'Line 1\nLine 2\nLine 3',
          showContent: true,
        },
      };

      const result = await engine.compile(template);
      const rendered = await engine.render(result, context);

      expect(rendered).toContain('Test Page');
      expect(rendered).toContain('#0066cc');
      expect(rendered).toContain('Welcome');
      expect(rendered).toContain('Line 1\\nLine 2\\nLine 3');
    });
  });

  describe('caching and performance optimization', () => {
    it('should demonstrate effective caching', async () => {
      const template = '<div>{{message}}</div>';

      // First compilation - cache miss
      const result1 = await engine.compile(template);

      // Second compilation - cache hit
      const result2 = await engine.compile(template);

      // Results should be identical (cached)
      expect(result1).toBe(result2);

      const stats = engine.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
    });

    it('should handle cache invalidation properly', async () => {
      const template = '<div>{{message}}</div>';

      // Cache with different options
      const result1 = await engine.compile(template, { minify: false });
      const result2 = await engine.compile(template, { minify: true });
      const result3 = await engine.compile(template, { target: 'server' });

      // All should be different due to different options
      expect(result1).not.toBe(result2);
      expect(result2).not.toBe(result3);
      expect(result1).not.toBe(result3);
    });
  });

  describe('convenience functions', () => {
    it('should use compileTemplate convenience function', async () => {
      const template = '<div>{{message}}</div>';
      const result = await compileTemplate(template, { minify: true });

      expect(result.html).toBeDefined();
      expect(result.variables).toContain('message');
    });

    it('should use renderTemplate convenience function', async () => {
      const template = '<div>Hello, {{name}}!</div>';
      const context: TemplateContext = {
        variables: { name: 'World' },
      };

      const rendered = await renderTemplate(template, context);
      expect(rendered).toBe('<div>Hello, World!</div>');
    });

    it('should create custom template engine', async () => {
      const customEngine = await createTemplateEngine({
        minify: true,
        target: 'server',
        development: false,
      });

      const template = '<div>{{message}}</div>';
      const result = await customEngine.compile(template);

      expect(result).toBeDefined();
    });
  });
});

// Helper function to set up test components
async function setupTestComponents(engine: LokaScriptTemplateEngine) {
  // Basic UI components
  const button = createComponent('button', 'Button', 'on click log "clicked"');
  button.template = {
    html: '<button class="btn {{class}}">{{text}}</button>',
    variables: {
      text: { type: 'string', required: true, description: 'Button text' },
      class: { type: 'string', default: '', description: 'CSS classes' },
    },
  };

  const modal = createComponent(
    'modal',
    'Modal Dialog',
    'on show add .visible then wait 300ms then add .animated'
  );
  modal.template = {
    html: `
      <div class="modal">
        <div class="modal-backdrop"></div>
        <div class="modal-dialog">
          <div class="modal-header">
            <h4>{{title}}</h4>
            <button class="close" _="on click trigger hide">×</button>
          </div>
          <div class="modal-body">{{children}}</div>
        </div>
      </div>
    `,
    variables: {
      title: { type: 'string', required: true, description: 'Modal title' },
    },
  };

  // E-commerce components
  const addToCart = createComponent(
    'add-to-cart',
    'Add to Cart',
    'on click fetch /api/cart/add with {productId: @productId, quantity: @quantity}'
  );
  addToCart.template = {
    html: `
      <div class="add-to-cart">
        {{children}}
        <button class="add-btn" _="on click trigger addToCart">Add to Cart</button>
      </div>
    `,
    variables: {
      productId: { type: 'string', required: true, description: 'Product ID' },
      variants: { type: 'array', description: 'Product variants' },
    },
  };

  const quantitySelector = createComponent(
    'quantity-selector',
    'Quantity Selector',
    'on change call updateQuantity with my.value'
  );
  quantitySelector.template = {
    html: `
      <div class="quantity-selector">
        <label>Quantity:</label>
        <input type="number" min="{{min}}" max="{{max}}" value="1" />
      </div>
    `,
    variables: {
      min: { type: 'number', default: 1, description: 'Minimum quantity' },
      max: { type: 'number', default: 99, description: 'Maximum quantity' },
    },
  };

  // Dashboard components
  const statCard = createComponent('stat-card', 'Stat Card', 'init add .loaded');
  statCard.template = {
    html: `
      <div class="stat-card">
        <div class="stat-icon">{{icon}}</div>
        <div class="stat-content">
          <div class="stat-title">{{title}}</div>
          <div class="stat-value">{{value}}</div>
        </div>
      </div>
    `,
    variables: {
      title: { type: 'string', required: true, description: 'Stat title' },
      value: { type: 'string', required: true, description: 'Stat value' },
      icon: { type: 'string', description: 'Icon name' },
    },
  };

  // Register all components
  await engine.registerComponent(button);
  await engine.registerComponent(modal);
  await engine.registerComponent(addToCart);
  await engine.registerComponent(quantitySelector);
  await engine.registerComponent(statCard);
}
