import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';

const BASE_WIR = 'https://semiengineering.com/chip-industry-week-in-review-';

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

  // Parse the HTML and extract the target div
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
}

const selector = '.post_cnt';

const articles: number[] = [];
for (let i = 95; i <= 97; i++) {
  articles.push(i)
}

for (let article of articles) {
  const articleStr = article.toString();
  const url = generateUrl(BASE_WIR, `-${articleStr}/`);

  fetchAndConvertToMarkdown(url, selector)
    .then(async markdown => {
      await saveMarkdownToFile(markdown, `wir${articleStr}.md`);
    })
    .catch(err => {
      console.error('Error:', err);
    });
}
