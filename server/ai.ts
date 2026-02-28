import Anthropic from '@anthropic-ai/sdk';
import type { Request, Response } from 'express';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Helper ──────────────────────────────────────────────────────────────────

function getTopProducts(sales: any[]): { name: string; qty: number; revenue: number }[] {
  const map: Record<string, { name: string; qty: number; revenue: number }> = {};
  sales.forEach(s => {
    s.items?.forEach((item: any) => {
      if (!map[item.productId]) map[item.productId] = { name: item.productName, qty: 0, revenue: 0 };
      map[item.productId].qty += item.quantity;
      map[item.productId].revenue += item.subtotal;
    });
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}

// ─── POST /api/ai/insights ───────────────────────────────────────────────────

export async function getInsights(req: Request, res: Response) {
  try {
    const { sales = [], products = [], period = 'week' } = req.body;

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + s.total, 0);
    const totalSales = sales.length;
    const avgSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    const creditSales = sales.filter((s: any) => s.isCredit).length;

    const paymentTotals = { cash: 0, transfer: 0, split: 0 };
    sales.forEach((s: any) => {
      if (!s.isCredit) {
        const pm = s.paymentMethod as keyof typeof paymentTotals;
        if (pm in paymentTotals) paymentTotals[pm] += s.total;
      }
    });

    const topProducts = getTopProducts(sales).slice(0, 5);
    const lowStockProducts = products.filter((p: any) => p.stock <= p.lowStockThreshold);

    const prompt = `You are a business advisor for a small Nigerian shop. Analyze this ${period === 'week' ? '7-day' : '30-day'} sales data and provide 4 concise, actionable insights.

SALES SUMMARY:
- Total Revenue: ₦${totalRevenue.toLocaleString()}
- Transactions: ${totalSales}
- Average Sale: ₦${Math.round(avgSale).toLocaleString()}
- Credit Sales: ${creditSales} (${totalSales > 0 ? Math.round((creditSales / totalSales) * 100) : 0}% of transactions)
- Payment Mix: Cash ₦${paymentTotals.cash.toLocaleString()}, Transfer ₦${paymentTotals.transfer.toLocaleString()}, Split ₦${paymentTotals.split.toLocaleString()}

TOP PRODUCTS:
${topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.qty} sold, ₦${p.revenue.toLocaleString()}`).join('\n') || 'No sales data'}

LOW STOCK (${lowStockProducts.length} products):
${lowStockProducts.slice(0, 5).map((p: any) => `- ${p.name}: ${p.stock} left`).join('\n') || 'None'}

Format as 4 numbered insights. Be specific with numbers. Focus on actionable advice. Keep each insight to 1-2 sentences. Use Nigerian business context.`;

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();
    const text = message.content.find(b => b.type === 'text')?.text ?? '';
    res.json({ insights: text });
  } catch (err: any) {
    console.error('AI insights error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to generate insights' });
  }
}

// ─── POST /api/ai/product-description ───────────────────────────────────────

export async function generateProductDescription(req: Request, res: Response) {
  try {
    const { name, category, price, location } = req.body;

    if (!name) return res.status(400).json({ error: 'Product name is required' });

    const prompt = `Generate a marketplace listing for a Nigerian shop product. Respond with JSON only.

Product: ${name}
Category: ${category || 'General'}
Price: ₦${Number(price).toLocaleString() || 'N/A'}
Location: ${location || 'Nigeria'}

Respond with this JSON (no markdown, no extra text):
{"title": "<catchy title under 60 chars>", "description": "<2-3 sentence compelling description highlighting quality and value>"}`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid response format');
    const result = JSON.parse(match[0]);
    res.json(result);
  } catch (err: any) {
    console.error('AI description error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to generate description' });
  }
}

// ─── POST /api/ai/stock-advisor ──────────────────────────────────────────────

export async function getStockAdvice(req: Request, res: Response) {
  try {
    const { products = [], sales = [] } = req.body;

    const productSales: Record<string, { name: string; qty: number }> = {};
    sales.forEach((s: any) => {
      s.items?.forEach((item: any) => {
        if (!productSales[item.productId]) productSales[item.productId] = { name: item.productName, qty: 0 };
        productSales[item.productId].qty += item.quantity;
      });
    });

    const lowStockProducts = products.filter((p: any) => p.stock <= p.lowStockThreshold * 2);

    if (lowStockProducts.length === 0) {
      return res.json({ advice: 'Your stock levels look healthy! All products are well above their low stock thresholds. Keep monitoring daily sales to stay ahead of demand.' });
    }

    const productDetails = lowStockProducts.map((p: any) => {
      const salesData = productSales[p.id];
      const dailyRate = salesData ? (salesData.qty / 30).toFixed(1) : '0';
      const daysLeft = salesData && parseFloat(dailyRate) > 0
        ? Math.round(p.stock / parseFloat(dailyRate))
        : null;
      return `- ${p.name}: ${p.stock} units in stock, ~${dailyRate} sold/day${daysLeft !== null ? `, ~${daysLeft} days remaining` : ''}`;
    }).join('\n');

    const prompt = `You are a stock management advisor for a Nigerian small business. Give specific restocking recommendations.

Products needing attention:
${productDetails}

For each product:
1. Recommend exact reorder quantity
2. Set urgency (reorder now / within 3 days / within a week)

Keep it brief and actionable. Format as numbered recommendations.`;

    const stream = anthropic.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 800,
      thinking: { type: 'adaptive' },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();
    const text = message.content.find(b => b.type === 'text')?.text ?? '';
    res.json({ advice: text });
  } catch (err: any) {
    console.error('AI stock advisor error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to generate advice' });
  }
}

// ─── POST /api/ai/chat ───────────────────────────────────────────────────────

export async function chatWithAssistant(req: Request, res: Response) {
  try {
    const { message, context } = req.body;
    const { products = [], sales = [], shopName = 'this shop' } = context ?? {};

    if (!message) return res.status(400).json({ error: 'Message is required' });

    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter((s: any) => s.createdAt?.startsWith(today));
    const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + s.total, 0);
    const recentSales = sales.slice(0, 100);
    const totalRevenue = recentSales.reduce((sum: number, s: any) => sum + s.total, 0);
    const lowStockProducts = products.filter((p: any) => p.stock <= p.lowStockThreshold);
    const topProducts = getTopProducts(recentSales).slice(0, 5);

    const systemPrompt = `You are a helpful business assistant for ${shopName}. You help the shop owner understand their sales data and run their business better.

SHOP DATA SUMMARY:
- Products: ${products.length} total, ${lowStockProducts.length} low on stock
- Today: ${todaySales.length} sales, ₦${todayRevenue.toLocaleString()} revenue
- Recent ${recentSales.length} sales: ₦${totalRevenue.toLocaleString()} total

LOW STOCK:
${lowStockProducts.slice(0, 8).map((p: any) => `- ${p.name}: ${p.stock} left (threshold: ${p.lowStockThreshold})`).join('\n') || 'None'}

TOP PRODUCTS (recent):
${topProducts.map((p, i) => `${i + 1}. ${p.name}: ${p.qty} sold, ₦${p.revenue.toLocaleString()}`).join('\n') || 'No data'}

Be concise and friendly. Use ₦ for currency. Answer in 2-4 sentences max unless a list is needed.`;

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    });

    const reply = response.content.find(b => b.type === 'text')?.text ?? '';
    res.json({ reply });
  } catch (err: any) {
    console.error('AI chat error:', err);
    res.status(500).json({ error: err.message ?? 'Failed to process message' });
  }
}
