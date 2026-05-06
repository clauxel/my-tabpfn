export type ColumnKind = 'numeric' | 'categorical' | 'text' | 'date' | 'boolean' | 'empty'
export type TaskSuggestion = 'classification' | 'regression' | 'forecasting'
export type RecommendedPath = 'oss' | 'client' | 'ts' | 'enterprise'

export type SampleDataset = {
  key: 'churn' | 'pricing' | 'forecasting'
  label: string
  csv: string
}

export type ColumnSummary = {
  name: string
  kind: ColumnKind
  nonEmptyCount: number
  uniqueCount: number
  missingRate: number
  sampleValues: string[]
}

export type TargetCandidate = {
  name: string
  kind: ColumnKind
  score: number
  reason: string
}

export type DatasetAnalysis = {
  datasetName: string
  rowCount: number
  columnCount: number
  cellCount: number
  missingRate: number
  numericColumns: number
  categoricalColumns: number
  textColumns: number
  dateColumns: number
  taskSuggestion: TaskSuggestion
  fitScore: number
  fitLabel: string
  recommendedPath: RecommendedPath
  recommendedLabel: string
  recommendedGuidePath: string
  topReasons: string[]
  cautionNotes: string[]
  nextSteps: string[]
  targetCandidates: TargetCandidate[]
  columns: ColumnSummary[]
}

export const sampleDatasets: SampleDataset[] = [
  {
    key: 'churn',
    label: 'Customer churn',
    csv: `account_age,plan_type,monthly_spend,support_tickets,auto_pay,last_login_days,churned
14,basic,29,1,yes,3,no
36,pro,119,2,yes,7,no
9,basic,19,4,no,18,yes
48,team,249,0,yes,2,no
22,pro,89,3,no,15,yes
31,basic,35,1,yes,6,no
18,pro,74,5,no,21,yes
54,team,299,0,yes,1,no`,
  },
  {
    key: 'pricing',
    label: 'Insurance pricing',
    csv: `driver_age,vehicle_age,region,annual_miles,claims_3y,credit_band,premium_usd
24,2,urban,14000,1,B,1480
41,6,suburban,9200,0,A,910
33,8,urban,17200,2,C,1890
52,3,rural,7800,0,A,760
29,1,urban,15300,1,B,1325
46,10,suburban,11000,1,B,1180
38,4,rural,8600,0,A,840
57,7,urban,9800,2,C,1540`,
  },
  {
    key: 'forecasting',
    label: 'Weekly demand',
    csv: `week_start,channel,promo_discount,temperature,units_sold
2025-01-06,online,0,39,842
2025-01-13,online,10,42,891
2025-01-20,online,0,41,855
2025-01-27,online,15,45,936
2025-02-03,online,5,47,904
2025-02-10,online,0,48,878
2025-02-17,online,20,52,981
2025-02-24,online,10,55,944`,
  },
]

export function getSampleDataset(key: SampleDataset['key']) {
  return sampleDatasets.find((sample) => sample.key === key) ?? sampleDatasets[0]
}

