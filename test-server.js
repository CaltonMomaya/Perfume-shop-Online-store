const http = require('http');

const server = http.createServer((req, res) => {
    console.log('Request received:', req.url);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
        message: 'Server is working!', 
        timestamp: new Date().toISOString() 
    }));
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log('✅ Simple HTTP server running on port', PORT);
    console.log('🌐 Test with: curl http://localhost:5000');
});

// Handle errors
server.on('error', (error) => {
    console.log('❌ Server error:', error.message);
});
