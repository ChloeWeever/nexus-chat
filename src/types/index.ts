export type Role = 'user' | 'assistant' | 'system'

export type CardType =
  | 'bar_chart'
  | 'line_chart'
  | 'pie_chart'
  | 'area_chart'
  | 'table'
  | 'metric'
  | 'progress'

export interface Dataset {
  label: string
  data: number[]
  color?: string
}

export interface BarChartData {
  labels: string[]
  datasets: Dataset[]
  horizontal?: boolean
}

export interface LineChartData {
  labels: string[]
  datasets: Dataset[]
}

export interface AreaChartData {
  labels: string[]
  datasets: Dataset[]
}

export interface PieChartData {
  data: { name: string; value: number; color?: string }[]
  donut?: boolean
}

export interface TableColumn {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
}

export interface TableData {
  columns: TableColumn[]
  rows: Record<string, unknown>[]
}

export interface MetricItem {
  label: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: string
}

export interface MetricData {
  metrics: MetricItem[]
}

export interface ProgressItem {
  label: string
  value: number
  max?: number
  color?: string
}

export interface ProgressData {
  items: ProgressItem[]
}

export type CardData =
  | BarChartData
  | LineChartData
  | AreaChartData
  | PieChartData
  | TableData
  | MetricData
  | ProgressData

export interface CardBlock {
  type: 'card'
  cardType: CardType
  title?: string
  data: CardData
}

export interface TextBlock {
  type: 'text'
  content: string
}

export type ContentBlock = TextBlock | CardBlock

export interface ToolUseInfo {
  toolCallId: string
  toolName: string      // function name, e.g. "web_search"
  label: string         // primary display text shown in the badge
  sublabel?: string     // secondary info, e.g. "5 results"
  error?: string
  isPending?: boolean
}

export interface Skill {
  id: string
  name: string                    // kebab-case command name, e.g. "summarize"
  description: string             // shown in autocomplete and injected into system context
  argumentHint?: string           // hint text shown after user types /name (space)
  disableModelInvocation: boolean // if true, model cannot auto-invoke; user must type /name
  userInvocable: boolean          // if true, appears in the / command menu
  allowedTools?: string[]
  instructions: string            // SKILL.md body — the prompt injected as system context
  enabled: boolean
  builtIn: boolean
}

export interface MessageAttachment {
  name: string
  type: 'text' | 'image'
  dataUrl?: string  // base64 data URL for images (used for inline display)
}

export interface Message {
  id: string
  role: Role
  content: string
  blocks?: ContentBlock[]
  toolUse?: ToolUseInfo[]
  skillUsed?: string          // skill name when message was sent via /skill-name command
  statusText?: string         // transient: "Thinking…", cleared on first content
  isStreaming?: boolean
  error?: string
  attachments?: MessageAttachment[]
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface LiteLLMConfig {
  baseUrl: string
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}

export interface AppearanceConfig {
  theme: 'light' | 'dark' | 'system'
}

export interface ChatConfig {
  systemPrompt: string
  streamingEnabled: boolean
  webSearchEnabled: boolean
  ollamaApiKey: string
}

export interface AppSettings {
  litellm: LiteLLMConfig
  appearance: AppearanceConfig
  chat: ChatConfig
}

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful and knowledgeable AI assistant.

You can render rich UI cards in your responses to visualize data. Use the following XML syntax:

## Bar Chart
<card type="bar_chart" title="Title">
{"labels":["A","B","C"],"datasets":[{"label":"Series","data":[10,20,30],"color":"#6366f1"}]}
</card>

## Line Chart
<card type="line_chart" title="Trend">
{"labels":["Jan","Feb","Mar"],"datasets":[{"label":"Value","data":[10,25,15],"color":"#8b5cf6"}]}
</card>

## Area Chart
<card type="area_chart" title="Growth">
{"labels":["Q1","Q2","Q3","Q4"],"datasets":[{"label":"Revenue","data":[100,150,120,200]}]}
</card>

## Pie / Donut Chart
<card type="pie_chart" title="Distribution">
{"data":[{"name":"Category A","value":40},{"name":"Category B","value":35},{"name":"Category C","value":25}],"donut":true}
</card>

## Data Table
<card type="table" title="Data">
{"columns":[{"key":"name","label":"Name"},{"key":"value","label":"Value"},{"key":"change","label":"Change"}],"rows":[{"name":"Item A","value":1200,"change":"+5%"}]}
</card>

## Key Metrics
<card type="metric">
{"metrics":[{"label":"Total Users","value":"12,450","change":"+12%","trend":"up"},{"label":"Revenue","value":"$45.2K","change":"-3%","trend":"down"}]}
</card>

## Progress Bars
<card type="progress" title="Project Status">
{"items":[{"label":"Frontend","value":85},{"label":"Backend","value":60},{"label":"Testing","value":40}]}
</card>

Use cards when the user asks for data visualization, comparisons, statistics, or tabular data. Always use valid JSON inside card tags.`

export const DEFAULT_SETTINGS: AppSettings = {
  litellm: {
    baseUrl: 'http://localhost:4000',
    apiKey: '',
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.7
  },
  appearance: {
    theme: 'dark'
  },
  chat: {
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    streamingEnabled: true,
    webSearchEnabled: false,
    ollamaApiKey: ''
  }
}