export function analyzeDatasetText(text: string, datasetName = 'Uploaded CSV'): DatasetAnalysis {
  const sanitized = text.replace(/^\uFEFF/, '').trim()
  if (!sanitized) {
    throw new Error('Paste a CSV or upload a small sample file to run the fit scan.')
  }

  const delimiter = detectDelimiter(sanitized)
  const parsed = parseDelimitedText(sanitized, delimiter)
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0))

  if (parsed.length < 2) {
    throw new Error('The scanner needs a header row and at least one data row.')
  }

  const headers = parsed[0].map((value, index) => normalizeHeader(value, index))
  const rows = parsed.slice(1).map((row) => normalizeRow(row, headers.length))
  const columnValues = headers.map((_, columnIndex) => rows.map((row) => row[columnIndex] ?? ''))
  const columns = columnValues.map((values, columnIndex) => summarizeColumn(headers[columnIndex], values))

  const rowCount = rows.length
  const columnCount = headers.length
  const cellCount = rowCount * columnCount
  const missingCells = columns.reduce((sum, column) => sum + Math.round(column.missingRate * rowCount), 0)
  const missingRate = cellCount === 0 ? 0 : missingCells / cellCount

  const targetCandidates = inferTargetCandidates(columns)
  const topTarget = targetCandidates[0]

  const dateColumns = columns.filter((column) => column.kind === 'date').length
  const textColumns = columns.filter((column) => column.kind === 'text').length
  const numericColumns = columns.filter((column) => column.kind === 'numeric').length
  const categoricalColumns = columns.filter((column) => column.kind === 'categorical' || column.kind === 'boolean').length

  const taskSuggestion = inferTaskSuggestion(columns, topTarget)
  const recommendedPath = inferRecommendedPath({
    cellCount,
    rowCount,
    columnCount,
    textColumns,
    dateColumns,
    taskSuggestion,
  })
  const fitScore = inferFitScore({
    cellCount,
    rowCount,
    columnCount,
    textColumns,
    dateColumns,
    taskSuggestion,
    topTarget,
  })

  return {
    datasetName,
    rowCount,
    columnCount,
    cellCount,
    missingRate,
    numericColumns,
    categoricalColumns,
    textColumns,
    dateColumns,
    taskSuggestion,
    fitScore,
    fitLabel: fitScore >= 80 ? 'Strong fit' : fitScore >= 62 ? 'Promising fit' : 'Needs a narrower path',
    recommendedPath,
    recommendedLabel: recommendedPathLabel(recommendedPath),
    recommendedGuidePath: recommendedGuidePath(recommendedPath),
    topReasons: buildTopReasons({
      rowCount,
      columnCount,
      textColumns,
      dateColumns,
      taskSuggestion,
      recommendedPath,
      topTarget,
    }),
    cautionNotes: buildCautionNotes({
      cellCount,
      rowCount,
      columnCount,
      columns,
      targetCandidates,
    }),
    nextSteps: buildNextSteps(recommendedPath, taskSuggestion),
    targetCandidates,
    columns,
  }
}

function detectDelimiter(text: string) {
  const firstLines = text
    .split(/\r?\n/)
    .slice(0, 5)
    .filter((line) => line.trim().length > 0)

  const scores = [
    { delimiter: ',', score: 0 },
    { delimiter: ';', score: 0 },
    { delimiter: '\t', score: 0 },
  ]

  for (const line of firstLines) {
    for (const option of scores) {
      option.score += splitLine(line, option.delimiter).length
    }
  }

  scores.sort((left, right) => right.score - left.score)
  return scores[0]?.delimiter ?? ','
}

function parseDelimitedText(text: string, delimiter: string) {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (!inQuotes && char === delimiter) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentCell = ''
      currentRow = []
      continue
    }

    currentCell += char
  }

  currentRow.push(currentCell)
  rows.push(currentRow)
  return rows
}

function splitLine(line: string, delimiter: string) {
  return parseDelimitedText(line, delimiter)[0] ?? []
}

function normalizeHeader(value: string, index: number) {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  return cleaned || `column_${index + 1}`
}

function normalizeRow(row: string[], width: number) {
  const normalized = row.slice(0, width)
  while (normalized.length < width) {
    normalized.push('')
  }
  return normalized
}

function summarizeColumn(name: string, values: string[]): ColumnSummary {
  const nonEmpty = values.filter((value) => value.length > 0)
  const uniqueValues = new Set(nonEmpty.map((value) => value.toLowerCase()))
  const numericRatio = ratioOf(nonEmpty, isNumeric)
  const booleanRatio = ratioOf(nonEmpty, isBooleanLike)
  const dateRatio = ratioOf(nonEmpty, isDateLike)
  const missingRate = values.length === 0 ? 0 : (values.length - nonEmpty.length) / values.length

  let kind: ColumnKind = 'empty'
  if (nonEmpty.length === 0) {
    kind = 'empty'
  } else if (dateRatio >= 0.9) {
    kind = 'date'
  } else if (booleanRatio >= 0.95) {
    kind = 'boolean'
  } else if (numericRatio >= 0.9) {
    kind = 'numeric'
  } else {
    const averageLength = nonEmpty.reduce((sum, value) => sum + value.length, 0) / nonEmpty.length
    const uniqueRatio = uniqueValues.size / nonEmpty.length
    kind = uniqueValues.size <= 30 || uniqueRatio <= 0.45 || averageLength <= 18 ? 'categorical' : 'text'
  }

  return {
    name,
    kind,
    nonEmptyCount: nonEmpty.length,
    uniqueCount: uniqueValues.size,
    missingRate,
    sampleValues: Array.from(uniqueValues).slice(0, 3),
  }
}

function ratioOf(values: string[], predicate: (value: string) => boolean) {
  if (values.length === 0) return 0
  return values.filter(predicate).length / values.length
}

