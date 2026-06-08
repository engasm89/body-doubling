interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LlmOptions {
  systemPrompt: string;
  userPrompt: string;
}

export async function generateShortCoachCopy(options: LlmOptions): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const messages: ChatMessage[] = [
    { role: "system", content: options.systemPrompt },
    { role: "user", content: options.userPrompt },
  ];

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        max_tokens: 180,
        messages,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch {
    return null;
  }
}
