import {
  App,
  Editor,
  MarkdownView,
  Modal,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  TFile,
  requireApiVersion,
  requestUrl,
} from "obsidian";
import { applyPatch, createTwoFilesPatch, parsePatch, type StructuredPatch, type StructuredPatchHunk } from "diff";

interface OpenAISummarySettings {
  apiKey: string;
  baseUrl: string;
  descriptionPrompt: string;
  maxInputChars: number;
  model: string;
  overwriteDescription: boolean;
  reviewPrompt: string;
  rollingSummaryPrompt: string;
  summaryPrompt: string;
}

const DEFAULT_SETTINGS: OpenAISummarySettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  descriptionPrompt: [
    "请基于下面文章生成一段适合写入 frontmatter description 的中文描述。",
    "要求：",
    "1. 60 到 100 字；",
    "2. 保持准确、具体，不要夸张；",
    "3. 只输出 description 正文，不要额外解释；",
    "",
    "文章标题：{{title}}",
    "文章路径：{{path}}",
    "",
    "文章内容：",
    "{{content}}",
  ].join("\n"),
  maxInputChars: 24000,
  model: "gpt-4.1-mini",
  overwriteDescription: false,
  reviewPrompt: [
    "你是一名中文文章编辑助手，请直接输出“修订后的完整 Markdown 文本”，用于替换原文。",
    "目标：修正错别字、语病、表达不顺、重复、标点和措辞问题，但不要改变作者原意。",
    "要求：",
    "1. YAML frontmatter 必须保持原样，除非其中有明显错别字；",
    "2. 保持标题层级、列表、链接、引用、表格、代码块等 Markdown 结构；",
    "3. 不要新增解释，不要写审稿意见，不要使用代码围栏；",
    "4. 只输出修订后的完整 Markdown 文本；",
    "",
    "文章标题：{{title}}",
    "文章路径：{{path}}",
    "",
    "原文全文：",
    "{{content}}",
  ].join("\n"),
  rollingSummaryPrompt: [
    "你正在执行长文的分段递进摘要任务。",
    "整篇文章共 {{chunk_total}} 段，当前处理第 {{chunk_index}} 段。",
    "你会看到两部分输入：",
    "1. 已有累计摘要：表示截至上一段为止的重要内容；",
    "2. 当前段正文：这次新增需要纳入总结的内容。",
    "",
    "你的目标不是只总结当前段，而是输出一份“截至当前段为止”的累计摘要。",
    "要求：",
    "1. 优先保留已有累计摘要中的关键信息，并与当前段的新信息整合；",
    "2. 去重和压缩，避免重复表述；",
    "3. 用 4 到 6 条要点总结；",
    "4. 最后一行单独给出一句总括；",
    "5. 不要编造原文没有提到的信息；",
    "",
    "文章标题：{{title}}",
    "文章路径：{{path}}",
    "",
    "已有累计摘要：",
    "{{previous_summary}}",
    "",
    "当前处理段正文：",
    "{{content}}",
  ].join("\n"),
  summaryPrompt: [
    "请阅读下面的文章，并生成中文概括。",
    "要求：",
    "1. 用 3 到 5 条要点总结；",
    "2. 最后一行单独给出一句总括；",
    "3. 不要编造原文没有提到的信息；",
    "",
    "文章标题：{{title}}",
    "文章路径：{{path}}",
    "",
    "文章内容：",
    "{{content}}",
  ].join("\n"),
};

const API_KEY_SECRET_ID = "openai-summary-helper-api-key";
const MIN_CHUNK_SIZE = 1000;
const MAX_CARRYOVER_CHARS = 4000;
const REVIEW_DIFF_CONTEXT_LINES = 3;

interface CompletionResult {
  answer: string;
  rawAnswer: string;
  thinking: string;
}

interface GenerationBridge {
  beginStep(message: string): void;
  signal: AbortSignal;
  updateContent(result: CompletionResult): void;
  updateStatus(message: string): void;
}

interface LiveGenerationModalOptions {
  commitLabel?: string;
  helperText: string;
  onCommit?: (value: string) => void | Promise<void>;
  title: string;
}

class LiveGenerationModal extends Modal {
  private readonly abortController = new AbortController();
  private readonly commitLabel?: string;
  private readonly helperText: string;
  private readonly onCommit?: (value: string) => void | Promise<void>;
  private readonly titleText: string;
  private answerText = "";
  private cancelButtonEl: HTMLButtonElement | null = null;
  private closed = false;
  private commitButtonEl: HTMLButtonElement | null = null;
  private copyButtonEl: HTMLButtonElement | null = null;
  private elapsedEl: HTMLSpanElement | null = null;
  private elapsedTimer: number | null = null;
  private isRunning = true;
  private statusEl: HTMLDivElement | null = null;
  private thinkingText = "";
  private thinkingWrapEl: HTMLDivElement | null = null;
  private thinkingValueEl: HTMLPreElement | null = null;
  private answerValueEl: HTMLPreElement | null = null;
  private startedAt = Date.now();

  constructor(app: App, options: LiveGenerationModalOptions) {
    super(app);
    this.commitLabel = options.commitLabel;
    this.helperText = options.helperText;
    this.onCommit = options.onCommit;
    this.titleText = options.title;
  }

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  isClosed(): boolean {
    return this.closed;
  }

  beginStep(message: string): void {
    this.isRunning = true;
    this.answerText = "";
    this.thinkingText = "";
    this.updateStatus(message);
    this.renderContent();
    this.updateActions();
  }

  updateStatus(message: string): void {
    this.statusEl?.setText(message);
  }

  updateContent(result: CompletionResult): void {
    this.answerText = result.answer;
    this.thinkingText = result.thinking;
    this.renderContent();
    this.updateActions();
  }

  markComplete(message: string): void {
    this.isRunning = false;
    this.updateStatus(message);
    this.updateActions();
  }

  markError(message: string): void {
    this.isRunning = false;
    this.updateStatus(message);
    this.updateActions();
  }

  markCanceled(message: string): void {
    this.isRunning = false;
    this.updateStatus(message);
    this.updateActions();
  }

