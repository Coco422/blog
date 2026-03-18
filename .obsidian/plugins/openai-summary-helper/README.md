# OpenAI Summary Helper

An Obsidian plugin for generating note summaries and frontmatter descriptions with an OpenAI-compatible API.

## Commands

- `Summarize current note`
- `Summarize selection`
- `Generate description for current note`

## Live task panel

- Summary and description commands now open a live task panel immediately.
- On desktop, the plugin streams responses when the endpoint supports SSE.
- If the model exposes reasoning via `reasoning_content` or wraps it in `<think>...</think>`, the panel shows that content in a separate `Thinking` section.
- Only the formal answer is inserted into the editor or saved to `frontmatter.description`.

## Settings

- Base URL, for example `https://api.openai.com/v1`
- API key
- Model name
- Summary prompt, rolling summary prompt, and description prompt templates
- Approximate summary chunk target length for long notes
- Whether existing `description` values may be overwritten

## Long-note summary flow

- If the note fits within the chunk target, the plugin sends it in one request.
- If the note is too long, the plugin splits it near natural paragraph boundaries.
- Starting from chunk 2, each request includes the cumulative summary from previous chunks plus the current chunk body.
- The rolling prompt receives `{{chunk_index}}` and `{{chunk_total}}` so the model knows where the current chunk sits in the full note.

## Development

```bash
npm install
npm run build
```
