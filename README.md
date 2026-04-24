# Nexus Chat — Setup

## Install & Run

```bash
cd nexus-chat
npm install
npm run dev
```

## Build distributable

```bash
npm run package
```

## Configure LiteLLM

1. Open Settings (bottom-left gear icon)
2. Enter your LiteLLM **Base URL** (e.g. `http://localhost:4000`)
3. Enter your **API Key** if required
4. Set the **Model** name (e.g. `gpt-4o-mini`, `claude-3-haiku`, `ollama/llama3`)

## Card Syntax (for agents)

The system prompt teaches the AI to render cards using XML tags:

```xml
<card type="bar_chart" title="Revenue">
{"labels":["Jan","Feb","Mar"],"datasets":[{"label":"Sales","data":[1200,1800,1500]}]}
</card>

<card type="metric">
{"metrics":[{"label":"Users","value":"12.4K","change":"+8%","trend":"up"}]}
</card>

<card type="table" title="Comparison">
{"columns":[{"key":"lang","label":"Language"},{"key":"perf","label":"Performance"}],
 "rows":[{"lang":"Rust","perf":"Excellent"},{"lang":"Go","perf":"Very Good"}]}
</card>
```

Supported card types: `bar_chart`, `line_chart`, `area_chart`, `pie_chart`, `table`, `metric`, `progress`
