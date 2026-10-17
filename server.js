
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", name: "XtremeVerse AI" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error: "AI is not connected yet. The website owner must configure the AI service."
      });
    }

    const messages = Array.isArray(req.body.messages)
      ? req.body.messages
          .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
          .slice(-16)
          .map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
      : [];

    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Please send a message." });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        instructions: "You are XtremeVerse AI, a helpful multilingual assistant. Understand slang, typos, informal messages, and incomplete sentences. Reply naturally in the user's language. Be honest when uncertain.",
        input: messages.map(m => ({
          role: m.role,
          content: [{ type: "input_text", text: m.content }]
        }))
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API error:", data.error?.message || response.status);
      return res.status(502).json({
        error: "The AI service could not answer. Please try again later."
      });
    }

    const answer = (data.output || [])
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    res.json({ reply: answer || "I couldn't generate a reply. Please try again." });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`XtremeVerse AI running on port ${PORT}`);
});
