<div align="center">
  <img src="src/assets/icon.svg" alt="Nexus Chat" width="96" />
  <h1>Nexus Chat</h1>
  <p>AI chat desktop app with rich data visualization and tool use</p>
  <p>
    <a href="LICENSE">GPL-3.0 License</a>
    · Copyright (c) 2026 ChloeWeever
  </p>
</div>

---

## Features

- **Desktop pet** — pick an animated companion from the [Petdex](https://petdex.crafter.run) gallery (1400+ pets); the pet lives in the chat area, wanders on its own, and reacts to the AI — reviewing while thinking, running while generating, waving when done
- **Multi-provider** — LiteLLM proxy, OpenAI, or Anthropic; configure base URL, API key, model, temperature, and max tokens per session
- **Rich visualizations** — AI renders bar, line, area, pie/donut charts, data tables, metric cards, and progress bars inline in the conversation using a simple XML card syntax
- **File uploads** — attach images, PDFs, Word documents, Excel sheets, PowerPoint files, and plain text/code files; content is extracted and injected as context
- **Image OCR** — paste or attach an image and the app extracts text via Tesseract.js (English + Simplified Chinese)
- **JavaScript execution** — AI can write and run code in a sandboxed Node.js Worker thread (10 s timeout, no network/filesystem access)
- **Web search** — optional real-time search via the [Ollama Web Search API](https://ollama.com), injected into the AI context
- **Skills** — define reusable instruction sets as SKILL.md files and invoke them with `/skill-name` slash commands; built-in skills include `summarize`, `translate`, `explain`, `improve`, `review`, and `commit`
- **Streaming responses** with a stop button
- **Conversation history** — grouped by date, titles auto-generated from the first message
- **Dark / light / system theme**

## Install & Run

```bash
npm install
npm run dev
```

### Build distributable

```bash
npm run package
```

Output: `dist/` — produces a portable executable on Windows.

## Configuration

Open **Settings** (gear icon, bottom-left):

| Tab | Field | Description |
|---|---|---|
| Provider | Provider | LiteLLM / OpenAI / Anthropic |
| Provider | Base URL | Proxy or API endpoint (leave blank for official API) |
| Provider | API Key | Key for the chosen provider |
| Model | Model | e.g. `gpt-4o-mini`, `claude-sonnet-4-6`, `ollama/llama3` |
| Model | Temperature | 0 = deterministic · 2 = very creative |
| Model | Max Tokens | Response length cap |
| Tools | Web Search | Enable + enter an Ollama API key |
| Tools | Code Execution | Allow AI to run JavaScript snippets |
| Appearance | Theme | Light / Dark / System |
| Appearance | Desktop Pet | Pick from Petdex gallery; toggle wandering on/off |

## Card Syntax

The system prompt teaches the AI to render structured data using XML tags:

```xml
<card type="bar_chart" title="Monthly Revenue">
{"labels":["Jan","Feb","Mar","Apr"],"datasets":[{"label":"Sales","data":[1200,1800,1500,2100]}]}
</card>

<card type="line_chart" title="User Growth">
{"labels":["Week 1","Week 2","Week 3"],"datasets":[{"label":"Users","data":[500,720,1040]}]}
</card>

<card type="metric">
{"metrics":[{"label":"MRR","value":"$45K","change":"+12%","trend":"up"},{"label":"Churn","value":"2.3%","change":"-0.5%","trend":"down"}]}
</card>

<card type="table" title="Comparison">
{"columns":[{"key":"lang","label":"Language"},{"key":"perf","label":"Performance"}],
 "rows":[{"lang":"Rust","perf":"Excellent"},{"lang":"Go","perf":"Very Good"}]}
</card>

<card type="progress" title="Q3 Goals">
{"items":[{"label":"Revenue","value":72},{"label":"Signups","value":55}]}
</card>
```

Supported types: `bar_chart` · `line_chart` · `area_chart` · `pie_chart` · `table` · `metric` · `progress`

## Skills

Skills are markdown files that inject a system-level instruction set into the conversation. Import a `SKILL.md` file from Settings → Skills, then invoke it with `/skill-name [argument]`.

Built-in skills: `summarize` · `translate` · `explain` · `improve` · `review` · `commit`

## Tech Stack

- [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) + [SAP UI5 Web Components](https://sap.github.io/ui5-webcomponents-react/)
- [Recharts](https://recharts.org/) for data visualization
- [Zustand](https://zustand-demo.pmnd.rs/) for state management
- [Tesseract.js](https://tesseract.projectnaptha.com/) for OCR
- [pdf-parse](https://www.npmjs.com/package/pdf-parse) · [mammoth](https://github.com/mwilliamson/mammoth.js) · [xlsx](https://sheetjs.com/) · [jszip](https://stuk.github.io/jszip/) for file parsing
