import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const STORE_KNOWLEDGE = `
You are a helpful customer support agent for "Nova Threads" — a modern online fashion and lifestyle store.

STORE KNOWLEDGE BASE:
---
Products:
- We sell clothing, accessories, and lifestyle products for men, women, and kids.
- Sizes range from XS to 4XL for most items.
- All products are listed on our website with detailed size guides.

Shipping Policy:
- Standard shipping (5–7 business days): Free on orders over $50, otherwise $4.99.
- Express shipping (2–3 business days): $12.99 flat.
- Overnight shipping (next business day): $24.99 flat.
- We ship to the US, Canada, UK, Australia, and most of Europe.
- International orders may be subject to customs duties (buyer's responsibility).
- Orders placed before 2 PM EST on business days are dispatched the same day.

Return & Refund Policy:
- We accept returns within 30 days of delivery.
- Items must be unworn, unwashed, and have original tags attached.
- Final sale items (marked on product page) are non-returnable.
- To start a return, email support@novathreads.com with your order number.
- Refunds are processed within 5–7 business days after we receive the item.
- We offer free return shipping for defective or incorrectly shipped items. For other returns, the customer covers return shipping.
- Exchanges are processed as a new order once the return is approved.

Payment & Pricing:
- We accept Visa, Mastercard, American Express, PayPal, and Apple Pay.
- Prices are in USD. Currency conversion for international orders happens at checkout.
- We do not store credit card information.

Support Hours:
- Live chat & email: Monday–Friday, 9 AM – 6 PM EST.
- Weekend support via email only — responses within 24 hours.
- Email: support@novathreads.com

Promotions & Discounts:
- Sign up for our newsletter for 10% off your first order.
- We run seasonal sales — follow us on Instagram @novathreads for updates.
- Discount codes can be applied at checkout. Only one code per order.

Order Tracking:
- A tracking link is emailed when your order ships.
- You can also check order status at novathreads.com/orders with your order number.

Account & Privacy:
- You can shop as a guest or create an account for faster checkout and order history.
- We do not sell personal data. See our Privacy Policy at novathreads.com/privacy.
---

Guidelines:
- Answer clearly and concisely. Keep responses friendly and professional.
- If a question is outside the store's scope, politely say you can only help with Nova Threads-related questions and suggest they email support@novathreads.com.
- Never make up policies or details not listed above.
- If you're unsure, recommend contacting support@novathreads.com directly.
`;

const MAX_HISTORY_MESSAGES = 20;
const MAX_TOKENS = 512;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: "api_error" | "rate_limit" | "invalid_key" | "timeout" | "unknown"
  ) {
    super(message);
    this.name = "LLMError";
  }
}

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new LLMError("GOOGLE_API_KEY is not set.", "invalid_key");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateReply(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const client = getClient();

  const model = client.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    systemInstruction: STORE_KNOWLEDGE,
    generationConfig: {
      maxOutputTokens: MAX_TOKENS,
      temperature: 0.7,
    },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
  });

  const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);

  const chat = model.startChat({
    history: trimmedHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  try {
    const result = await chat.sendMessage(userMessage);
    const text = result.response.text().trim();
    if (!text) {
      throw new LLMError("Empty response from LLM.", "unknown");
    }
    return text;
  } catch (err) {
    if (err instanceof LLMError) throw err;

    const message = err instanceof Error ? err.message : String(err);

    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      throw new LLMError("Rate limit reached. Please try again in a moment.", "rate_limit");
    }
    if (message.includes("400") && message.toLowerCase().includes("api key")) {
      throw new LLMError("Invalid API key. Please check your configuration.", "invalid_key");
    }
    if (message.toLowerCase().includes("timeout")) {
      throw new LLMError("The request timed out. Please try again.", "timeout");
    }

    throw new LLMError(`LLM API error: ${message}`, "api_error");
  }
}
