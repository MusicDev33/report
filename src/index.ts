import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';

import Anth from '@anthropic-ai/sdk';

import { countTokens } from '@anthropic-ai/tokenizer';

import { Sources } from './sources';

import dotenv from 'dotenv';
dotenv.config();

const claude = new Anth({
  apiKey: process.env.ANTH_KEY
});

// Might add DeepSeek and ChatGPT later. Depends on how cheap Claude batch processing ends up being
const MODELS = {
  claude: 'claude-sonnet-4-20250514'
}

const fetchHtml = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function saveMarkdownToFile(markdown: string, filename: string) {
  const articlesDir = path.join(__dirname, '../articles');
  try {
    await fs.access(articlesDir);
  } catch {
    await fs.mkdir(articlesDir);
  }
  const filePath = path.join(articlesDir, filename);
  await fs.writeFile(filePath, markdown, 'utf8');
  console.log(`Markdown saved to ${filePath}`);
  console.log(`  - Tokens: ${countTokens(markdown)}`);
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

  return msg;
}

const main = async () => {
  let articles: number[] = [98];

  let source = Sources['semiengineering'];

  articles = [98];

  for (let article of articles) {
    const articleStr = article.toString();
    const url = source.createUrl(articleStr);
    const articleHtml = await fetchHtml(url);

    const mdArticle = source.htmlToMarkdown(articleHtml);
    await saveMarkdownToFile(mdArticle, `wir${articleStr}.md`);

    const res = await sendToClaude(mdArticle);
    const resTxt = (res['content'][0] as Anth.TextBlock).text;

    await saveMarkdownToFile(resTxt, `report-${articleStr}.md`);
  }
}

(async () => {
  await main();
})();
