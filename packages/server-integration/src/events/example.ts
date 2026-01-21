/**
 * Example: Server-Side Hyperscript with Request Event Source
 *
 * This example demonstrates how to use the request event source
 * to handle HTTP requests with hyperscript syntax.
 */

import express from 'express';
import { setupHyperscriptRoutes } from '../middleware/hyperscript-routes.js';

// Example 1: Simple setup
async function example1() {
  const app = express();
  app.use(express.json());

  // Setup hyperscript routes (this registers the event source and context providers)
  await setupHyperscriptRoutes(app, { debug: true });

  // Now you can write hyperscript handlers
  // Note: In a real app, you'd compile these from files or a database

  // Example hyperscript code (would be compiled in production):
  /*
  on request(GET, /api/users)
    set users to [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" }
    ]
    respond with <json> users </json>
  end

  on request(GET, /api/users/:id)
    set userId to params.id
    set user to { id: userId, name: "User " + userId }
    respond with <json> user </json>
  end

  on request(POST, /api/users)
    set newUser to request.body
    log "Creating user: " newUser.name
    respond with <json> newUser </json> status 201
  end
  */

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// Example 2: Manual setup with custom configuration
async function example2() {
  const app = express();
  app.use(express.json());

  // Import registry and hyperscript compiler
  const { getDefaultRegistry } = await import('@lokascript/core/registry');
  const { hyperscript } = await import('@lokascript/core');

  // Setup hyperscript routes
  const { middleware } = await setupHyperscriptRoutes(app, {
    registry: getDefaultRegistry(),
    debug: true,
    alwaysCallNext: false, // Don't continue to Express routes if hyperscript handled it
    onError: (error, req, res) => {
      console.error('Hyperscript route error:', error);
      res.status(500).json({ error: 'Internal server error' });
    },
  });

  // Compile and register a hyperscript route handler
  // In production, you'd load these from files or a database
  const getUsersScript = `
    on request(GET, /api/users)
      set users to [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" }
      ]
      call response.json(users)
    end
  `;

  // Compile the script (this registers the event handler)
  await hyperscript.compile(getUsersScript);

  // You can also use traditional Express routes alongside hyperscript
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Fallback route (only reached if hyperscript didn't handle it)
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// Example 3: RESTful API with hyperscript
async function example3() {
  const app = express();
  app.use(express.json());

  const { hyperscript } = await import('@lokascript/core');
  await setupHyperscriptRoutes(app, { debug: true });

  // Simple in-memory database
  const db = {
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ],
    nextId: 3,
  };

  // Make db available in context
  const { context } = await import('@lokascript/core/registry');
  context.register('db', () => db);

  // Hyperscript CRUD routes
  const apiScript = `
    -- List all users
    on request(GET, /api/users)
      call response.json(db.users)
    end

    -- Get single user
    on request(GET, /api/users/:id)
      set userId to Number(params.id)
      set user to db.users.find(u => u.id === userId)

      if user exists
        call response.json(user)
      else
        call response.status(404).json({ error: "User not found" })
      end
    end

    -- Create user
    on request(POST, /api/users)
      set newUser to request.body
      set newUser.id to db.nextId
      increment db.nextId

      call db.users.push(newUser)
      call response.status(201).json(newUser)
    end

    -- Update user
    on request(PUT, /api/users/:id)
      set userId to Number(params.id)
      set userIndex to db.users.findIndex(u => u.id === userId)

      if userIndex >= 0
        set db.users[userIndex] to request.body
        set db.users[userIndex].id to userId
        call response.json(db.users[userIndex])
      else
        call response.status(404).json({ error: "User not found" })
      end
    end

    -- Delete user
    on request(DELETE, /api/users/:id)
      set userId to Number(params.id)
      set userIndex to db.users.findIndex(u => u.id === userId)

      if userIndex >= 0
        call db.users.splice(userIndex, 1)
        call response.status(204).send()
      else
        call response.status(404).json({ error: "User not found" })
      end
    end
  `;

  await hyperscript.compile(apiScript);

  app.listen(3000, () => {
    console.log('RESTful API running on http://localhost:3000');
    console.log('Try: curl http://localhost:3000/api/users');
  });
}

// Example 4: Dynamic route registration
async function example4() {
  const app = express();
  app.use(express.json());

  const { hyperscript } = await import('@lokascript/core');
  await setupHyperscriptRoutes(app, { debug: true });

  // Load routes from configuration
  const routes = [
    {
      method: 'GET',
      path: '/api/hello',
      script: `on request(GET, /api/hello) call response.json({ message: "Hello!" }) end`,
    },
    {
      method: 'GET',
      path: '/api/time',
      script: `on request(GET, /api/time) call response.json({ time: Date.now() }) end`,
    },
    {
      method: 'POST',
      path: '/api/echo',
      script: `on request(POST, /api/echo) call response.json(request.body) end`,
    },
  ];

  // Compile and register all routes
  for (const route of routes) {
    await hyperscript.compile(route.script);
    console.log(`Registered ${route.method} ${route.path}`);
  }

  app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
  });
}

// Run examples (uncomment the one you want to try)
if (import.meta.url === `file://${process.argv[1]}`) {
  // example1();
  // example2();
  // example3();
  // example4();
  console.log('Uncomment an example function to run it');
}
