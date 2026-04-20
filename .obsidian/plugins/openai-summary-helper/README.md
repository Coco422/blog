# Obsidian AI Helper

An Obsidian plugin for generating note summaries, frontmatter descriptions, and AI review suggestions with an OpenAI-compatible API.

## Commands

- `Summarize current note`
- `Summarize selection`
- `Generate description for current note`
- `AI review current note`

## Live task panel

- Summary and description commands now open a live task panel immediately.
- AI review also opens a live task panel, then shows a unified diff preview before applying any changes.
- On desktop, the plugin streams responses when the endpoint supports SSE.
- If the model exposes reasoning via `reasoning_content` or wraps it in `<think>...</think>`, the panel shows that content in a separate `Thinking` section.
- Only the formal answer is inserted into the editor or saved to `frontmatter.description`.
- AI review only applies approved line changes after you inspect the generated diff.

## Settings

- Base URL, for example `https://api.openai.com/v1`
- API key
- Model name
- Summary prompt, rolling summary prompt, description prompt, and AI review prompt templates
- Approximate summary chunk target length for long notes
- Whether existing `description` values may be overwritten

## Long-note summary flow

- If the note fits within the chunk target, the plugin sends it in one request.
- If the note is too long, the plugin splits it near natural paragraph boundaries.
- Starting from chunk 2, each request includes the cumulative summary from previous chunks plus the current chunk body.
- The rolling prompt receives `{{chunk_index}}` and `{{chunk_total}}` so the model knows where the current chunk sits in the full note.

## AI review flow

- The model drafts a revised full note for the current file.
- The plugin generates a local unified diff from the original note and the revised draft.
- You review the exact line-by-line patch before anything is written.
- When you approve, the plugin applies the patch to the current note.

## Development

```bash
npm install
npm run build
```
