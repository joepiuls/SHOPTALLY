import { apiRequest } from './query-client';
import type { Product, Sale } from './types';

export async function fetchAIInsights(
  sales: Sale[],
  products: Product[],
  period: 'week' | 'month',
): Promise<string> {
  const res = await apiRequest('POST', '/api/ai/insights', { sales, products, period });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.insights as string;
}

export async function generateProductDescription(
  name: string,
  category: string,
  price: number,
  location?: string,
): Promise<{ title: string; description: string }> {
  const res = await apiRequest('POST', '/api/ai/product-description', { name, category, price, location });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data as { title: string; description: string };
}

export async function fetchStockAdvice(
  products: Product[],
  sales: Sale[],
): Promise<string> {
  const res = await apiRequest('POST', '/api/ai/stock-advisor', { products, sales });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.advice as string;
}

export async function chatWithAssistant(
  message: string,
  context: { products: Product[]; sales: Sale[]; shopName: string },
): Promise<string> {
  const res = await apiRequest('POST', '/api/ai/chat', { message, context });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.reply as string;
}