function isNumeric(value: string) {
  if (!value) return false
  const normalized = value.replace(/[$,%\s]/g, '').replace(/,/g, '')
  if (!normalized) return false
  const parsed = Number(normalized)
  return Number.isFinite(parsed)
}

function isBooleanLike(value: string) {
  const normalized = value.trim().toLowerCase()
  return ['true', 'false', 'yes', 'no', '0', '1'].includes(normalized)
}

function isDateLike(value: string) {
  if (!value) return false
  if (!/[-/]/.test(value) && !/^\d{8}$/.test(value)) return false
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp)
}

function inferTargetCandidates(columns: ColumnSummary[]) {
  const scored = columns
    .map((column, index) => {
      let score = 0
      if (index === columns.length - 1) score += 30
      else if (index === columns.length - 2) score += 12

      if (/(target|label|class|outcome|status|churn|price|premium|sales|demand|units|revenue|y)$/i.test(column.name)) {
        score += 24
      }

      if (column.kind === 'categorical' || column.kind === 'boolean') {
        score += column.uniqueCount >= 2 && column.uniqueCount <= 20 ? 16 : 8
      } else if (column.kind === 'numeric') {
        score += column.uniqueCount > 10 ? 18 : 8
      } else if (column.kind === 'text') {
        score += 3
      } else if (column.kind === 'date') {
        score -= 18
      }

      if (column.missingRate > 0.4) score -= 10

      return {
        name: column.name,
        kind: column.kind,
        score,
        reason: buildCandidateReason(column),
      } satisfies TargetCandidate
    })
    .sort((left, right) => right.score - left.score)

  return scored.slice(0, 3)
}

function buildCandidateReason(column: ColumnSummary) {
  if (column.kind === 'numeric') return 'numeric target candidate for regression-style prediction'
  if (column.kind === 'date') return 'time column, usually better as context than target'
  if (column.kind === 'text') return 'high-variety text column that may need API inference'
  return 'compact label-like column for classification'
}

function inferTaskSuggestion(columns: ColumnSummary[], topTarget: TargetCandidate | undefined): TaskSuggestion {
  const hasDateContext = columns.some((column) => column.kind === 'date')
  if (hasDateContext && topTarget?.kind === 'numeric') return 'forecasting'
  if (topTarget?.kind === 'numeric') return 'regression'
  return 'classification'
}

function inferRecommendedPath(args: {
  cellCount: number
  rowCount: number
  columnCount: number
  textColumns: number
  dateColumns: number
  taskSuggestion: TaskSuggestion
}): RecommendedPath {
  const { cellCount, rowCount, columnCount, textColumns, dateColumns, taskSuggestion } = args

  if (taskSuggestion === 'forecasting' && dateColumns > 0) return 'ts'
  if (cellCount > 20_000_000 || rowCount > 50_000 || columnCount > 2_000) return 'enterprise'
  if (textColumns > 0) return 'client'
  return 'oss'
}

function inferFitScore(args: {
  cellCount: number
  rowCount: number
  columnCount: number
  textColumns: number
  dateColumns: number
  taskSuggestion: TaskSuggestion
  topTarget: TargetCandidate | undefined
}) {
  const { cellCount, rowCount, columnCount, textColumns, dateColumns, taskSuggestion, topTarget } = args
  let score = 58

  if (rowCount >= 50 && rowCount <= 10_000) score += 18
  else if (rowCount <= 50_000) score += 10
  else score -= 10

  if (columnCount <= 200) score += 10
  else if (columnCount <= 2_000) score += 4
  else score -= 10

  if (textColumns > 0) score += 4
  if (dateColumns > 0 && taskSuggestion === 'forecasting') score += 8
  if (cellCount > 20_000_000) score -= 18

  if (topTarget?.kind === 'numeric' || topTarget?.kind === 'categorical' || topTarget?.kind === 'boolean') {
    score += 8
  } else if (topTarget?.kind === 'date') {
    score -= 8
  }

  return clamp(score, 22, 97)
}

function recommendedPathLabel(path: RecommendedPath) {
  switch (path) {
    case 'client':
      return 'Best first path: TabPFN Client'
    case 'ts':
      return 'Best first path: TabPFN-TS'
    case 'enterprise':
      return 'Best first path: scaling or enterprise'
    default:
      return 'Best first path: TabPFN OSS package'
  }
}

