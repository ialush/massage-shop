const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('WebSocket server is running');
});

const wss = new WebSocketServer({ server });

// Store the current state
let currentState = {
  therapists: [],
  sessions: []
};

// Track connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  // Add new client to set
  clients.add(ws);
  
  // Send current state to new client
  ws.send(JSON.stringify({
    type: 'STATE_UPDATE',
    ...currentState
  }));
  
  // Broadcast updated user count
  broadcastUserCount();

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'STATE_UPDATE') {
        // Update current state
        currentState = {
          therapists: data.therapists,
          sessions: data.sessions
        };
        
        // Broadcast to all other clients
        broadcast(ws, {
          type: 'STATE_UPDATE',
          ...currentState
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcastUserCount();
  });
});

function broadcast(sender, data) {
  clients.forEach(client => {
    if (client !== sender && client.readyState === WebSocketServer.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

function broadcastUserCount() {
  const data = {
    type: 'USERS_COUNT',
    count: clients.size
  };
  
  clients.forEach(client => {
    if (client.readyState === WebSocketServer.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
