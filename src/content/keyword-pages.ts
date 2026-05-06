export type KeywordSection = {
  heading: string
  paragraphs: string[]
  bullets?: string[]
}

export type KeywordPage = {
  path: string
  title: string
  description: string
  h1: string
  eyebrow: string
  lede: string
  intent: string
  sections: KeywordSection[]
  faqs: Array<{ question: string; answer: string }>
}

export const keywordPages: KeywordPage[] = [
  {
    path: '/tabpfn-v2',
    title: 'TabPFN v2 Guide for Faster Model Decisions',
    description:
      'Understand what TabPFN v2 changed, when it still makes sense to start there, and how to choose between local inference, the client path, and hosted evaluation.',
    h1: 'TabPFN v2: what matters when you are choosing a workflow',
    eyebrow: 'Version guide',
    intent: 'For buyers and builders who know the name TabPFN v2 but want the practical choice, not just the release headline.',
    lede:
      'TabPFN v2 matters because it turned tabular prediction into a foundation-model workflow: no long tuning loop, one forward-pass mindset, and a much cleaner path from benchmark to production. The real question is not whether v2 was important. It is which part of the current ecosystem you should start with now.',
    sections: [
      {
        heading: 'What v2 changed in practice',
        paragraphs: [
          'The v2 era made TabPFN feel like a product category rather than a research curiosity. Teams could think in terms of classification, regression, reusable embeddings, and hosted inference instead of hand-building every experiment around classical tabular baselines.',
          'For most teams, the operational change was even bigger than the raw score change: faster first benchmarks, less hyperparameter anxiety, and a more believable path from notebook proof to stakeholder review.',
        ],
        bullets: [
          'Good first fit: small to medium tables where tuning time is the real bottleneck.',
          'Still useful to inspect: checkpoint choice, licensing, and whether your workflow is local or cloud-based.',
          'Best outcome: turn one benchmark into a repeatable evaluation motion instead of a one-off demo.',
        ],
      },
      {
        heading: 'How to decide between local, client, and paid workflow',
        paragraphs: [
          'Use the open package when you want local control and you already have Python plus enough compute. Use the client path when you want hosted inference, lighter setup, or native handling for text-rich tables. Use a paid workflow when you want the buying and benchmarking step to happen in one place for a team.',
          'That is why the first screen on this site starts with a dataset fit scan. Most buyers are not asking whether TabPFN is famous enough; they are asking whether their specific table is a clean fit.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Should I still care about TabPFN v2 if newer versions exist?',
        answer:
          'Yes. The v2 framing explains the core workflow and many of the terms people still search for, even if your actual benchmark may use a newer checkpoint or the client path.',
      },
      {
        question: 'What is the fastest way to evaluate it on a real dataset?',
        answer:
          'Start with one table, identify the likely target, and decide whether you need the local package, the API client, or the forecasting stack before opening a paid workflow.',
      },
    ],
  },
  {
    path: '/tabpfn-paper',
    title: 'TabPFN Paper Explained for Product and ML Teams',
    description:
      'A practical reading of the TabPFN paper: what the original claims mean, where the benchmark boundaries matter, and how to turn the research result into a buying decision.',
    h1: 'TabPFN paper: what to extract before you trust the benchmark',
    eyebrow: 'Paper reading',
    intent: 'For readers who saw the paper cited everywhere and now want to know what the result means for an actual product decision.',
    lede:
      'The original TabPFN paper matters because it reframed tabular prediction as in-context learning over labeled examples, delivered in a single forward pass. That is a big idea. It also came with clear dataset assumptions that buyers should understand before overgeneralizing it.',
    sections: [
      {
        heading: 'The original claim, translated into buyer language',
        paragraphs: [
          'The paper showed that a trained transformer could solve many small tabular classification tasks extremely quickly without per-dataset parameter updates. That means less time spent tuning and more time deciding whether the workflow actually fits your data.',
          'This is not just a performance story. It is also a workflow story: training and prediction happen inside the forward pass, which changes how fast you can test an idea and how easily you can compare against tree baselines.',
        ],
      },
      {
        heading: 'Why the benchmark boundary still matters',
        paragraphs: [
          'The original paper was strongest on small numerical classification datasets with explicit size constraints. That is still important context. If your real dataset is much wider, much larger, text-heavy, or time-based, you should move quickly into the right newer path instead of pretending the original benchmark already answered everything.',
          'A useful paper page should not inflate the claim. It should help you choose the right next benchmark.',
        ],
        bullets: [
          'Read the paper for the core idea.',
          'Use the Nature result for broader confidence on small data.',
          'Use the client, forecasting, or scaling path when your dataset shape pushes beyond the original boundary.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does the original paper cover regression and forecasting?',
        answer:
          'The original paper centered on small tabular classification. Later work, the broader product ecosystem, and the forecasting stack extend the usable surface.',
      },
      {
        question: 'What should I benchmark against first?',
        answer:
          'Usually your current tree baseline. Buyers care whether TabPFN beats the workflow they already trust, not whether it only wins in a vacuum.',
      },
    ],
  },
  {
    path: '/tabpfn-huggingface',
    title: 'TabPFN Hugging Face Checkpoint Guide',
    description:
      'Use the TabPFN Hugging Face model cards wisely: checkpoint choice, license questions, local package workflow, and how to avoid unnecessary setup drag.',
    h1: 'TabPFN on Hugging Face: which checkpoint and why',
    eyebrow: 'Checkpoint guide',
    intent: 'For teams deciding whether to start from model cards and local checkpoints or skip straight to a hosted client workflow.',
    lede:
      'Hugging Face is where many teams first meet the actual weights and licenses around TabPFN. That is useful, but it also creates friction if your real goal is to test a business table quickly instead of curating local model files.',
    sections: [
      {
        heading: 'What the Hugging Face pages are good for',
        paragraphs: [
          'The model cards tell you what family you are dealing with, which checkpoints are available, and where the license boundary sits. That is the right place to start if you need local control or you want to understand which version of the model your benchmark should reference.',
          'For smaller teams, the mistake is turning checkpoint selection into a week-long detour. If you just need a fast answer on your data, the client or hosted path can compress the time-to-first-result dramatically.',
        ],
        bullets: [
          'Use the model cards to understand local inference and licensing.',
          'Use the hosted path if GPU setup is not the value you are trying to prove.',
          'Keep benchmark notes tied to the exact checkpoint and data slice you used.',
        ],
      },
      {
        heading: 'When local inference is the right move',
        paragraphs: [
          'Local inference is best when data cannot leave your environment, or when the team already has the Python and GPU tooling in place. In that case, the Hugging Face model page is an operational starting point, not just a reference link.',
          'If that is not your world, the better buying motion is usually to keep setup small and judge the workflow first.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Is Hugging Face the best first step for every team?',
        answer:
          'No. It is best for checkpoint control and local workflows. Teams focused on speed, production, or lighter setup often move faster through the client or a hosted evaluation layer.',
      },
      {
        question: 'What should I note from the model card before a benchmark?',
        answer:
          'Record the checkpoint family, license terms, and whether your benchmark is local, API-based, or tied to a specific model card version.',
      },
    ],
  },
  {
    path: '/tabpfn-ts',
    title: 'TabPFN-TS for Zero-Shot Forecasting',
    description:
      'Learn when TabPFN-TS is the right forecasting path, how it reframes time series as tabular regression, and what to verify before you pay for a rollout.',
    h1: 'TabPFN-TS: when forecasting belongs in your first test',
    eyebrow: 'Forecasting path',
    intent: 'For teams with a time column, a horizon, and no desire to build a giant forecasting stack before knowing if the approach works.',
    lede:
      'TabPFN-TS is useful because it takes the tabular foundation-model idea into zero-shot forecasting. Instead of assuming you need a long modeling cycle or a specialized sequence stack first, it asks whether a well-framed tabular regression setup gets you most of the value much faster.',
    sections: [
      {
        heading: 'What the TabPFN-TS workflow actually does',
        paragraphs: [
          'The core move is to turn a univariate time series into a table, enrich it with lightweight features, and then run regression with TabPFN. That makes forecasting accessible to teams who already think in tables and covariates rather than custom sequence models.',
          'This is especially attractive when you need a quick answer on demand, promotion, temperature, or seasonality effects before you commit to a heavier forecasting platform.',
        ],
        bullets: [
          'Best for zero-shot or rapid first-pass forecasting.',
          'Useful when external covariates matter.',
          'Worth testing when the real bottleneck is setup complexity, not feature invention.',
        ],
      },
      {
        heading: 'When to choose it over a generic tabular benchmark',
        paragraphs: [
          'If you have an obvious date column and a future target, the forecasting path should be explicit from the start. Teams lose time when they force a forecasting problem into a generic benchmark and then have to retrofit horizon logic later.',
          'That is why the dataset scanner on the homepage pushes date-plus-numeric tables toward TabPFN-TS immediately.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do I need my own GPU to try TabPFN-TS?',
        answer:
          'Not necessarily. The project notes that tabpfn-client can be used as the default engine, which reduces local hardware friction.',
      },
      {
        question: 'What should I define before a paid rollout?',
        answer:
          'Define the horizon, the evaluation metric, and which exogenous features you trust enough to include from day one.',
      },
    ],
  },
  {
    path: '/tabpfn-nature',
    title: 'TabPFN Nature Paper: What the Result Means',
    description:
      'A practical guide to the TabPFN Nature paper: what was published on January 8, 2025, what it proves on small data, and how to use it without overclaiming.',
    h1: 'TabPFN Nature result: useful confidence, not blind permission',
    eyebrow: 'Nature paper',
    intent: 'For technical buyers who need to understand what the Nature publication actually supports before taking it into a roadmap or budget request.',
    lede:
      'The Nature paper is a strong credibility signal because it shows TabPFN outperforming previous methods on small data while expanding the foundation-model story around embeddings, generation, and fine-tuning. The best use of that signal is to sharpen evaluation, not to skip it.',
    sections: [
      {
        heading: 'What the Nature publication established',
        paragraphs: [
          'The published result framed TabPFN as a tabular foundation model that beats earlier methods on datasets with up to 10,000 samples while using far less training time. It also highlighted that the same model family can support data generation, reusable embeddings, density estimation, and fine-tuning.',
          'That matters commercially because buyers want both performance and product surface. A model that only wins one benchmark but does not open adjacent value is harder to justify.',
        ],
      },
      {
        heading: 'How to use the paper in a real buying conversation',
        paragraphs: [
          'Use it as proof that the method deserves a serious benchmark on your table. Do not use it as a blanket claim that every tabular problem is already solved. The right motion is confidence first, then scope discipline.',
          'A good commercial site makes that easy by showing the likely path for your specific table before asking for payment.',
        ],
        bullets: [
          'Date to remember: published January 8, 2025.',
          'Strongest signal: small-data prediction quality and speed.',
          'Next action: run a benchmark on your table shape, not on abstract hype.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does the Nature paper replace the need for a local benchmark?',
        answer:
          'No. It just makes the benchmark worth taking seriously. Your target definition, table shape, and operational constraints still decide the fit.',
      },
      {
        question: 'Why does the paper matter to a non-research buyer?',
        answer:
          'It lowers credibility risk. Buyers often need one strong external signal before they spend attention on a new workflow.',
      },
    ],
  },
  {
    path: '/tabpfn-r',
    title: 'TabPFN R Wrapper Guide',
    description:
      'See how TabPFN R works, when analysts should use it, what the token flow looks like, and where the privacy boundary sits before you run real data.',
    h1: 'TabPFN R: the fast path for analyst-heavy teams',
    eyebrow: 'R workflow',
    intent: 'For data teams who live in R first and do not want Python setup to be the reason a good model never gets tested.',
    lede:
      'The R wrapper matters because many teams discover TabPFN from the Python side and assume that is the only serious workflow. It is not. R users can reach the cloud-based service directly, which can make adoption much easier for analyst-led groups.',
    sections: [
      {
        heading: 'What the R package changes operationally',
        paragraphs: [
          'The R package gives analysts a direct path into the hosted TabPFN service with a familiar object interface. That means less translation work between Python-first and R-first teammates during the first evaluation sprint.',
          'The real decision is not whether R can call it. It is whether your team is comfortable with the hosted data flow and token management that comes with that convenience.',
        ],
        bullets: [
          'Best for analysts who want to stay in RStudio or an R-native workflow.',
          'Uses an access token from the Prior Labs account flow.',
          'Appropriate only when your data-sharing policy allows the hosted client path.',
        ],
      },
      {
        heading: 'What to verify before you use it on real data',
        paragraphs: [
          'The repository notes that this is a cloud-based service and explicitly warns against uploading sensitive or unauthorized data. That is not fine print. It should be part of your evaluation checklist.',
          'If those constraints are acceptable, the R path is a strong way to widen adoption beyond one Python expert.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Do R users need a separate credential from Python users?',
        answer:
          'The wrapper uses the same access-token concept as the Python client flow, so the account and policy story should be coordinated across the team.',
      },
      {
        question: 'When should an R team avoid this path?',
        answer:
          'Avoid it when the dataset cannot be sent to a hosted service or when procurement requires a more controlled deployment path first.',
      },
    ],
  },
  {
    path: '/tabpfn-architecture',
    title: 'TabPFN Architecture Explained',
    description:
      'Understand the TabPFN architecture without the fog: prior-data fitted networks, in-context learning, single forward-pass prediction, and what that means for product speed.',
    h1: 'TabPFN architecture: why one forward pass changes the workflow',
    eyebrow: 'Architecture',
    intent: 'For readers who keep seeing “prior-data fitted network” and want the architectural idea in plain but accurate language.',
    lede:
      'The architecture matters because it explains why TabPFN feels so different from tuning-heavy tabular workflows. Instead of re-optimizing weights for every dataset, it uses a pre-trained transformer to consume labeled context and produce predictions directly.',
    sections: [
      {
        heading: 'The short version',
        paragraphs: [
          'TabPFN is trained offline on large numbers of synthetic datasets so that the model learns how to infer from tabular context itself. At inference time, you give it training rows and unlabeled test rows together, and it predicts in one forward pass.',
          'That is the essence of the prior-data fitted network idea: the learning algorithm is mostly encoded in the weights before your dataset arrives.',
        ],
        bullets: [
          'In-context learning instead of per-dataset training loops.',
          'Training and test rows appear together at inference time.',
          'The architectural payoff is speed and less tuning overhead.',
        ],
      },
      {
        heading: 'Why architecture matters to a buyer',
        paragraphs: [
          'Architectural ideas are only useful if they change the operating experience. Here, they do. Teams can reach a believable first benchmark faster, and the product conversation shifts from endless tuning to fit, limits, and deployment path.',
          'This is also why the architecture page should connect back to the client, forecasting, and scaling choices instead of acting like a theory silo.',
        ],
      },
    ],
    faqs: [
      {
        question: 'Does one forward pass mean there is no setup at all?',
        answer:
          'No. You still need the right package, checkpoint, or API path. The difference is that you are not running a classic training loop for every new small table.',
      },
      {
        question: 'Why does the synthetic prior matter?',
        answer:
          'It is how the model learns a broad family of tabular behaviors before it sees your real dataset, which is the basis for the fast in-context inference story.',
      },
    ],
  },
  {
    path: '/tabpfn-client',
    title: 'Tabpfn-client Guide for Hosted Inference',
    description:
      'Use tabpfn-client intelligently: hosted inference, size limits, privacy tradeoffs, and when the API path is cleaner than local setup.',
    h1: 'tabpfn-client: the fastest path when setup is the enemy',
    eyebrow: 'API client',
    intent: 'For teams that want TabPFN results quickly and would rather not make local GPU setup the main project.',
    lede:
      'tabpfn-client is the practical answer when the model is interesting but local setup is not the business value you need to prove. It gives API access to hosted inference, which makes it especially attractive for production-minded teams and shared evaluations.',
    sections: [
      {
        heading: 'Why the client path converts well',
        paragraphs: [
          'It removes the slowest early friction: hardware assumptions, checkpoint handling, and environment drift. That is often the difference between a real benchmark this week and a postponed experiment that never gets finished.',
          'It also aligns with how many teams buy: they want a managed path first, then they decide whether deeper local control is worth it.',
        ],
        bullets: [
          'Good fit for teams without spare GPU time.',
          'Good fit for shared evaluation and fast production pilots.',
          'Important caution: your data is sent to a hosted service for processing.',
        ],
      },
      {
        heading: 'What to check before you rely on it',
        paragraphs: [
          'The repository documents practical request limits, including a maximum total-cell budget and a regression edge case around large full-output requests. Those details matter because they tell you whether the API path is a friction remover or an eventual bottleneck for your table.',
          'If the limits are fine and policy allows the upload, this is usually the cleanest first move.',
        ],
      },
    ],
    faqs: [
      {
        question: 'When is the client better than the local package?',
        answer:
          'When speed, team accessibility, or managed infrastructure matter more than local checkpoint control.',
      },
      {
        question: 'What should I verify before a paid workflow?',
        answer:
          'Verify data-sharing rules, total table size, and whether the likely target task is classification, regression, or forecasting.',
      },
    ],
  },
]

const keywordPageMap = new Map(keywordPages.map((page) => [page.path, page]))

export function normalizeKeywordPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

export function findKeywordPageByPath(pathname: string) {
  return keywordPageMap.get(normalizeKeywordPath(pathname)) ?? null
}
