import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { getInsights, generateProductDescription, getStockAdvice, chatWithAssistant } from "./ai";

export async function registerRoutes(app: Express): Promise<Server> {
  // AI routes
  app.post("/api/ai/insights", getInsights);
  app.post("/api/ai/product-description", generateProductDescription);
  app.post("/api/ai/stock-advisor", getStockAdvice);
  app.post("/api/ai/chat", chatWithAssistant);

  const httpServer = createServer(app);

  return httpServer;
}
