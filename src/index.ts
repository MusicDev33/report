import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';

import Anth from '@anthropic-ai/sdk';

import { countTokens } from '@anthropic-ai/tokenizer';

import dotenv from 'dotenv';
dotenv.config();

const claude = new Anth({
  apiKey: process.env.ANTH_KEY
});

console.log(process.env);

const BASE_WIR = 'https://semiengineering.com/chip-industry-week-in-review-';

// Might add DeepSeek and ChatGPT later. Depends on how cheap Claude batch processing ends up being
const MODELS = {
  claude: 'claude-sonnet-4-20250514'
}

// Probably overengineering for now, but I plan on expanding this pretty soon
const generateUrl = (base: string, suffix: string) => {
  return `${base}${suffix}`;
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

const fetchAndConvertToMarkdown = async (url: string, selector: string): Promise<string> => {
  const html = await fetchHtml(url);

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const targetDiv = document.querySelector(selector);
  if (!targetDiv) {
    process.exit(1);
  }


  const images = targetDiv.querySelectorAll('img');
  images.forEach(img => img.remove());

  const headers = targetDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let found = false;
  for (let header of headers) {
    if (found) {
      break;
    }

    // There's a header in here and I don't care about any of the content after it
    if (header.id && header.id.trim().toLowerCase() === 'events and further reading') {
      found = true;
      let node: ChildNode | null = header;
      while (node) {
        const next: ChildNode | null = node.nextSibling;
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
        node = next;
      }
    }
  }

  const turndownService = new TurndownService();
  const markdown = turndownService.turndown(targetDiv.innerHTML);
  return markdown;
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
  const selector = '.post_cnt';

  let articles: number[] = [];
  for (let i = 95; i <= 97; i++) {
    articles.push(i)
  }

  articles = [98];

  for (let article of articles) {
    const articleStr = article.toString();
    const url = generateUrl(BASE_WIR, `-${articleStr}/`);

    const mdArticle = await fetchAndConvertToMarkdown(url, selector);
    await saveMarkdownToFile(mdArticle, `wir${articleStr}.md`);

    const res = await sendToClaude(mdArticle);
    const resTxt = (res['content'][0] as Anth.TextBlock).text;

    await saveMarkdownToFile(resTxt, `report-${articleStr}.md`);
  }
}

(async () => {
  await main();
})();
