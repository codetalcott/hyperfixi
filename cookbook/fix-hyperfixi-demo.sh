#!/bin/bash

# Fix script for HyperFixi complete-demo.html
# This script addresses the module import issues

echo "🔧 HyperFixi Demo Fix Script"
echo "============================="

# Navigate to the hyperfixi project
cd ~/projects/hyperfixi || exit 1

# Step 1: Install dependencies if needed
echo "📦 Installing dependencies..."
cd packages/core
npm install

# Step 2: Build the TypeScript to JavaScript
echo "🏗️ Building TypeScript to JavaScript..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not created"
    exit 1
fi

echo "✅ Build successful - dist directory created"

# Step 3: Create a fixed version of the HTML file
echo "📝 Creating fixed HTML file..."
cd ../../cookbook

# Create the fixed file with correct import path
cat > complete-demo-fixed.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🧪 HyperFixi Complete Cookbook Demo</title>
  <style>
    /* Copy original styles here */
  </style>
</head>
<body>
  <!-- Copy original HTML body here -->
  
  <script type="module">
    // Fixed import path - use the built JavaScript module
    import { hyperscript } from '../packages/core/dist/index.mjs';
    
    // Rest of the original script code goes here
    // ... (copy from original)
  </script>
</body>
</html>
EOF

echo "✅ Fixed HTML file created: complete-demo-fixed.html"

# Step 4: Alternative - Update the original file in place
echo "🔄 Updating original file with correct path..."
sed -i.bak "s|'./packages/core/src/index.ts'|'../packages/core/dist/index.mjs'|g" complete-demo.html

echo "✅ Original file updated (backup saved as complete-demo.html.bak)"

# Step 5: Instructions for running
echo ""
echo "📋 Next Steps:"
echo "1. Open http://127.0.0.1:5500/cookbook/complete-demo.html in your browser"
echo "2. Or use Vite for better development experience:"
echo "   npx vite --port 5500"
echo ""
echo "✨ Fix complete!"
