import dotenv from 'dotenv';
dotenv.config();

import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';

import { countTokens } from '@anthropic-ai/tokenizer';

import { Sources } from './sources';
import { Calls } from './bot';

import { sendMsgToUser } from './telegram';

const TELEGRAM_USER = process.env.TELEGRAM_USER_ID;
if (!TELEGRAM_USER) {
  process.exit(1)
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

const main = async () => {
  let articles: number[] = [100];

  let source = Sources['semiengineering'];

  for (let article of articles) {
    const articleStr = article.toString();
    const url = source.createUrl(articleStr);
    const articleHtml = await fetchHtml(url);

    const mdArticle = source.htmlToMarkdown(articleHtml);
    await saveMarkdownToFile(mdArticle, `wir${articleStr}.md`);

    const resTxt = await Calls['claude'](mdArticle);

    await saveMarkdownToFile(resTxt, `report-${articleStr}.md`);
    await sendMsgToUser(TELEGRAM_USER, `*${source.name}*\nReport ${article.toString()} compiled\\!`);
  }
}

const test = async () => {
  await sendMsgToUser(TELEGRAM_USER, '*SemiEngineering*\n\nReport 101 compiled\\!');
}

(async () => {
  await main();
  // await test();
})();