function recommendedGuidePath(path: RecommendedPath) {
  switch (path) {
    case 'client':
      return '/tabpfn-client'
    case 'ts':
      return '/tabpfn-ts'
    case 'enterprise':
      return '/tabpfn-v2'
    default:
      return '/tabpfn-huggingface'
  }
}

function buildTopReasons(args: {
  rowCount: number
  columnCount: number
  textColumns: number
  dateColumns: number
  taskSuggestion: TaskSuggestion
  recommendedPath: RecommendedPath
  topTarget: TargetCandidate | undefined
}) {
  const reasons: string[] = []

  if (args.taskSuggestion === 'forecasting') {
    reasons.push('A date-like column plus a numeric target suggests the TabPFN-TS forecasting path.')
  } else if (args.topTarget?.kind === 'numeric') {
    reasons.push('The likely target looks numeric, which maps cleanly to TabPFN regression workflows.')
  } else {
    reasons.push('The likely target behaves like a label column, which is a good fit for TabPFN classification.')
  }

  if (args.recommendedPath === 'client') {
    reasons.push('Text-heavy columns usually benefit from the cloud client path instead of local checkpoint handling.')
  } else if (args.recommendedPath === 'enterprise') {
    reasons.push('Your row or feature count is large enough that scaling mode should be part of the evaluation.')
  } else {
    reasons.push('This table shape stays inside the normal range where TabPFN can move quickly without long tuning loops.')
  }

  if (args.rowCount <= 10_000 && args.columnCount <= 500) {
    reasons.push('The dataset size is close to the range where TabPFN is strongest and easiest to benchmark quickly.')
  }

  if (args.dateColumns > 0 && args.taskSuggestion !== 'forecasting') {
    reasons.push('A date column is present, so calendar context may still help even if this is not a pure forecasting task.')
  }

  if (args.textColumns === 0) {
    reasons.push('No obvious free-form text columns were detected, which simplifies the first benchmark run.')
  }

  return reasons.slice(0, 4)
}

function buildCautionNotes(args: {
  cellCount: number
  rowCount: number
  columnCount: number
  columns: ColumnSummary[]
  targetCandidates: TargetCandidate[]
}) {
  const notes: string[] = []

  if (args.cellCount > 20_000_000) {
    notes.push('The hosted client has documented total-cell limits, so this table should be benchmarked with scaling in mind.')
  }

  if (args.rowCount > 50_000) {
    notes.push('The row count is beyond the standard comfort zone for the regular local workflow.')
  }

  if (args.columnCount > 2_000) {
    notes.push('Very wide tables often need feature trimming or a scaling-specific evaluation plan.')
  }

  const sparseColumns = args.columns.filter((column) => column.missingRate > 0.45)
  if (sparseColumns.length > 0) {
    notes.push('One or more columns are very sparse, so benchmark quality will depend on whether those columns are actually useful.')
  }

  if (args.targetCandidates[0]?.kind === 'text') {
    notes.push('The top target candidate looks like text, so confirm which column is truly the prediction target before running a paid benchmark.')
  }

  if (notes.length === 0) {
    notes.push('The scanner did not find an obvious blocker, but a real benchmark should still verify metric choice and target definition.')
  }

  return notes.slice(0, 3)
}

function buildNextSteps(path: RecommendedPath, taskSuggestion: TaskSuggestion) {
  if (path === 'ts') {
    return [
      'Confirm the forecast horizon and whether the target is point, probabilistic, or both.',
      'Benchmark TabPFN-TS before spending time on manual feature pipelines.',
      'Use the hosted plan if you want a cleaner team handoff than notebook-only evaluation.',
    ]
  }

  if (path === 'client') {
    return [
      'Start with the API client if you want production speed without local GPU setup.',
      'Check privacy rules before uploading any sensitive table.',
      'Use the hosted plan when you want repeatable evaluation, not just one notebook run.',
    ]
  }

  if (path === 'enterprise') {
    return [
      'Frame the first test around a representative slice before moving the full table into scaling mode.',
      'Decide whether you need low-latency distillation, larger row support, or both.',
      'Use a paid plan to keep procurement and benchmarking in one motion.',
    ]
  }

  return [
    taskSuggestion === 'classification'
      ? 'Start with a small classification benchmark and compare it against your current tree baseline.'
      : 'Start with a regression benchmark and track both error and calibration.',
    'Use the model card and Hugging Face checkpoint page to decide whether local inference or the client is the cleaner first move.',
    'Open pricing when you want the hosted workflow instead of piecing together local setup by hand.',
  ]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
