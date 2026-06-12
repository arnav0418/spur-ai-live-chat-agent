import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import {
  getOrCreateConversation,
  saveMessage,
  getConversationHistory,
  toApiMessages,
} from "../services/conversation";
import { generateReply, LLMError } from "../services/llm";

const router = Router();

const MAX_MESSAGE_LENGTH = 2000;

router.post(
  "/message",
  [
    body("message")
      .isString()
      .withMessage("message must be a string")
      .trim()
      .notEmpty()
      .withMessage("message cannot be empty")
      .isLength({ max: MAX_MESSAGE_LENGTH })
      .withMessage(`message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
    body("sessionId")
      .optional()
      .isString()
      .withMessage("sessionId must be a string")
      .isUUID()
      .withMessage("sessionId must be a valid UUID"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array()[0].msg });
      return;
    }

    const { message, sessionId } = req.body as { message: string; sessionId?: string };

    try {
      const conversationId = await getOrCreateConversation(sessionId);

      const history = await getConversationHistory(conversationId);
      const chatHistory = toApiMessages(history);

      await saveMessage(conversationId, "user", message);

      const reply = await generateReply(chatHistory, message);

      await saveMessage(conversationId, "ai", reply);

      res.json({ reply, sessionId: conversationId });
    } catch (err) {
      if (err instanceof LLMError) {
        const statusMap = {
          invalid_key: 503,
          rate_limit: 429,
          timeout: 504,
          api_error: 502,
          unknown: 500,
        } as const;
        res.status(statusMap[err.code]).json({ error: err.message });
        return;
      }
      console.error("Unexpected error in POST /chat/message:", err);
      res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  }
);

router.get("/history/:sessionId", async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.params["sessionId"] as string;

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sessionId)) {
    res.status(400).json({ error: "Invalid sessionId format." });
    return;
  }

  try {
    const history = await getConversationHistory(sessionId as string);
    res.json({ sessionId, messages: history });
  } catch (err) {
    console.error("Unexpected error in GET /chat/history:", err);
    res.status(500).json({ error: "Failed to retrieve conversation history." });
  }
});

export default router;
