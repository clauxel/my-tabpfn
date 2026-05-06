import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  FileSearch,
  Globe2,
  Layers3,
  LineChart,
  MonitorUp,
  Play,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'

import { findKeywordPageByPath, keywordPages, type KeywordPage } from './content/keyword-pages'
import {
  analyzeDatasetText,
  getSampleDataset,
  sampleDatasets,
  type DatasetAnalysis,
  type RecommendedPath,
  type SampleDataset,
} from './lib/dataset-fit'
import { buildSeoDocument, syncSeoDocument } from './lib/seo'
import { deriveRouteView, normalizePathname, scrollToHashTarget, type RouteView } from './lib/routing'

const defaultPublicAppOrigin = 'https://tabpfn.site'

type Billing = 'monthly' | 'annual'
type PlanId = 'starter' | 'pro' | 'scale'

type CheckoutModalState = {
  planId: PlanId
  billing: Billing
  loadingKey: string
  status: 'loading' | 'popup' | 'retry'
  checkoutUrl?: string
}

const ctaPrimary = 'Start Pro annual'
const ctaSecondary = 'Run the fit scan'
const ctaScale = 'Start Scale annual'

const plans: Array<{
  id: PlanId
  name: string
  tagline: string
  monthlyUsd: number
  bullets: string[]
  popular?: boolean
}> = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'Solo evaluation for one buyer or one analyst.',
    monthlyUsd: 39,
    bullets: ['CSV fit scanner', 'One hosted benchmark lane', 'Keyword guide library', 'Starter email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'The default path for real tabular model pilots.',
    monthlyUsd: 99,
    popular: true,
    bullets: ['Hosted benchmark workflow', 'Client and local-path guidance', 'Team-ready notes and templates', 'Priority setup support'],
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'Bigger tables, production decisions, and faster handoff.',
    monthlyUsd: 299,
    bullets: ['Large-table rollout guidance', 'Scaling-mode planning', 'Deeper benchmark review', 'Faster response on production blockers'],
  },
]

const proofItems = [
  { label: 'First answer', value: '<1 min', detail: 'CSV fit scan runs in the browser' },
  { label: 'Surface area', value: '4 paths', detail: 'OSS, client, TS, and enterprise' },
  { label: 'Research signal', value: 'Nature 2025', detail: 'serious credibility for small-data prediction' },
  { label: 'Annual savings', value: '50%', detail: 'Pro annual is selected by default' },
]

const workflowCards = [
  {
    title: 'Dataset-first evaluation',
    body: 'See whether your table looks like a clean TabPFN fit before you burn time on local setup or noisy comparisons.',
    icon: <FileSearch size={20} />,
  },
  {
    title: 'Right path, right away',
    body: 'Route buyers toward the OSS package, the client API, TabPFN-TS, or scaling mode based on the actual shape of the data.',
    icon: <Layers3 size={20} />,
  },
  {
    title: 'Proof before procurement drag',
    body: 'Nature paper confidence, checkpoint guidance, pricing clarity, and hosted checkout compress the path to a real pilot.',
    icon: <BadgeCheck size={20} />,
  },
  {
    title: 'Payment without losing focus',
    body: 'Creem checkout opens in a centered popup, keeps the page in place, and returns buyers to the homepage after success.',
    icon: <ShieldCheck size={20} />,
  },
]

