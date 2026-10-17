const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages;

    const conversation = Array.isArray(messages)
      ? messages
          .filter(m => m && typeof m.content === "string")
          .map(m => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`)
          .join("\n\n")
      : typeof req.body.message === "string"
        ? req.body.message
        : "";

    if (!conversation.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "AI setup is incomplete. Please try again later."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are XtremeVerse AI, a friendly, helpful assistant. Respond naturally and clearly."
            }]
          },
          contents: [{
            role: "user",
            parts: [{
              text: conversation
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error: data.error?.message || "The AI couldn't respond. Please try again."
      });
    }

    const reply = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`XtremeVerse AI running on port ${PORT}`);
});
