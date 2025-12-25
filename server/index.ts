import express from "express";
import session from "express-session";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./routes.js";
import { setupWebSocket } from "./websocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploads directory with proper CORS
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('[Server] Serving uploads from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    console.log('[Server] Serving file:', filePath);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

app.use(session({
  secret: process.env.SESSION_SECRET || "mc-multiplayer-secret-key-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

app.use("/api", routes);

// Find available port for WebSocket
const findAvailablePort = async (startPort: number): Promise<number> => {
  return new Promise((resolve) => {
    const testServer = createServer();
    testServer.listen(startPort, '0.0.0.0', () => {
      const port = (testServer.address() as any).port;
      testServer.close(() => resolve(port));
    });
    testServer.on('error', () => {
      resolve(findAvailablePort(startPort + 1) as any);
    });
  });
};

const PORT = parseInt(process.env.PORT || '3001');

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../public")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
  });
}

// Start server with port checking
(async () => {
  const availablePort = await findAvailablePort(PORT);

  server.listen(availablePort, '0.0.0.0', () => {
    console.log(`[Server] HTTP server running on port ${availablePort}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'production'}`);

    // Initialize WebSocket after server is listening
    setupWebSocket(server);
    console.log(`[Server] WebSocket server ready`);
    console.log(`[MCPE] P2P relay service initialized`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${availablePort} is in use, trying next port...`);
      server.close();
      process.exit(1);
    } else {
      console.error('[Server] Server error:', err);
    }
  });
})();