const pathCards: Array<{
  path: RecommendedPath
  title: string
  body: string
  bullets: string[]
}> = [
  {
    path: 'oss',
    title: 'TabPFN OSS package',
    body: 'Best when the team wants local control, already has Python and enough compute, and needs checkpoint-level visibility.',
    bullets: ['Local inference', 'Hugging Face checkpoint path', 'Best for research and privacy-sensitive pilots'],
  },
  {
    path: 'client',
    title: 'tabpfn-client',
    body: 'Best when setup speed matters more than local checkpoint handling and the data policy allows hosted inference.',
    bullets: ['Managed infrastructure', 'Fastest start for production-minded teams', 'Good for text-rich tables and shared testing'],
  },
  {
    path: 'ts',
    title: 'TabPFN-TS',
    body: 'Best when the table has a real time axis and the team needs a forecasting answer before building a larger stack.',
    bullets: ['Zero-shot forecasting', 'Great with covariates', 'Useful for horizon-first evaluation'],
  },
  {
    path: 'enterprise',
    title: 'Scaling and enterprise',
    body: 'Best when the table is large enough that benchmarking, latency, and deployment shape all become part of the sale.',
    bullets: ['Large data planning', 'Distillation or scaling mode', 'Better fit for production rollout'],
  },
]

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const rawText = await response.text()
  if (!rawText.trim()) return null
  try {
    return JSON.parse(rawText) as T
  } catch {
    return null
  }
}

async function createCheckoutSession(planId: PlanId, billing: Billing) {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, billing }),
  })

  const payload = await readJsonResponse<{ ok?: boolean; checkoutUrl?: string; error?: string }>(response)
  if (!response.ok || !payload?.ok || !payload.checkoutUrl) {
    throw new Error(payload?.error || 'Checkout could not be started.')
  }

  return payload.checkoutUrl
}

function openCenteredCheckoutWindow() {
  const width = 560
  const height = 760
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2))
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2))
  const popup = window.open(
    'about:blank',
    'tabpfn-checkout',
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  )

  if (popup) {
    try {
      popup.document.title = 'Opening secure checkout'
      popup.document.body.innerHTML =
        '<main style="min-height:100vh;display:grid;place-items:center;background:#0f1720;color:#f4f1e8;font-family:ui-sans-serif,system-ui,sans-serif;text-align:center;padding:32px"><div><h1 style="font-size:22px;margin:0 0 8px">Opening secure checkout...</h1><p style="margin:0;color:#b7c2cf">Your TabPFN Studio payment window is being prepared.</p></div></main>'
    } catch {
      /* Existing named checkout windows can be cross-origin; setting location below still works. */
    }
  }

  return popup
}

function sendPopupToCheckout(popup: Window | null, url: string) {
  if (!popup || popup.closed) return false

  try {
    popup.location.replace(url)
    popup.focus()
    return true
  } catch {
    return false
  }
}

