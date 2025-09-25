# Development Utilities

This directory contains development tools and utilities for building new features in the serverless architecture.

## Directory Structure

```
dev-utils/
├── README.md           # This file
├── endpoint-template.js # Template for creating new endpoints
├── middleware/         # Development middleware
├── validators/         # Data validation helpers
└── test-helpers/       # Testing utilities
```

## Creating New Features

### 1. Adding New Endpoints

Use the endpoint template to create new API endpoints:

```javascript
// Copy endpoint-template.js and modify for your new endpoint
const newEndpoint = require('./dev-utils/endpoint-template');

// Add to server-vercel.js:
app.get('/api/your-new-endpoint', newEndpoint);
```

### 2. Development Workflow

1. **Create endpoint logic** in `dev-utils/`
2. **Test with utilities** in `test-helpers/`
3. **Validate data** using `validators/`
4. **Add to server-vercel.js** when ready
5. **Update tests** in `tests/`

### 3. Best Practices

- Keep endpoints stateless for serverless compatibility
- Use native MongoDB client (not Mongoose)
- Handle errors gracefully
- Include proper validation
- Write tests before implementation

## Integration

All development utilities can be imported and integrated into the main server-vercel.js file when features are ready for production.
