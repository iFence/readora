import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  token.attrSet('target', '_blank');
  token.attrSet('rel', 'noreferrer noopener');
  return self.renderToken(tokens, idx, options);
};

export function renderMarkdownToHtml(source = '') {
  const rawHtml = markdown.render(source || '');
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
  });
}