  onOpen(): void {
    const { contentEl } = this;
    this.setTitle(this.titleText);

    const helper = contentEl.createEl("p", { text: this.helperText });
    helper.style.marginBottom = "0.75rem";
    helper.style.color = "var(--text-muted)";
    helper.style.lineHeight = "1.5";

    const metaEl = contentEl.createDiv();
    metaEl.style.display = "flex";
    metaEl.style.justifyContent = "space-between";
    metaEl.style.alignItems = "center";
    metaEl.style.gap = "1rem";
    metaEl.style.marginBottom = "0.75rem";

    this.statusEl = metaEl.createDiv({ text: "Preparing request..." });
    this.statusEl.style.fontWeight = "600";
    this.statusEl.style.lineHeight = "1.5";
    this.statusEl.style.flex = "1";

    this.elapsedEl = metaEl.createSpan({ text: "Elapsed 00:00" });
    this.elapsedEl.style.color = "var(--text-muted)";
    this.elapsedEl.style.whiteSpace = "nowrap";

    this.thinkingWrapEl = this.buildSection(contentEl, "Thinking");
    this.thinkingValueEl = this.thinkingWrapEl.createEl("pre");
    this.prepareTextSurface(this.thinkingValueEl, "Model reasoning will appear here if the endpoint exposes it.");

    const answerWrapEl = this.buildSection(contentEl, "Answer");
    this.answerValueEl = answerWrapEl.createEl("pre");
    this.prepareTextSurface(this.answerValueEl, "The formal answer will stream here.");

    const actionsEl = contentEl.createDiv();
    actionsEl.style.display = "flex";
    actionsEl.style.gap = "0.75rem";
    actionsEl.style.marginTop = "1rem";
    actionsEl.style.flexWrap = "wrap";

    this.copyButtonEl = actionsEl.createEl("button", { text: "Copy answer" });
    this.copyButtonEl.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.answerText);
        new Notice("Copied answer to clipboard.");
      } catch (error) {
        console.error("Failed to copy answer", error);
        new Notice("Could not copy answer to clipboard.");
      }
    });

    if (this.onCommit && this.commitLabel) {
      this.commitButtonEl = actionsEl.createEl("button", { text: this.commitLabel });
      this.commitButtonEl.addClass("mod-cta");
      this.commitButtonEl.addEventListener("click", async () => {
        if (!this.answerText.trim()) {
          new Notice("There is no formal answer to save yet.");
          return;
        }

        this.commitButtonEl?.setAttr("disabled", true);
        try {
          await this.onCommit?.(this.answerText.trim());
        } catch (error) {
          console.error("Failed to commit generated answer", error);
          new Notice(error instanceof Error ? error.message : "Failed to save generated answer.");
        } finally {
          this.updateActions();
        }
      });
    }

    this.cancelButtonEl = actionsEl.createEl("button", { text: "Cancel request" });
    this.cancelButtonEl.addEventListener("click", () => {
      if (this.isRunning) {
        this.updateStatus("Canceling request...");
        this.abortController.abort("Canceled by user.");
        return;
      }

      this.close();
    });

    this.renderContent();
    this.updateActions();
    this.updateElapsed();
    this.elapsedTimer = window.setInterval(() => this.updateElapsed(), 1000);
  }

  onClose(): void {
    this.closed = true;
    if (this.isRunning && !this.abortController.signal.aborted) {
      this.abortController.abort("Modal closed by user.");
    }

    if (this.elapsedTimer !== null) {
      window.clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }

    this.contentEl.empty();
  }

  private buildSection(parent: HTMLElement, title: string): HTMLDivElement {
    const wrapEl = parent.createDiv();
    wrapEl.style.marginTop = "1rem";

    const titleEl = wrapEl.createEl("h4", { text: title });
    titleEl.style.margin = "0 0 0.5rem 0";

    return wrapEl;
  }

  private prepareTextSurface(surface: HTMLPreElement, placeholder: string): void {
    surface.style.margin = "0";
    surface.style.padding = "0.75rem";
    surface.style.maxHeight = "16rem";
    surface.style.overflow = "auto";
    surface.style.whiteSpace = "pre-wrap";
    surface.style.wordBreak = "break-word";
    surface.style.background = "var(--background-secondary)";
    surface.style.border = "1px solid var(--background-modifier-border)";
    surface.style.borderRadius = "8px";
    surface.setText(placeholder);
  }

  private renderContent(): void {
    if (this.thinkingWrapEl && this.thinkingValueEl) {
      const thinking = this.thinkingText.trim();
      this.thinkingWrapEl.style.display = thinking ? "block" : "none";
      if (thinking) {
        this.thinkingValueEl.setText(thinking);
      }
    }

    if (this.answerValueEl) {
      const answer = this.answerText.trim();
      this.answerValueEl.setText(answer || "The formal answer will stream here.");
    }
  }

  private updateActions(): void {
    if (this.copyButtonEl) {
      this.copyButtonEl.toggleAttribute("disabled", !this.answerText.trim());
    }

    if (this.commitButtonEl) {
      this.commitButtonEl.toggleAttribute("disabled", this.isRunning || !this.answerText.trim());
    }

    if (this.cancelButtonEl) {
      this.cancelButtonEl.setText(this.isRunning ? "Cancel request" : "Close");
    }
  }

  private updateElapsed(): void {
    if (!this.elapsedEl) {
      return;
    }

    const elapsedSeconds = Math.floor((Date.now() - this.startedAt) / 1000);
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
    const seconds = String(elapsedSeconds % 60).padStart(2, "0");
    this.elapsedEl.setText(`Elapsed ${minutes}:${seconds}`);
  }
}

interface ReviewDiffModalOptions {
  diffText: string;
  file: TFile;
  onApply: () => void | Promise<void>;
}

type ReviewDiffLineKind = "addition" | "context" | "deletion" | "note";

interface ReviewDiffStats {
  additions: number;
  deletions: number;
  hunks: number;
}

class ReviewDiffModal extends Modal {
  private readonly diffText: string;
  private readonly file: TFile;
  private readonly onApply: () => void | Promise<void>;

  constructor(app: App, options: ReviewDiffModalOptions) {
    super(app);
    this.diffText = options.diffText;
    this.file = options.file;
    this.onApply = options.onApply;
  }

