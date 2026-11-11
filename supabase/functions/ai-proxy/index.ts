// MATHI AI — server-side AI proxy edge function.
// Keeps the AI provider key server-side (never exposed to the browser).
// Supports multiple modes: chat, agent-plan, study, document.
// Default provider: Google Gemini (native API). Also supports OpenAI-compatible APIs.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(handle);

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => null as any);
    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request body" }, 400);
    }

    const { mode = "chat", messages = [], instruction = "", text = "", memory = [], language = "english" } = body as {
      mode?: string;
      messages?: { role: string; content: string }[];
      instruction?: string;
      text?: string;
      memory?: { title: string; content: string; category: string }[];
      language?: string;
    };

    const apiKey = Deno.env.get("AI_API_KEY");
    const baseUrl = (Deno.env.get("AI_BASE_URL") || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
    const model = Deno.env.get("AI_MODEL") || "gemini-1.5-flash";
    const openaiBaseUrl = Deno.env.get("AI_OPENAI_BASE_URL");

    if (!apiKey) {
      return json(
        {
          error:
            "AI_API_KEY is not configured. Add a Google Gemini API key as the AI_API_KEY secret in your Supabase project's Edge Function secrets, then retry. Get a free key at https://aistudio.google.com/apikey",
          notConfigured: true,
        },
        503,
      );
    }

    const systemPrompt = buildSystemPrompt(mode, memory, language);
    const userContent = buildUserContent(mode, messages, instruction, text);

    const fullMessages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-12),
    ];
    if (userContent) {
      fullMessages.push({ role: "user", content: userContent });
    }

    // Route to the correct provider.
    // If AI_OPENAI_BASE_URL is set, use OpenAI-compatible chat completions.
    // Otherwise use the native Gemini generateContent endpoint.
    let reply: string;
    if (openaiBaseUrl) {
      reply = await callOpenAI(openaiBaseUrl.replace(/\/$/, ""), apiKey, model, fullMessages);
    } else if (baseUrl.includes("generativelanguage.googleapis.com")) {
      reply = await callGemini(baseUrl, apiKey, model, fullMessages);
    } else {
      // Try OpenAI-compatible first, fall back to Gemini.
      try {
        reply = await callOpenAI(baseUrl, apiKey, model, fullMessages);
      } catch (_openaiErr) {
        reply = await callGemini(baseUrl, apiKey, model, fullMessages);
      }
    }

    return json({ reply, mode }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
}

function buildSystemPrompt(mode: string, memory: { title: string; content: string; category: string }[], language: string): string {
  const memBlock =
    memory && memory.length
      ? "\n\nKnown user context (use when relevant):\n" +
        memory.map((m) => `- [${m.category}] ${m.title}: ${m.content}`).join("\n")
      : "";

  const base = `You are MATHI AI, an advanced next-generation AI assistant from the year 2035. You are precise, helpful, warm, and futuristic. Respond in clean markdown. Be concise but complete.${memBlock}`;

  switch (mode) {
    case "agent-plan":
      return (
        base +
        "\n\nYou are the MATHI AI Agent planning engine. Given a user instruction, break it into clear sequential steps. Respond ONLY with valid JSON, no markdown fences: {\"steps\":[{\"title\":\"...\",\"tool\":\"...\",\"description\":\"...\",\"needsApproval\":boolean}]}. Tools: research, compute, draft, summarize, generate, memory_save, none. needsApproval true for sensitive actions (sending, deleting, publishing, spending)."
      );
    case "study":
      return (
        base +
        `\n\nYou are the MATHI Smart Study Assistant. Language: ${language}. Generate clear, structured study material: notes, exam questions with answers, timetables, or concept explanations. Use headings, bullet points, and examples. When language is tamil, include Tamil explanations alongside English where helpful.`
      );
    case "document":
      return (
        base +
        "\n\nYou are the MATHI Document Intelligence engine. Based on the provided document text, summarize or answer questions precisely. If the answer is not in the document, say so clearly. Use structured markdown."
      );
    default:
      return base + "\n\nYou are a conversational AI. Give direct, useful answers. Use markdown formatting when helpful.";
  }
}

function buildUserContent(mode: string, messages: { role: string; content: string }[], instruction: string, text: string): string {
  if (mode === "agent-plan" && instruction) {
    return `Break down this task into steps:\n\n${instruction}`;
  }
  if (mode === "document" && text) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    return `Document text:\n"""\n${text.slice(0, 24000)}\n"""\n\n${lastUser ? `Question/Request: ${lastUser.content}` : "Summarize this document."}`;
  }
  return "";
}

// --- Google Gemini native API ---
async function callGemini(baseUrl: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const geminiUrl = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
  const systemMsg = messages.find((m) => m.role === "system");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
    }),
  });

  if (!geminiRes.ok) {
    const detail = await geminiRes.text().catch(() => "");
    throw new Error(`Gemini API error (${geminiRes.status}): ${detail.slice(0, 400)}`);
  }
  const gdata = await geminiRes.json().catch(() => null);
  const reply = gdata?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof reply === "string" && reply.length) return reply.trim();
  // Check for blocked content
  const finishReason = gdata?.candidates?.[0]?.finishReason;
  if (finishReason === "SAFETY") throw new Error("The response was blocked by safety filters. Try rephrasing your request.");
  throw new Error("Gemini returned an empty response.");
}

// --- OpenAI-compatible chat completions API ---
async function callOpenAI(baseUrl: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const chatUrl = `${baseUrl}/chat/completions`;
  const res = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${detail.slice(0, 400)}`);
  }
  const data = await res.json().catch(() => null);
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply === "string" && reply.length) return reply.trim();
  throw new Error("AI provider returned an empty response.");
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
