import Anth from '@anthropic-ai/sdk';

import dotenv from 'dotenv';
dotenv.config();

const claude = new Anth({
  apiKey: process.env.ANTH_KEY
});

const MODELS = {
  claude: 'claude-sonnet-4-20250514'
}


const sendToClaude = async (txt: string) => {
  const msg = await claude.messages.create({
    model: MODELS['claude'],
    max_tokens: 5000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `I'm a trader with a focus on geopolitics and global supply chains. Give me an investment report (make the report in Markdown please) based on this article:\n${txt}`
          }
        ]
      }
    ]
  });

  const resTxt = (msg['content'][0] as Anth.TextBlock).text;

  return resTxt;
}

export const Calls: Record<string, (t: string) => Promise<string>> = {
  claude: sendToClaude
}