  onOpen(): void {
    const { contentEl } = this;
    const patches = parsePatch(this.diffText);
    const stats = this.countDiffStats(patches);

    this.setTitle(`AI review diff: ${this.file.basename}`);

    const helper = contentEl.createEl("p", {
      text: `Review the unified diff below. If you approve it, the plugin will apply these changes to "${this.file.path}".`,
    });
    helper.style.marginBottom = "0.75rem";
    helper.style.color = "var(--text-muted)";
    helper.style.lineHeight = "1.5";

    const meta = contentEl.createEl("p", {
      text: `Hunks: ${stats.hunks} | Additions: ${stats.additions} | Deletions: ${stats.deletions}`,
    });
    meta.style.margin = "0 0 0.75rem 0";
    meta.style.fontWeight = "600";

    const diffEl = contentEl.createDiv();
    diffEl.style.maxHeight = "28rem";
    diffEl.style.overflow = "auto";
    diffEl.style.background = "var(--background-primary)";
    diffEl.style.border = "1px solid var(--background-modifier-border)";
    diffEl.style.borderRadius = "8px";

    if (patches.length > 0) {
      this.renderStructuredDiff(diffEl, patches);
    } else {
      this.renderRawDiff(diffEl);
    }

    const actions = contentEl.createDiv();
    actions.style.display = "flex";
    actions.style.gap = "0.75rem";
    actions.style.flexWrap = "wrap";
    actions.style.marginTop = "1rem";

    const copyButton = actions.createEl("button", { text: "Copy diff" });
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.diffText);
        new Notice("Copied review diff to clipboard.");
      } catch (error) {
        console.error("Failed to copy review diff", error);
        new Notice("Could not copy review diff.");
      }
    });

    const applyButton = actions.createEl("button", { text: "Apply changes" });
    applyButton.addClass("mod-cta");
    applyButton.addEventListener("click", async () => {
      applyButton.toggleAttribute("disabled", true);
      try {
        await this.onApply();
        this.close();
      } catch (error) {
        console.error("Failed to apply AI review changes", error);
        new Notice(error instanceof Error ? error.message : "Failed to apply AI review changes.");
        applyButton.toggleAttribute("disabled", false);
      }
    });

    const closeButton = actions.createEl("button", { text: "Close" });
    closeButton.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private countDiffStats(patches: StructuredPatch[]): ReviewDiffStats {
    let additions = 0;
    let deletions = 0;
    let hunks = 0;

    for (const patch of patches) {
      hunks += patch.hunks.length;
      for (const hunk of patch.hunks) {
        for (const line of hunk.lines) {
          if (line.startsWith("+")) {
            additions += 1;
          } else if (line.startsWith("-")) {
            deletions += 1;
          }
        }
      }
    }

    return { additions, deletions, hunks };
  }

  private renderStructuredDiff(parent: HTMLElement, patches: StructuredPatch[]): void {
    for (const [patchIndex, patch] of patches.entries()) {
      if (patchIndex > 0) {
        const spacer = parent.createDiv();
        spacer.style.height = "0.75rem";
        spacer.style.background = "var(--background-secondary)";
        spacer.style.borderTop = "1px solid var(--background-modifier-border)";
        spacer.style.borderBottom = "1px solid var(--background-modifier-border)";
      }

      const header = parent.createDiv({
        text: `${patch.oldFileName ?? this.file.path} -> ${patch.newFileName ?? this.file.path}`,
      });
      header.style.padding = "0.6rem 0.75rem";
      header.style.fontFamily = "var(--font-monospace)";
      header.style.fontSize = "12px";
      header.style.fontWeight = "600";
      header.style.background = "var(--background-secondary)";
      header.style.borderBottom = "1px solid var(--background-modifier-border)";
      header.style.wordBreak = "break-all";

      for (const hunk of patch.hunks) {
        this.renderHunk(parent, hunk);
      }
    }
  }

  private renderHunk(parent: HTMLElement, hunk: StructuredPatchHunk): void {
    const hunkHeader = parent.createDiv({
      text: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    });
    hunkHeader.style.padding = "0.35rem 0.75rem";
    hunkHeader.style.fontFamily = "var(--font-monospace)";
    hunkHeader.style.fontSize = "12px";
    hunkHeader.style.color = "var(--text-muted)";
    hunkHeader.style.background = "var(--background-secondary-alt)";
    hunkHeader.style.borderBottom = "1px solid var(--background-modifier-border)";

    let oldLineNumber = hunk.oldStart;
    let newLineNumber = hunk.newStart;

    for (const rawLine of hunk.lines) {
      if (rawLine.startsWith("\\")) {
        this.renderDiffRow(parent, "note", null, null, "\\", rawLine.slice(1).trimStart());
        continue;
      }

      if (rawLine.startsWith("+")) {
        this.renderDiffRow(parent, "addition", null, newLineNumber, "+", rawLine.slice(1));
        newLineNumber += 1;
        continue;
      }

      if (rawLine.startsWith("-")) {
        this.renderDiffRow(parent, "deletion", oldLineNumber, null, "-", rawLine.slice(1));
        oldLineNumber += 1;
        continue;
      }

      this.renderDiffRow(parent, "context", oldLineNumber, newLineNumber, " ", rawLine.slice(1));
      oldLineNumber += 1;
      newLineNumber += 1;
    }
  }

  private renderDiffRow(
    parent: HTMLElement,
    kind: ReviewDiffLineKind,
    oldLineNumber: number | null,
    newLineNumber: number | null,
    prefix: string,
    content: string,
  ): void {
    const row = parent.createDiv();
    row.style.display = "grid";
    row.style.gridTemplateColumns = "4rem 4rem 1.5rem minmax(0, 1fr)";
    row.style.alignItems = "start";
    row.style.fontFamily = "var(--font-monospace)";
    row.style.fontSize = "12px";
    row.style.lineHeight = "1.6";
    row.style.borderBottom = "1px solid var(--background-modifier-border-hover)";

    if (kind === "addition") {
      row.style.background = "rgba(46, 160, 67, 0.14)";
    } else if (kind === "deletion") {
      row.style.background = "rgba(248, 81, 73, 0.14)";
    } else if (kind === "note") {
      row.style.background = "var(--background-secondary)";
    }

    if (kind === "note") {
      const note = row.createDiv({
        text: `${prefix}${content}`,
      });
      note.style.gridColumn = "1 / -1";
      note.style.padding = "0.2rem 0.75rem";
      note.style.color = "var(--text-muted)";
      note.style.fontStyle = "italic";
      note.style.whiteSpace = "pre-wrap";
      note.style.wordBreak = "break-word";
      return;
    }

    this.renderLineNumberCell(row, oldLineNumber);
    this.renderLineNumberCell(row, newLineNumber);

    const prefixEl = row.createDiv({ text: prefix });
    prefixEl.style.padding = "0.2rem 0";
    prefixEl.style.textAlign = "center";
    prefixEl.style.color = kind === "addition" ? "#1a7f37" : kind === "deletion" ? "#cf222e" : "var(--text-faint)";
    prefixEl.style.fontWeight = "700";

    const contentEl = row.createDiv({ text: content });
    contentEl.style.padding = "0.2rem 0.75rem 0.2rem 0";
    contentEl.style.whiteSpace = "pre-wrap";
    contentEl.style.wordBreak = "break-word";
  }

  private renderLineNumberCell(parent: HTMLElement, lineNumber: number | null): void {
    const cell = parent.createDiv({
      text: lineNumber === null ? "" : String(lineNumber),
    });
    cell.style.padding = "0.2rem 0.5rem";
    cell.style.textAlign = "right";
    cell.style.color = "var(--text-faint)";
    cell.style.userSelect = "none";
    cell.style.borderRight = "1px solid var(--background-modifier-border-hover)";
  }

  private renderRawDiff(parent: HTMLElement): void {
    const rawEl = parent.createEl("pre");
    rawEl.setText(this.diffText);
    rawEl.style.margin = "0";
    rawEl.style.padding = "0.75rem";
    rawEl.style.whiteSpace = "pre-wrap";
    rawEl.style.wordBreak = "break-word";
    rawEl.style.background = "var(--background-secondary)";
  }
}

export default class OpenAISummaryHelperPlugin extends Plugin {
  settings: OpenAISummarySettings = DEFAULT_SETTINGS;
  private currentOperationToken = 0;
  private statusBarEl: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    try {
      this.statusBarEl = this.addStatusBarItem();
      this.setIdleStatus();
    } catch (error) {
      console.debug("Status bar is not available in this Obsidian environment.", error);
      this.statusBarEl = null;
    }

