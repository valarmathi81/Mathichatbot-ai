import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const PORT = Number(process.env.PORT) || 3001;
const apiKey = process.env.GEMINI_API_KEY;

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MODEL = "gemini-3.5-flash-lite";
const IMAGE_MODEL = "gemini-3.1-flash-image";
const IMAGE_ASPECT_RATIOS = new Set(["1:1", "2:3", "3:2"]);

app.get("/", (req, res) => {
  res.send("MATHI AI Gemini Backend is running!");
});

app.post("/api/images/generate", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  const aspectRatio = req.body?.aspectRatio;

  if (!prompt || prompt.length > 2000) {
    return res.status(400).json({
      error: "Enter an image prompt between 1 and 2000 characters.",
    });
  }

  if (!IMAGE_ASPECT_RATIOS.has(aspectRatio)) {
    return res.status(400).json({
      error: "Choose a supported aspect ratio: square, portrait, or landscape.",
    });
  }

  if (!apiKey || !ai) {
    return res.status(503).json({
      error: "Image generation is not configured. Add GEMINI_API_KEY to the backend .env file.",
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: prompt,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio,
        },
      },
    });

    const imagePart = response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .find(
        (part) =>
          typeof part.inlineData?.data === "string" &&
          typeof part.inlineData.mimeType === "string" &&
          part.inlineData.mimeType.startsWith("image/"),
      );

    if (!imagePart?.inlineData?.data || !imagePart.inlineData.mimeType) {
      const explanation = response.text?.trim();
      return res.status(502).json({
        error: explanation
          ? `Gemini did not return an image: ${explanation}`
          : `Gemini did not return an image. Verify that "${IMAGE_MODEL}" is available to your Gemini API key and that the prompt passed safety checks.`,
      });
    }

    return res.json({
      image: {
        mimeType: imagePart.inlineData.mimeType,
        data: imagePart.inlineData.data,
      },
      model: IMAGE_MODEL,
    });
  } catch (error) {
    console.error("Gemini image generation error:", error);

    const status =
      typeof error === "object" && error !== null && "status" in error
        ? error.status
        : undefined;

    if (status === 404) {
      return res.status(502).json({
        error: `Gemini could not find image model "${IMAGE_MODEL}" for this API key. Confirm the model name and API access for your Gemini project.`,
      });
    }

    if (status === 400) {
      return res.status(502).json({
        error: `Gemini rejected the image request for "${IMAGE_MODEL}". Check the prompt and selected aspect ratio.`,
      });
    }

    if (status === 401 || status === 403) {
      return res.status(502).json({
        error: "Gemini rejected the backend credentials. Check GEMINI_API_KEY and its image-generation access in the backend .env file.",
      });
    }

    if (status === 429) {
      return res.status(429).json({
        error: `Gemini image generation quota is unavailable for "${IMAGE_MODEL}". Check your API quota and billing tier, then try again.`,
      });
    }

    return res.status(502).json({
      error:
        error instanceof Error && error.message
          ? `Gemini image generation failed: ${error.message}`
          : "Gemini image generation failed. Check the backend logs and try again.",
    });
  }
});

app.post("/api/ai", async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: "AI is not configured. Add GEMINI_API_KEY to the backend .env file.",
      });
    }

    const {
      mode,
      messages,
      memory,
      instruction,
      text,
      language,
      file,
      question,
    } = req.body;

    let prompt = "";

    const conversation = (messages || [])
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    if (mode === "chat") {
      prompt = `
You are MATHI AI, an intelligent and friendly personal AI assistant.
Answer naturally and accurately.
Support English and Tamil.
Use the language in which the user asks.

Personal memory:
${JSON.stringify(memory || [])}

Conversation:
${conversation}
`;
    } else if (mode === "agent-plan") {
      prompt = `
You are MATHI AI Agent.
Break the user's task into clear steps.
Explain the tools or actions required.
Never claim that you completed an action unless it was actually performed.

User task: ${instruction || ""}
Memory: ${JSON.stringify(memory || [])}
`;
    } else if (mode === "study") {
      prompt = `
You are MATHI AI Study Assistant.
Explain concepts clearly with examples.
Respond in ${language === "tamil" ? "Tamil" : "English"}.

Conversation:
${conversation}

Memory: ${JSON.stringify(memory || [])}
`;
    } else if (mode === "document") {
      prompt = `
You are MATHI AI Document Assistant.
Answer questions using the supplied document content.
If the answer is not present, say so clearly.

Document:
${text || ""}

Conversation:
${conversation}
`;
    } else if (mode === "file-analysis") {
      if (!file || !file.data || !file.mimeType) {
        return res.status(400).json({
          error: "Please upload a valid PDF or image file.",
        });
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (!allowedTypes.includes(file.mimeType)) {
        return res.status(400).json({
          error: "Only PDF, JPG, PNG and WEBP files are supported.",
        });
      }

      prompt = `
You are MATHI AI, an intelligent multimodal AI assistant.

Analyze the uploaded file carefully.

File name: ${file.fileName || "Uploaded file"}

User question:
${question || "Please analyze this file and explain its contents."}

Instructions:
- If it is a PDF, understand its pages, text, tables and important information.
- If it is an image, describe the visible objects, text, layout and relevant details.
- Answer questions using information from the uploaded file.
- Summarize important points when requested.
- If something is unclear or unreadable, say so honestly.
- Do not invent information that is not visible in the file.
- Respond in the language used by the user.

Previous conversation:
${conversation}
`;

      const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: file.mimeType,
                  data: file.data,
                },
              },
            ],
          },
        ],
      });

      return res.json({
        reply: response.text || "I couldn't analyze this file.",
      });
    } else {
      return res.status(400).json({
        error: "Invalid AI mode.",
      });
    }

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });

    res.json({
      reply: response.text || "I couldn't generate a response.",
    });
  } catch (error) {
    console.error("Gemini Error:", error);

    res.status(500).json({
      error: error.message || "Gemini AI request failed.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`MATHI AI Backend running at http://localhost:${PORT}`);
});