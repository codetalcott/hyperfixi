/**
 * Development Server
 * Live development server with hot reload for HyperFixi projects
 */

import express from 'express';
import * as path from 'path';
import * as fs from 'fs-extra';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as chokidar from 'chokidar';
import open from 'open';

/**
 * Development server configuration
 */
export interface DevServerConfig {
  port: number;
  host: string;
  https: boolean;
  proxy: Record<string, string>;
  static: string[];
  livereload: boolean;
  hot: boolean;
  cors: boolean;
  compression: boolean;
  open: boolean;
}

/**
 * Default development server configuration
 */
const DEFAULT_CONFIG: DevServerConfig = {
  port: 3000,
  host: 'localhost',
  https: false,
  proxy: {},
  static: ['.'],
  livereload: true,
  hot: true,
  cors: true,
  compression: true,
  open: true,
};

/**
 * Development Server
 */
export class DevServer {
  private app: express.Application;
  private server: any;
  private wss?: WebSocketServer;
  private config: DevServerConfig;
  private watcher?: chokidar.FSWatcher;
  private clients: Set<WebSocket> = new Set();

  constructor(config: Partial<DevServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.app = express();
    this.server = createServer(this.app);

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // CORS
    if (this.config.cors) {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
        res.header(
          'Access-Control-Allow-Headers',
          'Content-Type, Authorization, Content-Length, X-Requested-With'
        );

        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Compression (optional dependency)
    if (this.config.compression) {
      try {
        const compression = require('compression');
        this.app.use(compression());
      } catch {
        // compression module not available, skip
      }
    }

    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Proxy middleware (optional dependency)
    if (Object.keys(this.config.proxy).length > 0) {
      try {
        const { createProxyMiddleware } = require('http-proxy-middleware');
        for (const [proxyPath, target] of Object.entries(this.config.proxy)) {
          this.app.use(
            proxyPath,
            createProxyMiddleware({
              target,
              changeOrigin: true,
              logLevel: 'warn',
            })
          );
        }
      } catch {
        // http-proxy-middleware not available, skip proxy setup
      }
    }

    // Static file serving
    for (const staticPath of this.config.static) {
      const resolvedPath = path.resolve(staticPath);
      this.app.use(express.static(resolvedPath));
    }
  }

  /**
   * Setup routes
   */
  private setupRoutes(): void {
    // API routes
    this.app.get('/api/status', (req, res) => {
      res.json({
        status: 'running',
        config: this.config,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      });
    });

    // Hot reload client script
    this.app.get('/__hyperfixi__/client.js', (req, res) => {
      res.setHeader('Content-Type', 'application/javascript');
      res.send(this.getClientScript());
    });

    // File serving with live reload injection
    this.app.get('*.html', (req, res, next) => {
      const filePath = path.join(process.cwd(), req.path);

      fs.readFile(filePath, 'utf-8')
        .then(content => {
          if (this.config.livereload) {
            content = this.injectLiveReloadScript(content);
          }
          res.setHeader('Content-Type', 'text/html');
          res.send(content);
        })
        .catch(() => next());
    });

    // Default route - serve index.html if it exists
    this.app.get('/', async (req, res, next) => {
      const indexPath = path.join(process.cwd(), 'index.html');

      if (await fs.pathExists(indexPath)) {
        let content = await fs.readFile(indexPath, 'utf-8');

        if (this.config.livereload) {
          content = this.injectLiveReloadScript(content);
        }

        res.setHeader('Content-Type', 'text/html');
        res.send(content);
      } else {
        res.send(this.getWelcomePage());
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Not Found</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    text-align: center;
                    padding: 2rem;
                    color: #666;
                }
                .error { color: #dc3545; font-size: 2rem; margin-bottom: 1rem; }
                .message { font-size: 1.2rem; margin-bottom: 2rem; }
                .back { color: #007acc; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="error">404</div>
            <div class="message">File not found: ${req.path}</div>
            <a href="/" class="back">← Back to home</a>
        </body>
        </html>
      `);
    });
  }

  /**
   * Setup WebSocket for live reload
   */
  private setupWebSocket(): void {
    if (!this.config.livereload) return;

    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', ws => {
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial connection message
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'HyperFixi dev server connected',
        })
      );
    });
  }

  /**
   * Setup file watching
   */
  private setupFileWatcher(): void {
    if (!this.config.livereload) return;

    const watchPaths = ['**/*.html', '**/*.css', '**/*.js', '**/*.ts', '**/*.json'];

    this.watcher = chokidar.watch(watchPaths, {
      ignored: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/.*'],
      ignoreInitial: true,
      persistent: true,
    });

    this.watcher.on('change', filePath => {
      console.log(`📁 Changed: ${filePath}`);
      this.broadcastReload(filePath, 'change');
    });

    this.watcher.on('add', filePath => {
      console.log(`➕ Added: ${filePath}`);
      this.broadcastReload(filePath, 'add');
    });

    this.watcher.on('unlink', filePath => {
      console.log(`🗑️  Removed: ${filePath}`);
      this.broadcastReload(filePath, 'remove');
    });
  }

  /**
   * Broadcast reload message to all clients
   */
  private broadcastReload(filePath: string, type: string): void {
    const message = JSON.stringify({
      type: 'reload',
      file: filePath,
      action: type,
      timestamp: Date.now(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /**
   * Inject live reload script into HTML
   */
  private injectLiveReloadScript(html: string): string {
    const script = `
      <script src="/__hyperfixi__/client.js"></script>
    `;

    // Try to inject before closing body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', `${script}\n</body>`);
    }

    // Try to inject before closing html tag
    if (html.includes('</html>')) {
      return html.replace('</html>', `${script}\n</html>`);
    }

    // Append to end if no suitable location found
    return html + script;
  }

  /**
   * Get client-side live reload script
   */
  private getClientScript(): string {
    return `
(function() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(protocol + '//' + location.host);
  
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectInterval = 2000;
  
  function connect() {
    ws.onopen = function() {
      console.log('🔧 HyperFixi dev server connected');
      reconnectAttempts = 0;
      
      // Show connection indicator
      showStatus('Connected', 'success');
    };
    
    ws.onmessage = function(event) {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'reload':
          console.log('🔄 Reloading due to file change:', message.file);
          
          // Different reload strategies based on file type
          const ext = message.file.split('.').pop().toLowerCase();
          
          if (ext === 'css') {
            reloadCSS();
          } else if (ext === 'html') {
            location.reload();
          } else {
            location.reload();
          }
          break;
          
        case 'connected':
          console.log('✅', message.message);
          break;
      }
    };
    
    ws.onclose = function() {
      console.log('❌ Dev server connection lost');
      showStatus('Disconnected', 'error');
      
      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(\`🔄 Attempting to reconnect (\${reconnectAttempts}/\${maxReconnectAttempts})...\`);
        setTimeout(connect, reconnectInterval);
      }
    };
    
    ws.onerror = function(error) {
      console.error('Dev server WebSocket error:', error);
    };
  }
  
  function reloadCSS() {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      const href = link.href;
      const url = new URL(href);
      url.searchParams.set('t', Date.now().toString());
      link.href = url.toString();
    });
    
    console.log('🎨 CSS reloaded');
  }
  
  function showStatus(message, type) {
    // Remove existing status
    const existing = document.getElementById('__hyperfixi-status__');
    if (existing) {
      existing.remove();
    }
    
    // Create status indicator
    const status = document.createElement('div');
    status.id = '__hyperfixi-status__';
    status.textContent = message;
    status.style.cssText = \`
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-family: monospace;
      z-index: 10000;
      color: white;
      background: \${type === 'success' ? '#28a745' : '#dc3545'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: opacity 0.3s ease;
    \`;
    
    document.body.appendChild(status);
    
    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        status.style.opacity = '0';
        setTimeout(() => status.remove(), 300);
      }, 2000);
    }
  }
  
  // Start connection
  connect();
})();
    `;
  }

  /**
   * Get welcome page HTML
   */
  private getWelcomePage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HyperFixi Development Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .container {
            text-align: center;
            max-width: 600px;
            padding: 2rem;
        }
        
        .logo {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        
        .title {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        
        .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
        }
        
        .feature {
            background: rgba(255, 255, 255, 0.1);
            padding: 1rem;
            border-radius: 8px;
            backdrop-filter: blur(10px);
        }
        
        .feature-icon {
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }
        
        .feature-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .feature-desc {
            font-size: 0.9rem;
            opacity: 0.9;
        }
        
        .getting-started {
            background: rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 12px;
            margin-top: 2rem;
            text-align: left;
            backdrop-filter: blur(10px);
        }
        
        .getting-started h3 {
            margin-bottom: 1rem;
            text-align: center;
        }
        
        .step {
            margin-bottom: 1rem;
        }
        
        .step-number {
            background: #007acc;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            margin-right: 0.5rem;
        }
        
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 0.2rem 0.4rem;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, monospace;
        }
        
        .status {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(40, 167, 69, 0.9);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="status">
        🟢 Dev Server Running
    </div>
    
    <div class="container">
        <div class="logo">🔧</div>
        <div class="title">HyperFixi Dev Server</div>
        <div class="subtitle">
            Your development server is running at 
            <strong>http://${this.config.host}:${this.config.port}</strong>
        </div>
        
        <div class="features">
            <div class="feature">
                <div class="feature-icon">⚡</div>
                <div class="feature-title">Live Reload</div>
                <div class="feature-desc">Automatic page refresh when files change</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🎨</div>
                <div class="feature-title">Hot CSS</div>
                <div class="feature-desc">CSS updates without page refresh</div>
            </div>
            <div class="feature">
                <div class="feature-icon">🌐</div>
                <div class="feature-description">CORS Enabled</div>
                <div class="feature-desc">Cross-origin requests supported</div>
            </div>
            <div class="feature">
                <div class="feature-icon">📱</div>
                <div class="feature-title">Mobile Ready</div>
                <div class="feature-desc">Responsive development environment</div>
            </div>
        </div>
        
        <div class="getting-started">
            <h3>🚀 Getting Started</h3>
            <div class="step">
                <span class="step-number">1</span>
                Create an <code>index.html</code> file in your project directory
            </div>
            <div class="step">
                <span class="step-number">2</span>
                Start adding HyperScript to your HTML with the <code>_</code> attribute
            </div>
            <div class="step">
                <span class="step-number">3</span>
                Save your files and watch them reload automatically
            </div>
            <div class="step">
                <span class="step-number">4</span>
                Use <code>hyperfixi build</code> when ready to deploy
            </div>
        </div>
    </div>
    
    ${this.config.livereload ? '<script src="/__hyperfixi__/client.js"></script>' : ''}
</body>
</html>`;
  }

  /**
   * Start the development server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        const url = `http://${this.config.host}:${this.config.port}`;
        console.log(`🚀 Dev server started at ${url}`);

        // Setup file watching after server starts
        this.setupFileWatcher();

        // Open browser if requested
        if (this.config.open) {
          open(url).catch(() => {
            // Ignore open errors
          });
        }

        resolve();
      });

      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${this.config.port} is already in use`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Stop the development server
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
    }

    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.wss.close();
    }

    return new Promise(resolve => {
      this.server.close(() => {
        console.log('🛑 Dev server stopped');
        resolve();
      });
    });
  }

  /**
   * Get the server address URL
   */
  getAddress(): string {
    const protocol = this.config.https ? 'https' : 'http';
    return `${protocol}://${this.config.host}:${this.config.port}`;
  }

  /**
   * Get the current configuration
   */
  getConfig(): DevServerConfig {
    return { ...this.config };
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server?.listening ?? false;
  }

  /**
   * Notify clients about file changes
   */
  notifyFileChange(filePath: string): void {
    const message = JSON.stringify({
      type: 'file-changed',
      path: filePath,
      timestamp: Date.now(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  /**
   * Broadcast a message to all WebSocket clients
   */
  broadcast(message: any): void {
    const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }

  /**
   * Restart the server
   */
  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }
}

/**
 * Start development server with configuration
 */
export async function startDevServer(config: Partial<DevServerConfig>): Promise<DevServer> {
  const server = new DevServer(config);
  await server.start();
  return server;
}