    this.addSettingTab(new OpenAISummarySettingTab(this.app, this));

    this.addCommand({
      id: "summarize-current-note",
      name: "Summarize current note",
      callback: async () => {
        await this.summarizeCurrentNote();
      },
    });

    this.addCommand({
      id: "summarize-selection",
      name: "Summarize selection",
      editorCallback: async (editor) => {
        await this.summarizeSelection(editor);
      },
    });

    this.addCommand({
      id: "generate-description-current-note",
      name: "Generate description for current note",
      callback: async () => {
        await this.generateDescriptionForCurrentNote();
      },
    });

    this.addCommand({
      id: "ai-review-current-note",
      name: "AI review current note",
      callback: async () => {
        await this.reviewCurrentNote();
      },
    });
  }

  async loadSettings(): Promise<void> {
    const stored = await this.loadData();
    const legacyApiKey = typeof stored?.apiKey === "string" ? stored.apiKey : "";
    const secretApiKey = this.supportsSecureStorage()
      ? this.app.secretStorage.getSecret(API_KEY_SECRET_ID) ?? ""
      : "";

    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored,
      apiKey: secretApiKey || legacyApiKey,
    };
  }

  async saveSettings(): Promise<void> {
    if (this.supportsSecureStorage()) {
      this.app.secretStorage.setSecret(API_KEY_SECRET_ID, this.settings.apiKey);
      await this.saveData({
        ...this.settings,
        apiKey: "",
      });
      return;
    }

    await this.saveData(this.settings);
  }

  async testConnection(): Promise<void> {
    if (!this.settings.apiKey.trim()) {
      new Notice("Set your API key first.");
      return;
    }

    try {
      const result = await this.requestCompletion("Reply with exactly: OK");
      if (result.answer.toUpperCase() === "OK") {
        new Notice("Connection test passed.");
        return;
      }

      new Notice(`Connection worked, model replied: ${result.answer}`);
    } catch (error) {
      console.error("Connection test failed", error);
      new Notice(this.toErrorMessage(error));
    }
  }

  private async summarizeCurrentNote(): Promise<void> {
    const context = await this.getActiveNoteContext();
    if (!context) {
      return;
    }

    const modal = new LiveGenerationModal(this.app, {
      commitLabel: "Insert at cursor",
      helperText:
        "This panel streams the model output as it arrives. Only the formal answer will be inserted into the editor when you click the button below.",
      onCommit: async (value) => {
        const currentView = this.app.workspace.getActiveViewOfType(MarkdownView);
        const editor = currentView?.editor;
        if (!editor) {
          throw new Error("Could not find an active editor to insert into.");
        }

        editor.replaceSelection(`${value}\n`);
        new Notice("Summary inserted at cursor.");
      },
      title: `Summary task: ${context.file.basename}`,
    });
    modal.open();

    const progress = this.beginOperation(`Generating summary for "${context.file.basename}"...`);
    const bridge = this.createBridge(modal, progress);

    try {
      await this.generateSummary(context.file, context.content, bridge);
      const message = `Summary ready for "${context.file.basename}". Review the live panel and click "Insert at cursor" if you want to use the final answer.`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
      }
    } catch (error) {
      console.error("Failed to summarize current note", error);
      const message = this.isAbortError(error)
        ? `Summary canceled for "${context.file.basename}".`
        : `Summary failed for "${context.file.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }

  private async summarizeSelection(editor: Editor): Promise<void> {
    const selection = editor.getSelection().trim();
    if (!selection) {
      new Notice("Select some text first.");
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("Open a Markdown note first.");
      return;
    }

    const insertPosition = editor.getCursor("to");
    const modal = new LiveGenerationModal(this.app, {
      commitLabel: "Insert below selection",
      helperText:
        "This panel streams the model output as it arrives. Only the formal answer will be inserted after the selected text when you click the button below.",
      onCommit: async (value) => {
        editor.replaceRange(`\n\n${value}\n`, insertPosition);
        new Notice("Summary inserted below selection.");
      },
      title: `Selection summary task: ${activeFile.basename}`,
    });
    modal.open();

    const progress = this.beginOperation(`Generating selection summary for "${activeFile.basename}"...`);
    const bridge = this.createBridge(modal, progress);

    try {
      await this.generateSummary(activeFile, selection, bridge);
      const message =
        `Selection summary ready for "${activeFile.basename}". Review the live panel and click "Insert below selection" if you want to use the final answer.`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
      }
    } catch (error) {
      console.error("Failed to summarize selection", error);
      const message = this.isAbortError(error)
        ? `Selection summary canceled for "${activeFile.basename}".`
        : `Selection summary failed for "${activeFile.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }

  private async generateDescriptionForCurrentNote(): Promise<void> {
    const context = await this.getActiveNoteContext();
    if (!context) {
      return;
    }

    const modal = new LiveGenerationModal(this.app, {
      commitLabel: "Save to frontmatter description",
      helperText: `This panel streams the model output as it arrives. Only the formal answer will be saved into the YAML frontmatter field "description" of "${context.file.path}" when you click the button below.`,
      onCommit: async (value) => {
        const existing = this.getExistingDescription(context.file);
        if (existing && !this.settings.overwriteDescription) {
          throw new Error("This note already has a description. Enable overwrite in settings to replace it.");
        }

        await this.app.fileManager.processFrontMatter(context.file, (frontmatter) => {
          frontmatter.description = value.trim();
        });

        new Notice(`Saved to frontmatter.description in "${context.file.path}".`);
      },
      title: `Description task: ${context.file.basename}`,
    });
    modal.open();

    const progress = this.beginOperation(`Generating description for "${context.file.basename}"...`);
    const bridge = this.createBridge(modal, progress);

    try {
      await this.requestCompletion(
        this.renderPrompt(this.settings.descriptionPrompt, context.file, this.limitInput(context.content)),
        bridge,
        `Generating description for "${context.file.basename}"...`,
      );
      const message = `Description ready for "${context.file.basename}". Review the live panel and click "Save to frontmatter description" if you want to write the final answer.`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
      }
    } catch (error) {
      console.error("Failed to generate description", error);
      const message = this.isAbortError(error)
        ? `Description canceled for "${context.file.basename}".`
        : `Description failed for "${context.file.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }

  private async reviewCurrentNote(): Promise<void> {
    const context = await this.getActiveNoteContext(false);
    if (!context) {
      return;
    }

    if (context.content.length > this.settings.maxInputChars) {
      new Notice(
        `AI review currently requires the full note in one request. Current note length is ${context.content.length} characters, limit is ${this.settings.maxInputChars}.`,
        8000,
      );
      return;
    }

    const originalContent = context.content;
    const modal = new LiveGenerationModal(this.app, {
      helperText:
        "This panel streams the AI's revised full note. When generation finishes, the plugin will open a unified diff preview so you can approve the exact line changes before anything is applied.",
      title: `AI review task: ${context.file.basename}`,
    });
    modal.open();

    const progress = this.beginOperation(`Reviewing "${context.file.basename}" with AI...`);
    const bridge = this.createBridge(modal, progress);

    try {
      const result = await this.requestCompletion(
        this.renderPrompt(this.settings.reviewPrompt, context.file, originalContent),
        bridge,
        `Reviewing "${context.file.basename}" and drafting a revised note...`,
      );

      const revisedContent = this.extractReviewContent(result.answer);
      const diffText = this.createReviewDiff(context.file, originalContent, revisedContent);

      if (!this.hasMeaningfulDiff(diffText)) {
        const message = `AI review finished for "${context.file.basename}". No wording fixes were suggested.`;
        progress.complete(message);
        if (!modal.isClosed()) {
          modal.updateContent({
            answer: "No wording fixes were suggested for the current note.",
            rawAnswer: result.rawAnswer,
            thinking: result.thinking,
          });
          modal.markComplete(message);
        }
        return;
      }

      const message = `AI review finished for "${context.file.basename}". Opening diff preview...`;
      progress.complete(message);
      if (!modal.isClosed()) {
        modal.markComplete(message);
        modal.close();
      }

      new ReviewDiffModal(this.app, {
        diffText,
        file: context.file,
        onApply: async () => {
          const latestContent = await this.app.vault.read(context.file);
          if (latestContent !== originalContent) {
            throw new Error("The note changed after the review was generated. Please run AI review again.");
          }

          const patched = applyPatch(latestContent, diffText);
          if (patched === false) {
            throw new Error("Could not apply the generated diff to the current note.");
          }

          await this.app.vault.modify(context.file, patched);
          new Notice(`Applied AI review changes to "${context.file.path}".`);
        },
      }).open();
    } catch (error) {
      console.error("Failed to review current note", error);
      const message = this.isAbortError(error)
        ? `AI review canceled for "${context.file.basename}".`
        : `AI review failed for "${context.file.basename}": ${this.toErrorMessage(error)}`;
      progress.fail(message);
      if (!modal.isClosed()) {
        if (this.isAbortError(error)) {
          modal.markCanceled(message);
        } else {
          modal.markError(message);
        }
      }
    }
  }

  private getExistingDescription(file: TFile): string | null {
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    const description = frontmatter?.description;
    return typeof description === "string" ? description : null;
  }

  private async generateSummary(file: TFile, content: string, progress: GenerationBridge): Promise<CompletionResult> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      throw new Error("There is no content to summarize.");
    }

    if (normalizedContent.length <= this.settings.maxInputChars) {
      return await this.requestCompletion(
        this.renderPrompt(this.settings.summaryPrompt, file, normalizedContent),
        progress,
        `Generating summary for "${file.basename}" in a single request...`,
      );
    }

    const chunks = this.chunkContentByParagraphs(normalizedContent, this.settings.maxInputChars);
    if (chunks.length <= 1) {
      return await this.requestCompletion(
        this.renderPrompt(this.settings.summaryPrompt, file, normalizedContent),
        progress,
        `Generating summary for "${file.basename}" in a single request...`,
      );
    }

    let cumulativeSummary = "";
    let lastResult: CompletionResult = {
      answer: "",
      rawAnswer: "",
      thinking: "",
    };
    for (const [index, chunk] of chunks.entries()) {
      console.info(`OpenAI Summary Helper: summarizing chunk ${index + 1}/${chunks.length}`);

      lastResult = await this.requestCompletion(
        this.renderPrompt(this.settings.rollingSummaryPrompt, file, chunk, {
          chunk_index: String(index + 1),
          chunk_total: String(chunks.length),
          previous_summary: cumulativeSummary
            ? this.limitCarryoverSummary(cumulativeSummary)
            : "（无，这是第一段，请直接从当前段开始建立累计摘要。）",
        }),
        progress,
        `Summarizing "${file.basename}" chunk ${index + 1}/${chunks.length}...`,
      );
      cumulativeSummary = lastResult.answer;
    }

    return {
      ...lastResult,
      answer: cumulativeSummary,
      rawAnswer: cumulativeSummary,
    };
  }

  private async getActiveNoteContext(stripFrontmatter = true): Promise<{ content: string; file: TFile } | null> {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    const file = view?.file;

    if (!file) {
      new Notice("Open a Markdown note first.");
      return null;
    }

    const raw = await this.app.vault.read(file);
    const content = stripFrontmatter ? this.stripFrontmatter(raw).trim() : raw;

    if (!content.trim()) {
      new Notice("The current note is empty.");
      return null;
    }

    return { content, file };
  }

  private stripFrontmatter(content: string): string {
    if (!content.startsWith("---\n")) {
      return content;
    }

    const closingIndex = content.indexOf("\n---\n", 4);
    if (closingIndex === -1) {
      return content;
    }

    return content.slice(closingIndex + 5);
  }

  private chunkContentByParagraphs(content: string, targetChars: number): string[] {
    const safeTargetChars = Math.max(MIN_CHUNK_SIZE, targetChars);
    const blocks = this.extractParagraphBlocks(content);
    const chunks: string[] = [];
    let currentChunkParts: string[] = [];
    let currentChunkLength = 0;

    for (const block of blocks) {
      const blockParts = block.length > safeTargetChars ? this.splitOversizedBlock(block, safeTargetChars) : [block];

      for (const part of blockParts) {
        const separatorLength = currentChunkParts.length > 0 ? 2 : 0;
        const nextLength = currentChunkLength + separatorLength + part.length;

        if (currentChunkParts.length > 0 && nextLength > safeTargetChars) {
          chunks.push(currentChunkParts.join("\n\n").trim());
          currentChunkParts = [part];
          currentChunkLength = part.length;
          continue;
        }

        currentChunkParts.push(part);
        currentChunkLength = nextLength;
      }
    }

    if (currentChunkParts.length > 0) {
      chunks.push(currentChunkParts.join("\n\n").trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }

  private extractParagraphBlocks(content: string): string[] {
    const lines = content.split(/\r?\n/);
    const blocks: string[] = [];
    let currentBlock: string[] = [];
    let inFenceBlock = false;
    let fenceMarker = "";

    const flushCurrentBlock = (): void => {
      const block = currentBlock.join("\n").trim();
      if (block) {
        blocks.push(block);
      }
      currentBlock = [];
    };

    for (const line of lines) {
      const trimmedLine = line.trim();
      const fenceMatch = trimmedLine.match(/^(```+|~~~+)/);

      if (!inFenceBlock && trimmedLine === "") {
        flushCurrentBlock();
        continue;
      }

      currentBlock.push(line);

      if (!fenceMatch) {
        continue;
      }

      const marker = fenceMatch[1];
      if (!inFenceBlock) {
        inFenceBlock = true;
        fenceMarker = marker[0];
        continue;
      }

      if (marker[0] === fenceMarker) {
        inFenceBlock = false;
        fenceMarker = "";
      }
    }

    flushCurrentBlock();
    return blocks.length > 0 ? blocks : [content.trim()];
  }

  private splitOversizedBlock(block: string, targetChars: number): string[] {
    const parts: string[] = [];
    let remaining = block.trim();

    while (remaining.length > targetChars) {
      const splitIndex = this.findSplitIndex(remaining, targetChars);
      parts.push(remaining.slice(0, splitIndex).trim());
      remaining = remaining.slice(splitIndex).trim();
    }

    if (remaining) {
      parts.push(remaining);
    }

    return parts;
  }

  private findSplitIndex(content: string, targetChars: number): number {
    const minIndex = Math.max(Math.floor(targetChars * 0.7), MIN_CHUNK_SIZE);
    const maxIndex = Math.min(content.length, targetChars + Math.max(600, Math.floor(targetChars * 0.15)));
    const naturalBreaks = ["\n\n", "\n", "。", "！", "？", "；", ". ", "! ", "? ", "; "];

    for (const marker of naturalBreaks) {
      const forwardIndex = content.indexOf(marker, targetChars);
      if (forwardIndex !== -1 && forwardIndex <= maxIndex) {
        return forwardIndex + marker.length;
      }
    }

    for (const marker of naturalBreaks) {
      const backwardIndex = content.lastIndexOf(marker, targetChars);
      if (backwardIndex !== -1 && backwardIndex >= minIndex) {
        return backwardIndex + marker.length;
      }
    }

    return targetChars;
  }

  private limitCarryoverSummary(summary: string): string {
    const dynamicLimit = Math.min(MAX_CARRYOVER_CHARS, Math.max(800, Math.floor(this.settings.maxInputChars / 3)));
    if (summary.length <= dynamicLimit) {
      return summary;
    }

    return `${summary.slice(0, dynamicLimit).trim()}\n\n[累计摘要已截断，以控制上下文长度]`;
  }

  private limitInput(content: string): string {
    const trimmed = content.trim();
    if (trimmed.length <= this.settings.maxInputChars) {
      return trimmed;
    }

    return `${trimmed.slice(0, this.settings.maxInputChars)}\n\n[Content truncated for summary]`;
  }

  private extractReviewContent(answer: string): string {
    const normalized = answer.replace(/\r\n/g, "\n").trim();
    const fencedBlock = normalized.match(/^```(?:markdown|md)?\n([\s\S]*?)\n```$/i);
    if (fencedBlock) {
      return fencedBlock[1];
    }

    const genericFence = [...normalized.matchAll(/```(?:markdown|md)?\n([\s\S]*?)\n```/gi)];
    if (genericFence.length === 1) {
      return genericFence[0][1];
    }

    return normalized;
  }

  private createReviewDiff(file: TFile, originalContent: string, revisedContent: string): string {
    return createTwoFilesPatch(
      file.path,
      file.path,
      originalContent,
      revisedContent,
      "original",
      "reviewed",
      {
        context: REVIEW_DIFF_CONTEXT_LINES,
      },
    );
  }

  private hasMeaningfulDiff(diffText: string): boolean {
    return diffText
      .split("\n")
      .some((line) => (line.startsWith("+") && !line.startsWith("+++")) || (line.startsWith("-") && !line.startsWith("---")));
  }

  private renderPrompt(
    template: string,
    file: TFile,
    content: string,
    extraTokens: Record<string, string> = {},
  ): string {
    const tokens: Record<string, string> = {
      title: file.basename,
      path: file.path,
      content,
      ...extraTokens,
    };

    let rendered = template;
    for (const [token, value] of Object.entries(tokens)) {
      rendered = this.replaceToken(rendered, `{{${token}}}`, value);
    }

    return rendered;
  }

  private replaceToken(template: string, token: string, value: string): string {
    return template.split(token).join(value);
  }

  private async requestCompletion(
    prompt: string,
    progress?: GenerationBridge,
    statusMessage = "Generating response...",
  ): Promise<CompletionResult> {
    const baseUrl = this.settings.baseUrl.trim().replace(/\/$/, "");
    const apiKey = this.settings.apiKey.trim();
    const model = this.settings.model.trim();

    if (!baseUrl) {
      throw new Error("Set the Base URL in plugin settings.");
    }

    if (!apiKey) {
      throw new Error("Set the API key in plugin settings.");
    }

    if (!model) {
      throw new Error("Set the model name in plugin settings.");
    }

    const payload = {
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a precise writing assistant. Follow the user request faithfully and avoid adding facts not grounded in the provided note.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
    };

    progress?.beginStep(statusMessage);

    if (Platform.isDesktopApp && typeof require === "function") {
      return await this.streamChatCompletion(`${baseUrl}/chat/completions`, apiKey, payload, progress, statusMessage);
    }

    progress?.updateStatus(`${statusMessage} Streaming is not available here, waiting for the full response...`);

    const response = await requestUrl({
      url: `${baseUrl}/chat/completions`,
      method: "POST",
      contentType: "application/json",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.status < 200 || response.status >= 300) {
      const apiMessage = this.extractApiError(response.json) ?? response.text;
      throw new Error(`API request failed (${response.status}): ${apiMessage}`);
    }

    const result = this.extractCompletionResult(response.json);
    if (!result.answer) {
      throw new Error("The API returned an empty response.");
    }

    progress?.updateContent(result);
    return result;
  }

  private extractApiError(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    const error = (payload as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }

    return null;
  }

  private async streamChatCompletion(
    urlString: string,
    apiKey: string,
    payload: Record<string, unknown>,
    progress?: GenerationBridge,
    statusMessage = "Generating response...",
  ): Promise<CompletionResult> {
    const url = new URL(urlString);
    const transport = url.protocol === "https:" ? require("node:https") : require("node:http");

    return await new Promise<CompletionResult>((resolve, reject) => {
      let settled = false;
      let rawAnswer = "";
      let rawThinking = "";
      let buffer = "";
      let sawStreamEvent = false;

      const finish = (handler: () => void): void => {
        if (settled) {
          return;
        }

        settled = true;
        handler();
      };

      const applyEventBlock = (rawEvent: string): void => {
        const data = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");

        if (!data || data === "[DONE]") {
          return;
        }

        sawStreamEvent = true;

        const eventPayload = JSON.parse(data);
        const delta = this.extractCompletionDelta(eventPayload);
        rawAnswer += delta.answer;
        rawThinking += delta.thinking;

        const liveResult = this.normalizeCompletionResult(rawAnswer, rawThinking);
        progress?.updateContent(liveResult);
        progress?.updateStatus(statusMessage);
      };

      const request = transport.request(
        {
          hostname: url.hostname,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          path: `${url.pathname}${url.search}`,
          port: url.port || undefined,
          protocol: url.protocol,
        },
        (response: {
          on: (event: string, listener: (...args: unknown[]) => void) => void;
          setEncoding: (encoding: string) => void;
          statusCode?: number;
        }) => {
          const statusCode = response.statusCode ?? 0;
          response.setEncoding("utf8");

          if (statusCode < 200 || statusCode >= 300) {
            let errorBuffer = "";
            response.on("data", (chunk: unknown) => {
              errorBuffer += String(chunk);
            });
            response.on("end", () => {
              finish(() => {
                reject(
                  new Error(
                    `API request failed (${statusCode}): ${this.extractApiErrorFromText(errorBuffer) ?? "Unknown error"}`,
                  ),
                );
              });
            });
            return;
          }

          progress?.updateStatus(`${statusMessage} Connected. Waiting for tokens...`);

          response.on("data", (chunk: unknown) => {
            buffer += String(chunk);
            buffer = buffer.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

            let separatorIndex = buffer.indexOf("\n\n");
            while (separatorIndex !== -1) {
              const rawEvent = buffer.slice(0, separatorIndex).trim();
              buffer = buffer.slice(separatorIndex + 2);
              separatorIndex = buffer.indexOf("\n\n");

              if (!rawEvent) {
                continue;
              }

              try {
                applyEventBlock(rawEvent);
              } catch (error) {
                finish(() => {
                  reject(
                    new Error(
                      error instanceof Error
                        ? `Could not parse streaming response: ${error.message}`
                        : "Could not parse streaming response.",
                    ),
                  );
                });
                return;
              }
            }
          });

          response.on("end", () => {
            finish(() => {
              const remaining = buffer.trim();
              if (remaining.startsWith("data:")) {
                try {
                  applyEventBlock(remaining);
                } catch (error) {
                  reject(
                    new Error(
                      error instanceof Error
                        ? `Could not parse trailing streaming response: ${error.message}`
                        : "Could not parse trailing streaming response.",
                    ),
                  );
                  return;
                }
              }

              if (remaining && !sawStreamEvent) {
                try {
                  const payload = JSON.parse(remaining);
                  const result = this.extractCompletionResult(payload);
                  progress?.updateContent(result);
                  resolve(result);
                  return;
                } catch (error) {
                  reject(
                    new Error(
                      error instanceof Error
                        ? `Could not parse response body: ${error.message}`
                        : "Could not parse response body.",
                    ),
                  );
                  return;
                }
              }

              const result = this.normalizeCompletionResult(rawAnswer, rawThinking);
              if (!result.answer) {
                reject(new Error("The API returned an empty formal answer."));
                return;
              }

              progress?.updateContent(result);
              resolve(result);
            });
          });
        },
      );

      request.on("error", (error: Error) => {
        finish(() => {
          reject(error);
        });
      });

      if (progress?.signal.aborted) {
        request.destroy(new Error("Request canceled."));
        return;
      }

      progress?.signal.addEventListener(
        "abort",
        () => {
          request.destroy(new Error("Request canceled."));
        },
        { once: true },
      );

      request.write(JSON.stringify({ ...payload, stream: true }));
      request.end();
    });
  }

  private extractCompletionDelta(payload: unknown): { answer: string; thinking: string } {
    if (!payload || typeof payload !== "object") {
      return { answer: "", thinking: "" };
    }

    const choice = (payload as { choices?: unknown[] }).choices?.[0];
    if (!choice || typeof choice !== "object") {
      return { answer: "", thinking: "" };
    }

    const delta = (choice as { delta?: unknown; message?: unknown }).delta ?? (choice as { message?: unknown }).message;
    return this.extractSegments(delta);
  }

  private extractCompletionResult(payload: unknown): CompletionResult {
    if (!payload || typeof payload !== "object") {
      return this.normalizeCompletionResult("", "");
    }

    const choice = (payload as { choices?: unknown[] }).choices?.[0];
    if (choice && typeof choice === "object") {
      const node = (choice as { message?: unknown; delta?: unknown }).message ?? (choice as { delta?: unknown }).delta;
      const segments = this.extractSegments(node);
      return this.normalizeCompletionResult(segments.answer, segments.thinking);
    }

    return this.normalizeCompletionResult("", "");
  }

  private extractSegments(node: unknown): { answer: string; thinking: string } {
    if (!node || typeof node !== "object") {
      return { answer: "", thinking: "" };
    }

    const record = node as Record<string, unknown>;
    const contentSegments = this.extractSegmentsFromContent(record.content);

    let answer = contentSegments.answer;
    let thinking = contentSegments.thinking;

    thinking += this.extractTextValue(record.reasoning_content);
    thinking += this.extractTextValue(record.reasoning);
    thinking += this.extractTextValue(record.thinking);

    if (!record.content && typeof record.text === "string") {
      answer += record.text;
    }

    return { answer, thinking };
  }

  private extractSegmentsFromContent(content: unknown): { answer: string; thinking: string } {
    if (typeof content === "string") {
      return { answer: content, thinking: "" };
    }

    if (Array.isArray(content)) {
      return content.reduce(
        (accumulator, item) => {
          const next = this.extractSegmentsFromContent(item);
          return {
            answer: accumulator.answer + next.answer,
            thinking: accumulator.thinking + next.thinking,
          };
        },
        { answer: "", thinking: "" },
      );
    }

    if (!content || typeof content !== "object") {
      return { answer: "", thinking: "" };
    }

    const record = content as Record<string, unknown>;
    const type = typeof record.type === "string" ? record.type.toLowerCase() : "";
    const text = this.extractTextValue(record.text) || this.extractTextValue(record.content);
    const reasoning = this.extractTextValue(record.reasoning_content) || this.extractTextValue(record.reasoning);

    if (type.includes("reason") || type.includes("think")) {
      return {
        answer: "",
        thinking: text || reasoning,
      };
    }

    return {
      answer: text,
      thinking: reasoning,
    };
  }

  private extractTextValue(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.extractTextValue(item)).join("");
    }

    if (!value || typeof value !== "object") {
      return "";
    }

    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") {
      return record.text;
    }

    if (typeof record.content === "string") {
      return record.content;
    }

    return "";
  }

  private normalizeCompletionResult(rawAnswer: string, rawThinking: string): CompletionResult {
    const split = this.splitThinkContent(rawAnswer);
    return {
      answer: split.answer.trim(),
      rawAnswer: rawAnswer.trim(),
      thinking: this.mergeThinking(rawThinking, split.thinking).trim(),
    };
  }

  private splitThinkContent(text: string): { answer: string; thinking: string } {
    if (!text.includes("<think>")) {
      return {
        answer: text,
        thinking: "",
      };
    }

    let answer = "";
    let cursor = 0;
    const thinkingParts: string[] = [];

    while (cursor < text.length) {
      const openIndex = text.indexOf("<think>", cursor);
      if (openIndex === -1) {
        answer += text.slice(cursor);
        break;
      }

      answer += text.slice(cursor, openIndex);
      const closeIndex = text.indexOf("</think>", openIndex + 7);
      if (closeIndex === -1) {
        thinkingParts.push(text.slice(openIndex + 7));
        break;
      }

      thinkingParts.push(text.slice(openIndex + 7, closeIndex));
      cursor = closeIndex + 8;
    }

    return {
      answer: answer.replace(/<\/?think>/g, ""),
      thinking: thinkingParts.join("\n\n"),
    };
  }

  private mergeThinking(primary: string, secondary: string): string {
    const normalizedPrimary = primary.trim();
    const normalizedSecondary = secondary.trim();

    if (!normalizedPrimary) {
      return normalizedSecondary;
    }

    if (!normalizedSecondary) {
      return normalizedPrimary;
    }

    if (normalizedPrimary.includes(normalizedSecondary)) {
      return normalizedPrimary;
    }

    if (normalizedSecondary.includes(normalizedPrimary)) {
      return normalizedSecondary;
    }

    return `${normalizedPrimary}\n\n${normalizedSecondary}`;
  }

  private extractApiErrorFromText(text: string): string | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    try {
      return this.extractApiError(JSON.parse(trimmed)) ?? trimmed;
    } catch {
      return trimmed;
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return "Something went wrong. Check the console for details.";
  }

  private createBridge(modal: LiveGenerationModal, operation: OperationHandle): GenerationBridge {
    return {
      beginStep: (message: string) => {
        operation.update(message);
        if (!modal.isClosed()) {
          modal.beginStep(message);
        }
      },
      signal: modal.signal,
      updateContent: (result: CompletionResult) => {
        if (!modal.isClosed()) {
          modal.updateContent(result);
        }
      },
      updateStatus: (message: string) => {
        operation.update(message);
        if (!modal.isClosed()) {
          modal.updateStatus(message);
        }
      },
    };
  }

  private isAbortError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }

    if (error instanceof Error) {
      return /abort|cancel/i.test(error.message);
    }

    return false;
  }

  private beginOperation(initialMessage: string): OperationHandle {
    const token = ++this.currentOperationToken;
    const notice = new Notice(initialMessage, 0);
    this.setOperationMessage(token, initialMessage);

    return {
      update: (message: string) => {
        notice.setMessage(message);
        this.setOperationMessage(token, message);
      },
      complete: (message: string) => {
        notice.setMessage(message);
        this.setOperationMessage(token, message);
        window.setTimeout(() => {
          notice.hide();
          this.clearOperationMessage(token);
        }, 5000);
      },
      fail: (message: string) => {
        notice.setMessage(message);
        this.setOperationMessage(token, message);
        window.setTimeout(() => {
          notice.hide();
          this.clearOperationMessage(token);
        }, 8000);
      },
    };
  }

  private setOperationMessage(token: number, message: string): void {
    if (token !== this.currentOperationToken || !this.statusBarEl) {
      return;
    }

    this.statusBarEl.setText(message);
  }

  private clearOperationMessage(token: number): void {
    if (token !== this.currentOperationToken) {
      return;
    }

    this.setIdleStatus();
  }

  private setIdleStatus(): void {
    this.statusBarEl?.setText("Obsidian AI Helper: idle");
  }

  supportsSecureStorage(): boolean {
    return requireApiVersion("1.11.4");
  }
}

