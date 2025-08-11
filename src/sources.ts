import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

interface DataSource {
  baseUrl: string;
  postCheck: () => string;
  htmlToMarkdown: (txt: string) => string;
  createUrl: (txt: string) => string;
}

const dsSemiEng: DataSource = {
  baseUrl: 'https://semiengineering.com/chip-industry-week-in-review-',
  postCheck: () => {
    // Use this function to check for new posts
    return '';
  },
  htmlToMarkdown: (html: string) => {
    const selector = '.post_cnt';

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
  },
  createUrl: (suffix: string) => {
    return `https://semiengineering.com/chip-industry-week-in-review-${suffix}/`;
  }
}

export const Sources: Record<string, DataSource> = {

}
