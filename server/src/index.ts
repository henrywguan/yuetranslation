import express from "express";
import cors from "cors";
import { getJyutpingList, getIPAList, getJyutpingText } from "to-jyutping";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "64kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "yuetranslation", time: new Date().toISOString() });
});

interface Token {
  char: string;
  jyutping: string | null;
  ipa: string | null;
}

app.post("/api/translate", (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text : "";

  if (!text.trim()) {
    return res.status(400).json({ error: "Field 'text' is required and must be a non-empty string." });
  }
  if (text.length > 5000) {
    return res.status(413).json({ error: "Input too long. Limit is 5000 characters." });
  }

  const jyutping = getJyutpingList(text);
  const ipa = getIPAList(text);

  const tokens: Token[] = jyutping.map(([char, jp], i) => ({
    char,
    jyutping: jp,
    ipa: ipa[i]?.[1] ?? null,
  }));

  res.json({
    input: text,
    romanization: getJyutpingText(text),
    tokens,
  });
});

app.listen(PORT, () => {
  console.log(`[yuetranslation] API listening on http://localhost:${PORT}`);
});