interface OperationHandle {
  complete(message: string): void;
  fail(message: string): void;
  update(message: string): void;
}

class OpenAISummarySettingTab extends PluginSettingTab {
  plugin: OpenAISummaryHelperPlugin;

  constructor(app: App, plugin: OpenAISummaryHelperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Obsidian AI Helper" });

    new Setting(containerEl)
      .setName("Base URL")
      .setDesc("Use a base URL that already includes /v1, for example https://api.openai.com/v1")
      .addText((text) => {
        text
          .setPlaceholder("https://api.openai.com/v1")
          .setValue(this.plugin.settings.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.baseUrl = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = "24rem";
      });

    new Setting(containerEl)
      .setName("API key")
      .setDesc(
        this.plugin.supportsSecureStorage()
          ? "Stored in Obsidian secret storage."
          : "Stored in this plugin's data.json because this Obsidian build does not support secret storage.",
      )
      .addText((text) => {
        text
          .setPlaceholder("sk-...")
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
        text.inputEl.style.width = "24rem";
      });

    new Setting(containerEl)
      .setName("Model")
      .setDesc("Any model name supported by your OpenAI-compatible endpoint.")
      .addText((text) => {
        text
          .setPlaceholder("gpt-4.1-mini")
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim();
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Summary chunk target characters")
      .setDesc(
        "Approximate character target for a single summary chunk. Long notes are split near natural paragraph boundaries around this size; the description command still truncates at this limit.",
      )
      .addText((text) => {
        text
          .setPlaceholder("24000")
          .setValue(String(this.plugin.settings.maxInputChars))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed) || parsed < 1000) {
              return;
            }

            this.plugin.settings.maxInputChars = parsed;
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "number";
      });

    new Setting(containerEl)
      .setName("Overwrite existing description")
      .setDesc("Allow the Generate description command to replace an existing frontmatter description.")
      .addToggle((toggle) => {
        toggle
          .setValue(this.plugin.settings.overwriteDescription)
          .onChange(async (value) => {
            this.plugin.settings.overwriteDescription = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName("Summary prompt template")
      .setDesc("Available placeholders: {{title}}, {{path}}, {{content}}")
      .addTextArea((textArea) => {
        textArea
          .setValue(this.plugin.settings.summaryPrompt)
          .onChange(async (value) => {
            this.plugin.settings.summaryPrompt = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.rows = 10;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("Rolling summary prompt template")
      .setDesc(
        "Available placeholders: {{title}}, {{path}}, {{content}}, {{chunk_index}}, {{chunk_total}}, {{previous_summary}}",
      )
      .addTextArea((textArea) => {
        textArea
          .setValue(this.plugin.settings.rollingSummaryPrompt)
          .onChange(async (value) => {
            this.plugin.settings.rollingSummaryPrompt = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.rows = 12;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("Description prompt template")
      .setDesc("Available placeholders: {{title}}, {{path}}, {{content}}")
      .addTextArea((textArea) => {
        textArea
          .setValue(this.plugin.settings.descriptionPrompt)
          .onChange(async (value) => {
            this.plugin.settings.descriptionPrompt = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.rows = 10;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("AI review prompt template")
      .setDesc("Available placeholders: {{title}}, {{path}}, {{content}}")
      .addTextArea((textArea) => {
        textArea
          .setValue(this.plugin.settings.reviewPrompt)
          .onChange(async (value) => {
            this.plugin.settings.reviewPrompt = value;
            await this.plugin.saveSettings();
          });
        textArea.inputEl.rows = 12;
        textArea.inputEl.style.width = "100%";
      });

    new Setting(containerEl)
      .setName("Test connection")
      .setDesc("Send a lightweight request to confirm your endpoint, API key, and model.")
      .addButton((button) => {
        button.setButtonText("Test").setCta().onClick(async () => {
          await this.plugin.testConnection();
        });
      });
  }
}
