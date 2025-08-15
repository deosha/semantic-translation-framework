# MCP-A2A Translation Layer Demo

## Overview

This interactive web demo showcases the bidirectional MCP ↔ A2A protocol translation layer implementation from the research paper "Bridging AI Agent Ecosystems" by Deo Shankar.

## Features

### Interactive Translation
- **Live MCP → A2A Translation**: Input MCP tool calls and see them translated to A2A tasks
- **Live A2A → MCP Translation**: Input A2A responses and see them translated to MCP responses
- **Visual Pipeline**: Animated visualization of the translation process
- **Real-time Metrics**: See latency, confidence scores, and cache performance

### Performance Monitoring
- Live statistics tracking
- Cache hit/miss visualization
- Latency measurements
- Confidence scoring
- Throughput estimates

### Customizable Demo
- Toggle animations on/off
- Enable/disable caching
- Show/hide metrics
- Load example messages

## Quick Start

### Option 1: Static HTML Demo (No Server Required)

Simply open the `index.html` file in your browser:

```bash
# From the project root
open demo/index.html

# Or on Windows
start demo/index.html
```

This provides a fully functional demo with simulated translation (no backend required).

### Option 2: Full Server Demo (With Real Translation)

1. **Build the TypeScript project first:**
```bash
npm run build
```

2. **Install demo dependencies:**
```bash
cd demo
npm install express cors
```

3. **Start the demo server:**
```bash
node server.js
```

4. **Open in browser:**
```
http://localhost:3000
```

This provides real translation using the actual implementation.

## Demo Controls

### Translation Examples

The demo includes pre-loaded examples for both protocols:

**MCP Examples:**
- Code review requests
- Data analysis operations
- File search queries

**A2A Examples:**
- Completed task responses
- Running task updates
- Failed task errors

### Settings

- **Show Animations**: Enable/disable visual flow animation
- **Use Cache**: Toggle caching to see performance differences
- **Show Metrics**: Display/hide real-time performance metrics

## API Endpoints (Server Mode)

When running with the server, the following API endpoints are available:

### POST /api/translate/mcp-to-a2a
Translate an MCP request to A2A task format.

**Request:**
```json
{
  "request": {
    "jsonrpc": "2.0",
    "id": "123",
    "method": "tools/call",
    "params": {
      "name": "analyze",
      "arguments": {}
    }
  },
  "sessionId": "demo-session"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* A2A Task */ },
  "confidence": { /* Confidence metrics */ },
  "metrics": { /* Performance metrics */ }
}
```

### POST /api/translate/a2a-to-mcp
Translate an A2A response to MCP format.

### GET /api/metrics
Get current system performance metrics.

### GET /api/health
Health check endpoint.

## Use Cases

### 1. Conference Presentations
- Live demonstration of protocol translation
- Visual explanation of the translation pipeline
- Real-time performance metrics

### 2. Paper Reviews
- Interactive exploration of the implementation
- Verification of performance claims
- Understanding of the architecture

### 3. Development Testing
- Test custom protocol messages
- Verify translation accuracy
- Monitor performance characteristics

### 4. Educational Purpose
- Learn about protocol translation
- Understand semantic mapping
- Explore caching strategies

## Customization

### Modify Examples

Edit the `loadMCPExample()` and `loadA2AExample()` functions in `index.html` to add your own test cases.

### Adjust Performance Metrics

Modify the simulated metrics in the JavaScript to match your hardware:

```javascript
// In index.html
const latency = (endTime - startTime).toFixed(2);
const confidence = fromCache ? 98 : 94 + Math.random() * 4;
```

### Style Customization

The demo uses inline CSS for easy customization. Modify the `<style>` section to match your branding.

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design supported

## Troubleshooting

### Server won't start
- Ensure you've built the TypeScript project: `npm run build`
- Check if port 3000 is available
- Verify Node.js version (v18+ recommended)

### Translation fails
- Verify JSON syntax in input fields
- Check browser console for errors
- Ensure server is running (for API mode)

### Performance issues
- Disable animations for better performance
- Clear browser cache
- Use Chrome/Edge for best performance

## Screenshots

The demo includes:
1. Side-by-side protocol input/output panels
2. Animated translation pipeline visualization
3. Real-time performance metrics
4. Live statistics dashboard

## Support

For issues or questions about the demo:
- Check the main project README
- Review the research paper
- Open an issue on GitHub

---

*Demo implementation for "Bridging AI Agent Ecosystems" by Deo Shankar, Tiger Analytics*