function usePathnameSignal() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [search, setSearch] = useState(() => window.location.search)

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.origin)
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
    setPathname(url.pathname)
    setSearch(url.search)
    window.dispatchEvent(new PopStateEvent('popstate'))

    if (url.hash) {
      requestAnimationFrame(() => scrollToHashTarget(url.hash))
      return
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const onPop = () => {
      setPathname(window.location.pathname)
      setSearch(window.location.search)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return { pathname, search, navigate }
}

function CheckoutDoneBridge({ publicAppOrigin }: { publicAppOrigin: string }) {
  useEffect(() => {
    const origin = window.location.origin || new URL(publicAppOrigin).origin

    if (window.parent !== window) {
      window.parent.postMessage({ type: 'tabpfn-checkout-complete' }, origin)
      return
    }

    if (window.opener) {
      try {
        window.opener.postMessage({ type: 'tabpfn-checkout-complete' }, origin)
      } catch {
        /* The opener may be closed or cross-origin; the fallback below handles direct visits. */
      }
      window.close()
      return
    }

    window.location.replace(`${origin}/?checkout=complete`)
  }, [publicAppOrigin])

  return (
    <main className="tpf-main">
      <section className="tpf-section tpf-centered-section">
        <p className="tpf-eyebrow">Checkout</p>
        <h1>Finishing checkout...</h1>
        <p className="tpf-muted">You will return to the homepage when the hosted payment session closes.</p>
      </section>
    </main>
  )
}

function initialAnalysis() {
  const sample = getSampleDataset('churn')
  return analyzeDatasetText(sample.csv, sample.label)
}

export default function App() {
  const { pathname, search, navigate } = usePathnameSignal()
  const normalizedPath = normalizePathname(pathname)
  const routeView: RouteView = useMemo(() => deriveRouteView(pathname), [pathname])
  const keywordPage = useMemo(() => findKeywordPageByPath(pathname), [pathname])

  const [publicAppOrigin, setPublicAppOrigin] = useState(defaultPublicAppOrigin)
  const [headerCompact, setHeaderCompact] = useState(() => window.scrollY > 18)
  const [billing, setBilling] = useState<Billing>('annual')
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>('pro')
  const [checkoutLoadingKey, setCheckoutLoadingKey] = useState<string | null>(null)
  const [checkoutModal, setCheckoutModal] = useState<CheckoutModalState | null>(null)
  const [analysis, setAnalysis] = useState<DatasetAnalysis>(() => initialAnalysis())
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [csvDraft, setCsvDraft] = useState(() => getSampleDataset('churn').csv)
  const [activeSampleKey, setActiveSampleKey] = useState<SampleDataset['key']>('churn')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/runtime')
      .then((response) => readJsonResponse<{ publicAppOrigin?: string }>(response))
      .then((payload) => {
        if (!cancelled && payload?.publicAppOrigin) {
          setPublicAppOrigin(payload.publicAppOrigin)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const seo = buildSeoDocument({
      pathname,
      routeView,
      publicAppOrigin,
      keywordPage,
    })
    syncSeoDocument(seo)
  }, [keywordPage, pathname, publicAppOrigin, routeView])

  useEffect(() => {
    const onScroll = () => setHeaderCompact(window.scrollY > 18)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const allowed = new Set([window.location.origin, new URL(publicAppOrigin).origin])
    const onMessage = (event: MessageEvent) => {
      if (!allowed.has(event.origin)) return
      if (event.data?.type === 'tabpfn-checkout-complete') {
        setCheckoutModal(null)
        navigate('/?checkout=complete')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate, publicAppOrigin])

  useEffect(() => {
    const hash = window.location.hash
    if (hash) {
      requestAnimationFrame(() => scrollToHashTarget(hash))
    }
  }, [pathname])

  const runScan = useCallback((raw: string, datasetName: string) => {
    try {
      const next = analyzeDatasetText(raw, datasetName)
      setAnalysis(next)
      setAnalysisError(null)
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'The CSV could not be analyzed.')
    }
  }, [])

  const loadSample = useCallback(
    (sampleKey: SampleDataset['key']) => {
      const sample = getSampleDataset(sampleKey)
      setActiveSampleKey(sampleKey)
      setCsvDraft(sample.csv)
      runScan(sample.csv, sample.label)
    },
    [runScan],
  )

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        setActiveSampleKey('churn')
        setCsvDraft(text)
        runScan(text, file.name)
      } finally {
        event.target.value = ''
      }
    },
    [runScan],
  )

  const startHostedCheckout = useCallback(async (planId: PlanId, nextBilling: Billing, loadingKey: string) => {
    setSelectedPlanId(planId)
    setBilling(nextBilling)
    setCheckoutLoadingKey(loadingKey)
    setCheckoutModal({ planId, billing: nextBilling, loadingKey, status: 'loading' })

    const popup = openCenteredCheckoutWindow()

    try {
      const url = await createCheckoutSession(planId, nextBilling)
      sendPopupToCheckout(popup, url)
      setCheckoutModal({ planId, billing: nextBilling, loadingKey, status: 'popup', checkoutUrl: url })
    } catch {
      try {
        if (popup && !popup.closed) popup.close()
      } catch {
        /* Nothing to clean up if the browser blocks access to the popup. */
      }
      setCheckoutModal({ planId, billing: nextBilling, loadingKey, status: 'retry' })
    } finally {
      setCheckoutLoadingKey(null)
    }
  }, [])

  const jumpToPricing = useCallback(() => {
    setBilling('annual')
    setSelectedPlanId('pro')
    navigate('/#pricing')
  }, [navigate])

  const startDefaultCheckout = useCallback(
    (loadingKey: string) => {
      void startHostedCheckout('pro', 'annual', loadingKey)
    },
    [startHostedCheckout],
  )

  const renderHeader = () => (
    <header className={`tpf-header${headerCompact ? ' tpf-header-compact' : ''}`}>
      <div className="tpf-header-inner">
        <a
          className="tpf-brand"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          <span className="tpf-brand-mark" aria-hidden>
            <Database size={21} />
          </span>
          <span className="tpf-brand-name">TabPFN Studio</span>
        </a>

        <nav className="tpf-nav" aria-label="Primary">
          <a href="/#scanner" onClick={() => navigate('/#scanner')}>
            Scanner
          </a>
          <a href="/#paths" onClick={() => navigate('/#paths')}>
            Paths
          </a>
          <a href="/#pricing" onClick={() => navigate('/#pricing')}>
            Pricing
          </a>
          <a
            href="/tabpfn-client"
            onClick={(event) => {
              event.preventDefault()
              navigate('/tabpfn-client')
            }}
          >
            Client guide
          </a>
        </nav>

        <button type="button" className="tpf-btn tpf-btn-ghost tpf-header-cta" onClick={() => startDefaultCheckout('header-pro-annual')}>
          <Play size={16} />
          {ctaPrimary}
        </button>
      </div>
    </header>
  )

  const renderCheckoutModal = () => {
    if (!checkoutModal) return null

    const checkoutUrl = checkoutModal.status === 'popup' ? checkoutModal.checkoutUrl : undefined

    return (
      <div className="tpf-checkout-backdrop" role="presentation">
        <section className="tpf-checkout-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
          <button type="button" className="tpf-checkout-close" aria-label="Close checkout" onClick={() => setCheckoutModal(null)}>
            <X size={18} />
          </button>
          {checkoutUrl ? (
            <div className="tpf-creem-popup-copy">
              <p className="tpf-eyebrow">Secure checkout</p>
              <h2 id="checkout-title">Creem checkout opened.</h2>
              <p className="tpf-muted">
                Complete payment in the centered Creem window. This page stays open and returns to the homepage after success.
              </p>
              <a className="tpf-btn tpf-btn-primary" href={checkoutUrl} target="_blank" rel="noreferrer noopener">
                Reopen Creem checkout
              </a>
            </div>
          ) : checkoutModal.status === 'loading' ? (
            <div className="tpf-creem-loading" aria-live="polite">
              <span />
              Opening Creem checkout...
            </div>
          ) : (
            <div className="tpf-creem-error">
              <p>Creem checkout could not be opened. Please try again.</p>
              <div className="tpf-checkout-actions">
                <button
                  type="button"
                  className="tpf-btn tpf-btn-primary"
                  onClick={() => void startHostedCheckout(checkoutModal.planId, checkoutModal.billing, checkoutModal.loadingKey)}
                  disabled={checkoutLoadingKey !== null}
                >
                  Open Creem checkout
                </button>
                <button type="button" className="tpf-btn tpf-btn-ghost" onClick={() => setCheckoutModal(null)}>
                  Review plans
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    )
  }

  const renderAnalysisPanel = () => {
    const recommendedPlanId: PlanId = analysis.recommendedPath === 'enterprise' ? 'scale' : 'pro'
    const recommendedCheckoutKey = `analysis-${analysis.recommendedPath}-annual`

    return (
      <aside className="tpf-scan-card" aria-label="TabPFN dataset fit scanner">
        <div className="tpf-scan-head">
          <div>
            <p className="tpf-eyebrow">Dataset fit scan</p>
            <h2>See the likely TabPFN path before you touch setup.</h2>
          </div>
          <div className="tpf-badge-row">
            <span>Local browser scan</span>
            <span>No upload until checkout</span>
          </div>
        </div>

        <div className="tpf-fit-summary">
          <div className="tpf-fit-score">
            <strong>{analysis.fitScore}</strong>
            <span>{analysis.fitLabel}</span>
          </div>
          <div className="tpf-fit-copy">
            <p className="tpf-fit-title">{analysis.recommendedLabel}</p>
            <p className="tpf-muted">
              {analysis.datasetName} looks like a {analysis.taskSuggestion} workflow with {analysis.rowCount.toLocaleString()} rows and{' '}
              {analysis.columnCount.toLocaleString()} columns.
            </p>
          </div>
        </div>

        <div className="tpf-stat-grid">
          <article>
            <span>Rows</span>
            <strong>{analysis.rowCount.toLocaleString()}</strong>
          </article>
          <article>
            <span>Columns</span>
            <strong>{analysis.columnCount.toLocaleString()}</strong>
          </article>
          <article>
            <span>Task</span>
            <strong>{analysis.taskSuggestion}</strong>
          </article>
          <article>
            <span>Missing</span>
            <strong>{Math.round(analysis.missingRate * 100)}%</strong>
          </article>
        </div>

        <div className="tpf-sample-row" role="tablist" aria-label="Sample datasets">
          {sampleDatasets.map((sample) => (
            <button
              key={sample.key}
              type="button"
              className="tpf-sample-chip"
              data-active={activeSampleKey === sample.key ? 'true' : 'false'}
              onClick={() => loadSample(sample.key)}
            >
              {sample.label}
            </button>
          ))}
          <button type="button" className="tpf-upload-chip" onClick={() => fileInputRef.current?.click()}>
            <Upload size={15} />
            Upload CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv,.tsv,text/tab-separated-values" hidden onChange={handleFileChange} />
        </div>

        <label className="tpf-textarea-label" htmlFor="tabpfn-csv-draft">
          Paste a header row plus a few sample rows
        </label>
        <textarea
          id="tabpfn-csv-draft"
          className="tpf-scan-textarea"
          value={csvDraft}
          onChange={(event) => setCsvDraft(event.target.value)}
          spellCheck={false}
        />

        <div className="tpf-scan-actions">
          <button type="button" className="tpf-btn tpf-btn-primary" onClick={() => runScan(csvDraft, 'Pasted dataset')}>
            <Activity size={17} />
            Analyze pasted data
          </button>
          <button type="button" className="tpf-btn tpf-btn-ghost" onClick={() => fileInputRef.current?.click()}>
            <Upload size={17} />
            Upload a CSV
          </button>
        </div>

        {analysisError ? <p className="tpf-error-inline">{analysisError}</p> : null}

        <div className="tpf-target-card">
          <div className="tpf-target-head">
            <strong>Likely target columns</strong>
            <span>Best guess from the pasted sample</span>
          </div>
          <ul className="tpf-target-list">
            {analysis.targetCandidates.map((candidate) => (
              <li key={candidate.name}>
                <div>
                  <strong>{candidate.name}</strong>
                  <p>{candidate.reason}</p>
                </div>
                <span>{candidate.kind}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="tpf-reason-grid">
          <div className="tpf-note-card">
            <strong>Why this path</strong>
            <ul>
              {analysis.topReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div className="tpf-note-card">
            <strong>What to watch</strong>
            <ul>
              {analysis.cautionNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="tpf-next-step-card">
          <div>
            <p className="tpf-eyebrow">Recommended next move</p>
            <h3>Keep the first benchmark focused and buy the path that matches the table.</h3>
          </div>
          <ol>
            {analysis.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="tpf-next-step-actions">
            <button
              type="button"
              className="tpf-btn tpf-btn-primary"
              onClick={() => void startHostedCheckout(recommendedPlanId, 'annual', recommendedCheckoutKey)}
            >
              <CircleDollarSign size={18} />
              {recommendedPlanId === 'scale' ? ctaScale : ctaPrimary}
            </button>
            <button
              type="button"
              className="tpf-btn tpf-btn-ghost"
              onClick={() => {
                navigate(analysis.recommendedGuidePath)
              }}
            >
              <ArrowRight size={18} />
              Open the matching guide
            </button>
          </div>
        </div>
      </aside>
    )
  }

  const renderHome = () => {
    const checkoutComplete = new URLSearchParams(search).get('checkout') === 'complete'

    return (
      <main className="tpf-main">
        {checkoutComplete ? (
          <section className="tpf-success-banner">
            <CheckCircle2 size={18} />
            Payment received. Your TabPFN Studio onboarding will start from the email used at checkout.
          </section>
        ) : null}

        <section className="tpf-hero" id="scanner">
          <div className="tpf-hero-copy">
            <p className="tpf-eyebrow">Hosted workflow for TabPFN evaluation and rollout</p>
            <h1>Know if TabPFN fits your CSV before you touch setup.</h1>
            <p className="tpf-lede">
              Scan the shape of your table in the browser, decide between TabPFN v2, the client API, TabPFN-TS, or a scaling
              path, and open a hosted checkout without breaking momentum.
            </p>

            <div className="tpf-hero-actions">
              <button type="button" className="tpf-btn tpf-btn-primary" onClick={() => startDefaultCheckout('hero-pro-annual')}>
                <Play size={18} />
                {ctaPrimary}
              </button>
              <button type="button" className="tpf-btn tpf-btn-ghost" onClick={() => scrollToHashTarget('#scanner')}>
                <Activity size={18} />
                {ctaSecondary}
              </button>
              <button type="button" className="tpf-btn tpf-btn-subtle" onClick={jumpToPricing}>
                <Globe2 size={18} />
                Review plans
              </button>
            </div>

            <div className="tpf-hero-trust">
              <span>Pro annual selected by default</span>
              <span>50% annual savings</span>
              <span>Returns home after payment</span>
            </div>
          </div>

          {renderAnalysisPanel()}
        </section>

        <section className="tpf-proof-strip" aria-label="Product proof points">
          {proofItems.map((item) => (
            <article key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="tpf-section" id="paths">
          <div className="tpf-section-head">
            <p className="tpf-eyebrow">Decision paths</p>
            <h2>Pick the right TabPFN motion before you buy the wrong one.</h2>
            <p>
              The official ecosystem already points to different paths for local inference, hosted inference, forecasting, and
              scale. This page makes that choice legible on the first screen so buyers do not get stuck translating docs into a
              purchase decision.
            </p>
          </div>

          <div className="tpf-path-grid">
            {pathCards.map((card) => (
              <article className="tpf-path-card" key={card.path}>
                <div className="tpf-card-icon">
                  {card.path === 'oss' ? <Database size={20} /> : null}
                  {card.path === 'client' ? <MonitorUp size={20} /> : null}
                  {card.path === 'ts' ? <LineChart size={20} /> : null}
                  {card.path === 'enterprise' ? <ClipboardCheck size={20} /> : null}
                </div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
                <ul>
                  {card.bullets.map((bullet) => (
                    <li key={bullet}>
                      <Check size={15} />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="tpf-section">
          <div className="tpf-section-head">
            <p className="tpf-eyebrow">Why buyers move</p>
            <h2>Reduce setup drag, clarify the path, then make payment feel safe.</h2>
            <p>
              The conversion problem on technical sites is rarely attention alone. It is uncertainty. Buyers leave when they do
              not know whether the model fits their table, whether setup will balloon, or whether payment will interrupt the
              review flow. This site is built to remove those three frictions.
            </p>
          </div>

          <div className="tpf-card-grid tpf-card-grid-4">
            {workflowCards.map((card) => (
              <article className="tpf-card" key={card.title}>
                <div className="tpf-card-icon">{card.icon}</div>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </section>

        {renderPricing()}

        <section className="tpf-section">
          <div className="tpf-section-head">
            <p className="tpf-eyebrow">Useful guides</p>
            <h2>Answer the high-intent searches people make before they buy.</h2>
            <p>
              These pages are meant to stand on their own: version choice, the paper, Hugging Face checkpoints, TabPFN-TS,
              Nature credibility, the R wrapper, the architecture, and the hosted client path.
            </p>
          </div>
          <div className="tpf-guide-grid">
            {keywordPages.map((page) => (
              <a
                className="tpf-guide-card"
                href={page.path}
                key={page.path}
                onClick={(event) => {
                  event.preventDefault()
                  navigate(page.path)
                }}
              >
                <span>{page.eyebrow}</span>
                <strong>{page.h1}</strong>
                <p>{page.intent}</p>
                <ChevronRight size={18} />
              </a>
            ))}
          </div>
        </section>
      </main>
    )
  }

  const renderPricing = () => (
    <section className="tpf-section tpf-pricing-section" id="pricing">
      <div className="tpf-pricing-head">
        <div>
          <p className="tpf-eyebrow">Pricing</p>
          <h2>Pro annual is the default because real pilots need enough room to prove value.</h2>
          <p>Annual billing is selected by default and is 50% cheaper than paying monthly.</p>
        </div>
        <div className="tpf-cycle" role="group" aria-label="Billing cycle">
          <button type="button" data-active={billing === 'monthly' ? 'true' : 'false'} onClick={() => setBilling('monthly')}>
            Monthly
          </button>
          <button type="button" data-active={billing === 'annual' ? 'true' : 'false'} onClick={() => setBilling('annual')}>
            Annual - 50% off
          </button>
        </div>
      </div>

      <div className="tpf-plan-grid">
        {plans.map((plan) => {
          const monthly = billing === 'annual' ? plan.monthlyUsd * 0.5 : plan.monthlyUsd
          const strike = billing === 'annual' ? plan.monthlyUsd : null
          const loadingKey = `plan-${plan.id}-${billing}`

          return (
            <article className="tpf-plan-card" data-popular={plan.popular ? 'true' : 'false'} key={plan.id}>
              {plan.popular ? <span className="tpf-plan-badge">Default choice</span> : null}
              <h3>{plan.name}</h3>
              <p>{plan.tagline}</p>
              <div className="tpf-price-line">
                {formatMoney(monthly)}
                <small>/mo</small>
                {strike ? <span>{formatMoney(strike)}</span> : null}
              </div>
              <strong className="tpf-billing-note">{billing === 'annual' ? `${formatMoney(monthly * 12)} billed annually` : 'Billed monthly'}</strong>
              <ul>
                {plan.bullets.map((bullet) => (
                  <li key={bullet}>
                    <Check size={15} />
                    {bullet}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={plan.popular ? 'tpf-btn tpf-btn-primary' : 'tpf-btn tpf-btn-ghost'}
                onClick={() => void startHostedCheckout(plan.id, billing, loadingKey)}
                onMouseEnter={() => setSelectedPlanId(plan.id)}
                disabled={checkoutLoadingKey !== null}
              >
                {checkoutLoadingKey === loadingKey
                  ? 'Starting secure checkout...'
                  : plan.id === 'scale'
                    ? ctaScale
                    : plan.id === 'starter'
                      ? 'Start Starter annual'
                      : ctaPrimary}
              </button>
              {selectedPlanId === plan.id ? <span className="tpf-plan-selected">Selected</span> : null}
            </article>
          )
        })}
      </div>
    </section>
  )

  const renderKeywordPage = (page: KeywordPage) => (
    <main className="tpf-main">
      <article className="tpf-article">
        <a
          className="tpf-back-link"
          href="/"
          onClick={(event) => {
            event.preventDefault()
            navigate('/')
          }}
        >
          <ArrowRight size={16} />
          Back to TabPFN Studio
        </a>
        <p className="tpf-eyebrow">{page.eyebrow}</p>
        <h1>{page.h1}</h1>
        <p className="tpf-lede">{page.lede}</p>
        <div className="tpf-article-intent">
          <strong>Best for</strong>
          <span>{page.intent}</span>
        </div>

        {page.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {section.bullets ? (
              <ul>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <section>
          <h2>Questions worth answering before checkout</h2>
          <div className="tpf-faq-list">
            {page.faqs.map((faq) => (
              <article key={faq.question}>
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="tpf-article-cta">
          <div>
            <p className="tpf-eyebrow">Recommended next step</p>
            <h2>Run the fit scan, then open Pro annual while the table is still in view.</h2>
            <p>Keep the dataset decision clear, preserve the annual savings, and use the matching guide page only where it helps.</p>
          </div>
          <div className="tpf-article-cta-actions">
            <button type="button" className="tpf-btn tpf-btn-primary" onClick={() => startDefaultCheckout(`article-${page.path}`)}>
              <MonitorUp size={18} />
              {ctaPrimary}
            </button>
            <button
              type="button"
              className="tpf-btn tpf-btn-ghost"
              onClick={() => {
                navigate('/#scanner')
              }}
            >
              <Activity size={18} />
              Run the fit scan
            </button>
          </div>
        </aside>
      </article>
    </main>
  )

  const renderPrivacy = () => (
    <main className="tpf-main">
      <article className="tpf-article">
        <p className="tpf-eyebrow">Privacy</p>
        <h1>Privacy Policy</h1>
        <p className="tpf-lede">
          TabPFN Studio keeps the homepage CSV fit scan in the browser and only processes the information required for checkout,
          support, and hosted workflow onboarding when you choose to pay.
        </p>
        <section>
          <h2>What we process</h2>
          <p>We process contact details, payment metadata from Creem, support messages, and limited product analytics for reliability and conversion measurement.</p>
          <h2>Dataset fit scan</h2>
          <p>The homepage scanner runs locally in your browser from pasted rows or uploaded CSV samples until you move into a hosted workflow.</p>
          <h2>Hosted data flows</h2>
          <p>If you choose a cloud-based evaluation path such as tabpfn-client or the R wrapper, you remain responsible for checking your data-sharing policy before sending real tables to a hosted service.</p>
        </section>
      </article>
    </main>
  )

  const renderTerms = () => (
    <main className="tpf-main">
      <article className="tpf-article">
        <p className="tpf-eyebrow">Terms</p>
        <h1>Terms of Service</h1>
        <p className="tpf-lede">
          By using TabPFN Studio, you agree to use the service lawfully, keep credentials secure, and pay plan fees when due.
        </p>
        <section>
          <h2>Service scope</h2>
          <p>Plans cover the hosted evaluation workflow, conversion assets, pricing path, and support around choosing the right TabPFN route for your team.</p>
          <h2>Independent product layer</h2>
          <p>The upstream TabPFN open-source repositories, client libraries, and model cards remain independently maintained by their respective authors.</p>
          <h2>Payments</h2>
          <p>Payments are processed by Creem. Annual pricing is discounted as shown at checkout and the payment completion flow returns buyers to the homepage.</p>
        </section>
      </article>
    </main>
  )

  const renderNotFound = () => (
    <main className="tpf-main">
      <section className="tpf-section tpf-centered-section">
        <p className="tpf-eyebrow">404</p>
        <h1>Page not found</h1>
        <p className="tpf-muted">That route is not available.</p>
        <button type="button" className="tpf-btn tpf-btn-primary" onClick={() => navigate('/')}>
          Return home
        </button>
      </section>
    </main>
  )

  let body: React.ReactNode
  if (routeView === 'home' && normalizedPath === '/') {
    body = renderHome()
  } else if (routeView === 'keyword' && keywordPage) {
    body = renderKeywordPage(keywordPage)
  } else if (routeView === 'privacy') {
    body = renderPrivacy()
  } else if (routeView === 'terms') {
    body = renderTerms()
  } else if (routeView === 'checkout-done') {
    body = <CheckoutDoneBridge publicAppOrigin={publicAppOrigin} />
  } else {
    body = renderNotFound()
  }

  return (
    <div className="tpf-shell">
      <div className="tpf-page-texture" aria-hidden />
      {renderHeader()}
      {body}
      {renderCheckoutModal()}
      <footer className="tpf-footer">
        <div className="tpf-footer-inner">
          <span>TabPFN Studio</span>
          <a href="/privacy" onClick={(event) => { event.preventDefault(); navigate('/privacy') }}>
            Privacy
          </a>
          <a href="/terms" onClick={(event) => { event.preventDefault(); navigate('/terms') }}>
            Terms
          </a>
          <a href="https://github.com/PriorLabs/TabPFN" target="_blank" rel="noreferrer">
            Upstream GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
