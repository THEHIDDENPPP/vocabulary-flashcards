const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyToken(req, res) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader) {
    res.status(403).json({ error: 'Token required' });
    return null;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid token', details: error?.message });
    return null;
  }

  return data.user;
}

function parseJsonArray(text) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Result is not an array');
    return parsed;
  } catch (err) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse AI response: ' + err.message);
  }
}

async function callAnthropic(bodyData) {
  if (!anthropicKey) {
    throw new Error('Anthropic API key not configured on the server. Set ANTHROPIC_API_KEY.');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': anthropicKey
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 4000,
      system: `You are a vocabulary extraction assistant. Extract ALL vocabulary words and definitions from the content provided.

Return ONLY a valid JSON array — no markdown, no explanation, nothing else. Raw JSON only.

Each object must have exactly these keys:
- "word": the vocabulary word or phrase
- "def": clear, concise definition
- "ex": a natural example sentence using the word in everyday life (create a good one if not provided)
- "trick": a fun, memorable mnemonic (etymology, sound link, visual, wordplay) to remember this word

Rules:
- Extract EVERY word-definition pair you can find
- For handwritten notes: interpret → - : as "means"
- For tables: first column = word, second = definition typically
- Always generate helpful examples and memory tricks
- If only words with no definitions exist, define them properly
- Remove duplicates, return minimum 1 item
- Output ONLY the JSON array, nothing else`,
      messages: bodyData.messages
    })
  });

  const result = await response.json().catch(() => null);
  if (!response.ok) {
    const message = result?.error?.message || result?.message || `Anthropic API error ${response.status}`;
    throw new Error(message);
  }

  const content = result?.content || result?.completion || result?.response || '';
  const rawText = Array.isArray(content)
    ? content.map(chunk => (typeof chunk === 'string' ? chunk : chunk?.text || '')).join('')
    : typeof content === 'string'
      ? content
      : JSON.stringify(content);

  return parseJsonArray(rawText);
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }

  const user = await verifyToken(req, res);
  if (!user) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const body = req.body || {};
  const { type, content, text, mediaType } = body;
  if (!type) {
    return res.status(400).json({ error: 'Import type is required' });
  }

  try {
    if (type === 'vision') {
      if (!content || !mediaType) throw new Error('Missing image content or mediaType');
      const words = await callAnthropic({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: content } },
              { type: 'text', text: 'Extract all vocabulary words and definitions from this image. Return only a JSON array.' }
            ]
          }
        ]
      });
      return res.json({ words });
    }

    if (type === 'pdf') {
      if (!content) throw new Error('Missing PDF content');
      const words = await callAnthropic({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: content } },
              { type: 'text', text: 'Extract all vocabulary words and definitions from this document. Return only a JSON array.' }
            ]
          }
        ]
      });
      return res.json({ words });
    }

    if (type === 'text') {
      if (!text) throw new Error('Missing text content');
      const words = await callAnthropic({
        messages: [
          {
            role: 'user',
            content: `Extract all vocabulary words and definitions from this text. Return only a JSON array.\n\n${text.substring(0, 8000)}`
          }
        ]
      });
      return res.json({ words });
    }

    return res.status(400).json({ error: 'Unsupported import type' });
  } catch (err) {
    console.error('Import error:', err);
    return res.status(500).json({ error: err.message || 'Import service error' });
  }
};
