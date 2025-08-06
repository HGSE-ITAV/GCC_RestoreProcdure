#!/bin/bash

# Project initialization script
set -e

PROJECT_NAME=${1:-"new-project"}
echo "Initializing project: $PROJECT_NAME"

# Create project directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Create basic project structure
mkdir -p src
mkdir -p public
mkdir -p docs

# Create basic files
cat > README.md << 'EOF'
# Project

## Getting Started

1. Install dependencies
2. Run the development server
3. Open your browser

## Development

- `src/` - Source code
- `public/` - Static assets
- `docs/` - Documentation

EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.env
.DS_Store
EOF

cat > package.json << 'EOF'
{
  "name": "project",
  "version": "1.0.0",
  "description": "",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
EOF

cat > src/index.js << 'EOF'
console.log('Hello, World!');
EOF

echo "Project '$PROJECT_NAME' initialized successfully!"
echo "To get started:"
echo "  cd $PROJECT_NAME"
echo "  npm install"
echo "  npm start"