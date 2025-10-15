export interface TopicGuideStoryline {
  title: string
  description: string
  prompt: string
}

export interface TopicGuidePlayer {
  name: string
  role: string
  whyItMatters: string
}

export interface TopicGuideSignal {
  title: string
  description: string
}

export interface TopicGuideNextStep {
  title: string
  description: string
}

export interface TopicGuideExploreQuestion {
  id: string
  question: string
  explanation: string
  angles: string[]
  followUps: string[]
  proofPoints: string[]
  suggestedSearches: string[]
}

export interface TopicGuideExploreGroup {
  title: string
  description: string
  questions: TopicGuideExploreQuestion[]
}

export interface TopicGuideExploreFramework {
  title: string
  description: string
  searchPlaceholder: string
  searchExamples: string[]
  groups: TopicGuideExploreGroup[]
}

export interface TopicGuideContent {
  headline: string
  intro: string
  reassurance: string
  quickPrompts: string[]
  storylines: TopicGuideStoryline[]
  keyPlayers: TopicGuidePlayer[]
  signals: TopicGuideSignal[]
  nextSteps: TopicGuideNextStep[]
  exploreFramework?: TopicGuideExploreFramework
}

type TopicGuideLibrary = Record<string, TopicGuideContent>

const GUIDE_LIBRARY: TopicGuideLibrary = {
  advertising: {
    headline: 'Make every campaign defend its spend.',
    intro: 'Advertising and marketing now span retail media, streaming, social commerce, and privacy-safe measurement. This guide helps you connect channel choices to budget decisions, creative experiments, and proof of performance.',
    reassurance: 'If the ecosystem feels noisy, pick the funnel stage and decision-maker you care about—CMO budget owners, media buyers, or creative leads—then pair it with one of the prompts below.',
    quickPrompts: [
      'Which brands are reallocating linear TV budgets into connected TV and streaming packages this quarter?',
      'How are CPG marketers using retailer first-party data to personalize campaigns inside retail media networks?',
      'What partnerships are agencies forming to replace third-party cookies with clean-room measurement?',
      'Where are advertisers deploying generative AI to scale creative production and what performance lift do they report?',
      'How are privacy rulings and platform policy changes reshaping social ad targeting in Europe?'
    ],
    storylines: [
      {
        title: 'Retail media land grab',
        description: 'Grocery chains, marketplaces, and delivery apps pitch closed-loop sales data. Track how brands split spend across Amazon, Walmart, Instacart, and regional networks.',
        prompt: 'retail media ad spend cpg case study 2025'
      },
      {
        title: 'Measurement and privacy reset',
        description: 'Cookie deprecation and platform privacy rules push marketers toward clean rooms, MMM, and first-party data collaborations.',
        prompt: 'advertising clean room measurement partnership 2025'
      },
      {
        title: 'Creative automation arms race',
        description: 'Teams test AI-assisted studios, dynamic creative, and creator collaborations to produce assets faster without losing brand safety.',
        prompt: 'generative ai advertising creative performance lift'
      }
    ],
    keyPlayers: [
      {
        name: 'Brand CMOs and performance leads',
        role: 'CPG, auto, finance, and retail marketers controlling the largest budgets',
        whyItMatters: 'Their budget commentary highlights which channels and KPIs justify spend.'
      },
      {
        name: 'Platforms and walled gardens',
        role: 'Amazon Ads, Google, Meta, TikTok, Walmart Connect, Roku, and streaming publishers',
        whyItMatters: 'Product updates and policy changes signal which levers are available to advertisers.'
      },
      {
        name: 'Agencies and measurement partners',
        role: 'Holding companies, independent performance shops, clean-room and MMM providers',
        whyItMatters: 'They translate strategy into buys and expose gaps in talent, tooling, or proof.'
      }
    ],
    signals: [
      {
        title: 'Upfront commitments and ad revenue guidance',
        description: 'Upfront deals and publisher earnings show where budgets are growing or at risk.'
      },
      {
        title: 'Retail media roadmap updates',
        description: 'Self-serve tools, attribution APIs, and fulfillment tie-ins reveal how networks compete for dollars.'
      },
      {
        title: 'Privacy enforcement and policy shifts',
        description: 'FTC, ICO, and CNIL rulings—or Apple and Google privacy updates—trigger targeting and measurement resets.'
      }
    ],
    nextSteps: [
      {
        title: 'Pick the funnel moment',
        description: 'Clarify whether you need awareness, consideration, or performance KPIs so results match expected metrics.'
      },
      {
        title: 'Name the channel or format',
        description: 'Add “retail media”, “CTV”, “paid search”, “social commerce”, or “OOH” to narrow the landscape.'
      },
      {
        title: 'Ask for proof',
        description: 'Combine the topic with “ROAS”, “incrementality study”, or “brand lift” to surface evidence you can cite.'
      }
    ],
    exploreFramework: {
      title: 'Narrow the brief',
      description: 'Choose the decision you need to support, then layer a location, audience, or brand to make it actionable.',
      searchPlaceholder: 'Search advertising by channel, audience, or company...',
      searchExamples: [
        'retail media strategy grocery brands 2025',
        'connected tv ad spend auto makers performance',
        'cookie deprecation clean room partnerships europe'
      ],
      groups: [
        {
          title: 'Budget shifts',
          description: 'Follow where money is moving and what leaders expect in return.',
          questions: [
            {
              id: 'retail-media',
              question: 'Who is shifting budget into retail media networks and what results are they seeing?',
              explanation: 'Scan for CPG, grocery, and DTC brands sharing sales lift after testing Walmart Connect, Amazon Ads, Instacart, or Carrefour Media.',
              angles: [
                'CPG budgets',
                'Closed-loop attribution',
                'Agency services'
              ],
              followUps: [
                'Which retailers launched new targeting or attribution tools to win national brand budgets?',
                'How are media agencies reorganizing teams around retail media expertise?',
                'What ROAS benchmarks are brands sharing after integrating first-party shopper data?'
              ],
              proofPoints: [
                'Retailer and marketplace earnings calls highlighting advertising revenue growth',
                'Brand case studies quantifying incremental sales from retail media pilots',
                'Analyst or consultancy reports comparing retail media network performance'
              ],
              suggestedSearches: [
                'retail media network CPG case study 2025',
                'Walmart Connect attribution API announcement',
                'media agency retail media practice restructuring'
              ]
            },
            {
              id: 'streaming-upfronts',
              question: 'How are streaming and CTV packages competing with traditional TV upfronts?',
              explanation: 'Look at upfront commitments, bundling strategies, and measurement partnerships among Disney+, Netflix, Peacock, Roku, and legacy broadcasters.',
              angles: [
                'CTV measurement',
                'Premium video inventory',
                'Brand safety guarantees'
              ],
              followUps: [
                'What audience guarantees or currency experiments are networks using to close upfront deals?',
                'Which advertisers shifted a percentage of linear budgets into CTV this season?',
                'How are alternative currencies like VideoAmp or iSpot factoring into negotiations?'
              ],
              proofPoints: [
                'Upfront recap articles quoting buyers on spend allocation',
                'Publisher investor presentations detailing CTV revenue growth',
                'Measurement partnership press releases outlining methodology or pilots'
              ],
              suggestedSearches: [
                '2025 upfront CTV spend allocation brands',
                'Netflix advertising measurement partner announcement',
                'VideoAmp currency adoption major advertisers'
              ]
            },
            {
              id: 'performance-rebalance',
              question: 'Where are marketers cutting paid social or search spend and reallocating acquisition budgets?',
              explanation: 'Track DTC brands, SaaS marketers, and marketplaces discussing customer acquisition cost pressure and channel mix adjustments.',
              angles: [
                'Customer acquisition cost',
                'Channel diversification',
                'In-house versus agency'
              ],
              followUps: [
                'Which campaigns paused spend on Meta or Google due to rising cost per acquisition?',
                'What alternative channels such as affiliate, partnerships, or offline experiments are getting new tests?',
                'How are finance leaders tying marketing efficiency targets to spend decisions?'
              ],
              proofPoints: [
                'Earnings call transcripts referencing marketing efficiency or CAC',
                'Investor letters outlining channel mix shifts',
                'Case studies on reallocating spend from search or social to partnerships'
              ],
              suggestedSearches: [
                'paid social CAC pressure channel shift 2025',
                'DTC marketing budget reallocation case study',
                'SaaS customer acquisition efficiency earnings call'
              ]
            }
          ]
        },
        {
          title: 'Creative and formats',
          description: 'Understand which stories, assets, and experiences are breaking through.',
          questions: [
            {
              id: 'gen-ai-creative',
              question: 'Which teams are scaling generative AI creative testing and how do they govern brand safety?',
              explanation: 'Spot advertisers piloting AI production with partners like Adobe, Jasper, or in-house studios, and note the legal guardrails they use.',
              angles: [
                'Creative automation',
                'Brand governance',
                'Production timelines'
              ],
              followUps: [
                'What review workflows or disclosure policies do marketers put in place for AI-generated assets?',
                'How do creative teams measure performance lift versus human-only variants?',
                'Which vendors or agencies are bundling AI tooling with managed services?'
              ],
              proofPoints: [
                'Press releases or conference talks sharing AI creative pilot results',
                'Brand safety guidelines or policy updates referencing AI use',
                'Benchmark studies comparing AI-generated versus traditional creative performance'
              ],
              suggestedSearches: [
                'generative AI advertising creative case study 2025',
                'brand safety policy generative content marketing',
                'agency ai production studio launch'
              ]
            },
            {
              id: 'creator-collabs',
              question: 'How are brands partnering with creators and influencers to reach fragmented audiences?',
              explanation: 'Investigate always-on creator programs, TikTok Spark Ads, and affiliate hybrids from beauty, gaming, and finance brands.',
              angles: [
                'Influencer compensation',
                'Full-funnel creator programs',
                'Commerce integration'
              ],
              followUps: [
                'Which brands extended creator contracts into year-long ambassador programs?',
                'How are marketers linking creator content to social commerce or live shopping conversions?',
                'What compliance or disclosure rules shape creator briefs in regulated sectors?'
              ],
              proofPoints: [
                'Creator marketing platform reports on ROI or conversion metrics',
                'Brand case studies highlighting affiliate or live shopping results',
                'Regulatory guidance or enforcement around influencer disclosure'
              ],
              suggestedSearches: [
                'creator marketing program case study ROAS',
                'TikTok Spark Ads commerce conversion data',
                'financial services influencer disclosure enforcement'
              ]
            },
            {
              id: 'immersive-formats',
              question: 'What new ad formats are converting shoppers faster than standard display?',
              explanation: 'Look for shoppable video pilots, AR try-on experiences, audio ads, and branded entertainment experiments.',
              angles: [
                'Shoppable media',
                'Immersive experiences',
                'Conversion lift'
              ],
              followUps: [
                'Which retailers or streaming platforms launched interactive ad formats with conversion benchmarks?',
                'How are brands measuring the impact of AR try-on or 3D product demos?',
                'What production or data partners enable these high-touch experiences?'
              ],
              proofPoints: [
                'Platform case studies citing conversion lift for interactive formats',
                'Brand testimonials about AR or shoppable campaign results',
                'Partnership announcements between technology vendors and advertisers'
              ],
              suggestedSearches: [
                'shoppable video ad conversion case study',
                'AR try-on advertising performance metrics',
                'interactive ad format partnership announcement'
              ]
            }
          ]
        },
        {
          title: 'Measurement and data',
          description: 'Decode how teams prove impact and stay compliant.',
          questions: [
            {
              id: 'clean-room',
              question: 'Which marketers adopted clean rooms or MMM to prove incrementality post-cookie?',
              explanation: 'Review collaborations between brands, publishers, and partners such as Snowflake, LiveRamp, or Infosum.',
              angles: [
                'Incrementality proof',
                'Data collaboration',
                'Modeling talent'
              ],
              followUps: [
                'What clean-room partnerships are retailers or publishers offering to advertisers?',
                'How are brands balancing multi-touch attribution, MMM, and experimentation?',
                'Which teams are hiring data scientists specifically for marketing effectiveness?'
              ],
              proofPoints: [
                'Press releases announcing clean-room or measurement partnerships',
                'Case studies quantifying incrementality or attribution improvements',
                'Job postings or org charts highlighting new marketing science roles'
              ],
              suggestedSearches: [
                'advertising clean room partnership announcement',
                'marketing mix modeling incrementality case study',
                'marketing science team hiring news'
              ]
            },
            {
              id: 'first-party-data',
              question: 'How are loyalty programs and CRM data powering personalized media plans?',
              explanation: 'Track retailers, airlines, and QSR brands syncing loyalty IDs with media networks and publishers.',
              angles: [
                'Identity resolution',
                'Loyalty value exchange',
                'Omnichannel personalization'
              ],
              followUps: [
                'Which campaigns combine loyalty data with connected TV or digital out-of-home?',
                'How do brands communicate value exchange to convince customers to share data?',
                'What integrations between customer data platforms and ad systems enable near real-time activation?'
              ],
              proofPoints: [
                'Announcements about loyalty program media partnerships',
                'Customer sentiment studies on data sharing for personalized offers',
                'Integration case studies from CDP vendors and ad tech partners'
              ],
              suggestedSearches: [
                'loyalty data connected tv campaign case study',
                'customer data platform advertising integration 2025',
                'personalized offer opt-in consumer sentiment report'
              ]
            },
            {
              id: 'privacy-updates',
              question: 'What privacy rulings or platform policies changed how targeting works this quarter?',
              explanation: 'Monitor enforcement from the FTC, ICO, CNIL, and updates from Apple, Google Privacy Sandbox, and Meta.',
              angles: [
                'Compliance timelines',
                'Signal loss mitigation',
                'Regional differences'
              ],
              followUps: [
                'Which advertisers faced fines or warnings for misuse of customer data in advertising?',
                'How are ad-tech vendors adapting products to comply with new consent requirements?',
                'What regional guidance should global brands follow to avoid inconsistent targeting rules?'
              ],
              proofPoints: [
                'Regulatory announcements citing specific enforcement actions',
                'Product roadmaps detailing Privacy Sandbox or App Tracking Transparency compliant solutions',
                'Industry benchmarks on post-cookie performance changes'
              ],
              suggestedSearches: [
                'privacy sandbox advertiser impact 2025',
                'FTC advertising data enforcement case',
                'EU consent rule change targeted advertising response'
              ]
            }
          ]
        }
      ]
    }
  },
  ai: {
    headline: 'Where imagination meets automation.',
    intro: 'Artificial intelligence ranges from pragmatic automation to frontier research. Use this guide to decide whether you care about policy debates, new products, or how teams are actually adopting AI.',
    reassurance: 'Not sure what to type into the search bar? Start with the problem you want to solve—efficiency, trust, safety, or growth—and pair it with one of the prompts below.',
    quickPrompts: [
      'How are teams in my industry piloting AI tools without breaking compliance rules?',
      'What guardrails are governments setting for generative AI deployment this quarter?',
      'Which startups are turning AI research breakthroughs into real products?',
      'Where is AI creating talent bottlenecks or new job titles?',
      'How are customers reacting to AI-powered experiences?'
    ],
    storylines: [
      {
        title: 'Safety vs. shipping',
        description: 'Companies are racing to roll out AI assistants while regulators emphasise responsible deployment. Track how major platforms balance velocity, trust, and transparency.',
        prompt: 'AI launch regulation transparency case study'
      },
      {
        title: 'Productivity dividend',
        description: 'Teams want proof that AI saves hours or money. Follow pilots in customer support, software development, and operations to surface early ROI stories.',
        prompt: 'AI pilot productivity results 2025'
      },
      {
        title: 'Compute crunch',
        description: 'Chip supply, energy demand, and cloud partnerships define who can train the next big model. Watch infrastructure deals and power grid investments.',
        prompt: 'AI training infrastructure partnerships'
      }
    ],
    keyPlayers: [
      {
        name: 'Frontier model labs',
        role: 'OpenAI, Anthropic, Google DeepMind, Meta',
        whyItMatters: 'Their release notes and safety pledges set expectations for everyone else.'
      },
      {
        name: 'Applied AI teams',
        role: 'Microsoft Copilot, Adobe Firefly, enterprise automation startups',
        whyItMatters: 'Show how AI is adopted inside workflows that touch millions of users.'
      },
      {
        name: 'Regulators & standards bodies',
        role: 'EU AI Act committees, US NIST, national data protection authorities',
        whyItMatters: 'Their compliance timelines signal risks and opportunities for new products.'
      }
    ],
    signals: [
      {
        title: 'New job postings mentioning AI',
        description: 'Spikes show where adoption is moving from pilots to headcount budgets.'
      },
      {
        title: 'Responsible AI commitments',
        description: 'Track voluntary safety frameworks, transparency reports, and audit requirements.'
      },
      {
        title: 'GPU and data-center capacity announcements',
        description: 'Investment in compute and energy reveals who will dominate training and inference.'
      }
    ],
    nextSteps: [
      {
        title: 'Pick a sector',
        description: 'Refine your search with an industry: healthcare, finance, education, retail, or public sector.'
      },
      {
        title: 'Decide the angle',
        description: 'Do you want a policy story, a product launch recap, a talent piece, or customer impact? Use that language in your query.'
      },
      {
        title: 'Add proof',
        description: 'Pair your topic with metrics like “market size”, “pilot results”, or “case study” to surface concrete evidence.'
      }
    ]
  },
  environment: {
    headline: 'From climate pledges to projects you can quantify.',
    intro: 'Environment & climate coverage spans global policy, local resilience, green finance, and new technology. This guide helps you ground broad climate ideas in real projects and stakeholders.',
    reassurance: 'If climate feels overwhelming, focus on one lever: policy, finance, technology, or community response—then combine it with a location or sector.',
    quickPrompts: [
      'Which cities announced new climate adaptation plans this month?',
      'How are insurers pricing climate risk for businesses?',
      'What funding is flowing into carbon removal and why now?',
      'How are communities responding to extreme weather alerts?',
      'Where are supply chains facing climate-related delays?'
    ],
    storylines: [
      {
        title: 'From pledges to delivery',
        description: 'Governments and corporations promised net-zero targets—follow which ones have budgets, measurements, and procurement underway.',
        prompt: 'net zero implementation progress 2025 budget'
      },
      {
        title: 'Resilience economy',
        description: 'Weather extremes are creating new markets for flood tech, wildfire defence, and heat mitigation. Map the startups and city contracts.',
        prompt: 'climate resilience technology city contract'
      },
      {
        title: 'Climate meets finance',
        description: 'Sustainable finance, disclosure rules, and ESG backlash reveal where capital wants credible impact.',
        prompt: 'sustainable finance regulation investor response'
      }
    ],
    keyPlayers: [
      {
        name: 'Transition financiers',
        role: 'Multilateral banks, green bond issuers, corporate sustainability offices',
        whyItMatters: 'Funding signals which decarbonisation bets are bankable.'
      },
      {
        name: 'Adaptation innovators',
        role: 'Flood analytics firms, climate insurance startups, resilient infrastructure builders',
        whyItMatters: 'They turn climate risk into products and services governments can buy.'
      },
      {
        name: 'Grassroots coalitions',
        role: 'Community organisations, youth climate movements, local resilience task forces',
        whyItMatters: 'They influence public support and keep leaders accountable.'
      }
    ],
    signals: [
      {
        title: 'Policy deadlines approaching',
        description: 'Implementation milestones—like emission reporting or building code changes—create newsworthy pressure.'
      },
      {
        title: 'Insurance coverage shifts',
        description: 'When insurers exit a region, it forces new financing tools and public debates.'
      },
      {
        title: 'Corporate procurement trends',
        description: 'Large buyers sourcing green steel, sustainable aviation fuel, or low-carbon cement highlight demand.'
      }
    ],
    nextSteps: [
      {
        title: 'Add geography',
        description: 'Combine your query with a city, region, or country to surface actionable examples.'
      },
      {
        title: 'Follow the money',
        description: 'Use terms like “investment”, “grant”, or “contract” to find who is funding projects.'
      },
      {
        title: 'Check real-world signals',
        description: 'Search for “pilot”, “deployment”, or “trial” to see what has moved beyond proposals.'
      }
    ]
  },
  business: {
    headline: 'Markets, decisions, and the forces behind them.',
    intro: 'Business coverage connects company moves to macro trends. Use this guide to map strategy, competition, and customer behaviour.',
    reassurance: 'Unsure where to begin? Start with a company or customer segment you care about, then layer in a force—technology, regulation, capital, or culture.',
    quickPrompts: [
      'Which companies are adjusting guidance because of new regulation?',
      'Where are consumers cutting back or splurging despite economic headwinds?',
      'Which mergers or partnerships are reshaping a market?',
      'How are supply chain leaders preparing for geopolitical shocks?',
      'What metrics signal the market shifted from growth to efficiency?'
    ],
    storylines: [
      {
        title: 'Defensive vs. offensive strategy',
        description: 'Companies balance cost cutting with new bets. Watch earnings calls and product roadmaps for the story they emphasise.',
        prompt: 'company strategic pivot cost cutting innovation'
      },
      {
        title: 'Customer behaviour reset',
        description: 'Inflation, interest rates, and cultural shifts change what buyers value. Follow loyalty programs, pricing experiments, and churn.',
        prompt: 'consumer behaviour shift loyalty program data'
      },
      {
        title: 'New power coalitions',
        description: 'Alliances between incumbents and startups reveal emerging ecosystems in AI, climate tech, and fintech.',
        prompt: 'strategic partnership announcement emerging ecosystem'
      }
    ],
    keyPlayers: [
      {
        name: 'Operators on earnings calls',
        role: 'CEOs, CFOs, and COOs explaining short-term tradeoffs',
        whyItMatters: 'They supply quotable evidence of where the market is moving.'
      },
      {
        name: 'Customers & end users',
        role: 'Communities posting reviews, case studies, or policy feedback',
        whyItMatters: 'Their reactions validate or challenge the company narrative.'
      },
      {
        name: 'Regulators & watchdogs',
        role: 'Competition authorities, privacy agencies, consumer advocacy groups',
        whyItMatters: 'They decide whether new business models can scale.'
      }
    ],
    signals: [
      {
        title: 'Guidance revisions',
        description: 'Upgrades or downgrades in outlook hint at upcoming strategic moves.'
      },
      {
        title: 'Hiring slowdowns or surges',
        description: 'LinkedIn and job board trends reveal whether growth bets are on or paused.'
      },
      {
        title: 'Supply chain rerouting',
        description: 'Changes in shipping lanes or sourcing partners often precede price changes.'
      }
    ],
    nextSteps: [
      {
        title: 'Choose the lens',
        description: 'Finance, operations, product, or customer? Write that lens into your search, e.g., “customer churn + subscription media.”'
      },
      {
        title: 'Anchor the timeline',
        description: 'Add “this quarter”, “since 2023”, or “in 2025 outlook” to control recency.'
      },
      {
        title: 'Compare players',
        description: 'Use “versus”, “alternative”, or “benchmark” to surface competitive dynamics.'
      }
    ]
  },
  healthcare: {
    headline: 'Where science, policy, and patient experience collide.',
    intro: 'Healthcare topics range from hospital operations to biotech breakthroughs. Orient yourself quickly by deciding whether you cover access, innovation, or economics.',
    reassurance: 'If the jargon feels heavy, anchor on the people affected: patients, clinicians, payers, or caregivers—then explore how policy or technology changes their day.',
    quickPrompts: [
      'How are hospitals dealing with workforce shortages right now?',
      'Which digital health pilots graduated into permanent programs?',
      'What new treatments or devices earned expedited approval?',
      'How are insurers responding to rising specialty drug costs?',
      'Where are patient advocates pushing for policy change?'
    ],
    storylines: [
      {
        title: 'Care delivery redesign',
        description: 'Virtual care, remote monitoring, and AI triage are shifting clinical workflows. Track pilot outcomes and clinician feedback.',
        prompt: 'virtual care program results clinician response'
      },
      {
        title: 'Biotech momentum',
        description: 'Gene therapies and precision medicine reshape treatment pathways. Follow trial readouts and reimbursement decisions.',
        prompt: 'gene therapy approval reimbursement debate'
      },
      {
        title: 'Health equity commitments',
        description: 'Systems promise equitable care—investigate the metrics and community partnerships backing those claims.',
        prompt: 'health equity initiative outcomes 2025'
      }
    ],
    keyPlayers: [
      {
        name: 'Care teams',
        role: 'Physicians, nurses, allied health professionals adapting to new tools',
        whyItMatters: 'Their adoption or resistance determines whether an innovation sticks.'
      },
      {
        name: 'Payers & regulators',
        role: 'CMS, national health services, private insurers',
        whyItMatters: 'Coverage decisions decide which innovations reach patients.'
      },
      {
        name: 'Patient communities',
        role: 'Advocacy groups, online support forums, community health workers',
        whyItMatters: 'They surface real-world impact, disparities, and unmet needs.'
      }
    ],
    signals: [
      {
        title: 'Clinical trial milestones',
        description: 'Phase transitions, early data, and safety signals guide investment and policy attention.'
      },
      {
        title: 'Workforce metrics',
        description: 'Vacancy rates or burnout surveys reveal operational pressure points.'
      },
      {
        title: 'Payment reforms',
        description: 'New reimbursement codes or value-based contracts show which models scale.'
      }
    ],
    nextSteps: [
      {
        title: 'Specify the care setting',
        description: 'Add “rural hospital”, “primary care clinic”, or “home health” to surface context that matches your audience.'
      },
      {
        title: 'Layer policy or payer context',
        description: 'Include “Medicare”, “FDA guidance”, or the relevant national agency to understand approval pathways.'
      },
      {
        title: 'Look for outcomes',
        description: 'Pair the topic with “patient outcomes”, “cost savings”, or “adherence” to find measurable impact.'
      }
    ]
  },
  finance: {
    headline: 'Capital flows tell you who gets to move first.',
    intro: 'Finance coverage connects central bank moves, investor sentiment, and company balance sheets. Use this guide to decode risks and opportunities hidden in the numbers.',
    reassurance: 'If the macro noise is loud, zoom into one asset class or customer segment, then search for the signals that move them: rates, regulation, or technology.',
    quickPrompts: [
      'How are rate cuts or hikes changing borrowing behaviour?',
      'Which fintech partnerships are banks leaning on for growth?',
      'Where are regulators tightening oversight right now?',
      'How are investors pricing climate or geopolitical risk?',
      'What metrics show consumer credit stress rising or easing?'
    ],
    storylines: [
      {
        title: 'Cost of capital reset',
        description: 'Interest rate moves ripple through mortgages, venture funding, and corporate debt. Track who refinances, delays projects, or seizes an opportunity.',
        prompt: 'interest rate shift impact corporate investment'
      },
      {
        title: 'Trust & transparency',
        description: 'Compliance updates and audit findings influence market confidence. Follow disclosure rules and enforcement actions.',
        prompt: 'financial disclosure enforcement action 2025'
      },
      {
        title: 'Infrastructure for money',
        description: 'Payments innovation, embedded finance, and digital currencies reshape how value moves.',
        prompt: 'embedded finance partnership announcement'
      }
    ],
    keyPlayers: [
      {
        name: 'Central banks & regulators',
        role: 'Rate setters and watchdogs signalling risk tolerance',
        whyItMatters: 'Their statements move every other actor’s playbook.'
      },
      {
        name: 'Institutional investors',
        role: 'Asset managers, pension funds, sovereign wealth funds',
        whyItMatters: 'Their allocations highlight the themes getting long-term capital.'
      },
      {
        name: 'Fintech operators',
        role: 'Payments, lending, and infrastructure platforms partnering with incumbents',
        whyItMatters: 'They show how customer expectations are shifting.'
      }
    ],
    signals: [
      {
        title: 'Credit default trends',
        description: 'Rising delinquencies flag stress that will spill into policy and earnings stories.'
      },
      {
        title: 'Fundraising and deal volume',
        description: 'Dry powder or deal droughts dictate which sectors can keep building.'
      },
      {
        title: 'Regulatory consultations',
        description: 'Requests for comment preview rules that could reshape the market.'
      }
    ],
    nextSteps: [
      {
        title: 'Choose the instrument',
        description: 'Search for “bonds”, “VC funding”, or “consumer credit” alongside your topic to filter noise.'
      },
      {
        title: 'Add customer perspective',
        description: 'Pair the topic with “borrowers”, “SMBs”, or “retail investors” to see who is impacted.'
      },
      {
        title: 'Scan for catalysts',
        description: 'Include “announcement”, “guidance”, or “policy change” to detect upcoming jolts.'
      }
    ]
  },
  technology: {
    headline: 'Ship the future, understand the friction.',
    intro: 'Technology stories explain how ideas leave the lab and reach users. This guide spots the tension between innovation, business strategy, and society.',
    reassurance: 'Stuck on what to explore? Pick a product stage—prototype, launch, scale—and ask what blockers or accelerants exist at that stage.',
    quickPrompts: [
      'Which emerging tech is moving from prototype to pilot right now?',
      'How are platforms changing their policies for developers?',
      'Where are hardware supply constraints slowing launches?',
      'Which markets are early adopters versus laggards?',
      'How are privacy expectations shaping product roadmaps?'
    ],
    storylines: [
      {
        title: 'Build vs. buy decisions',
        description: 'Companies weigh whether to partner, acquire, or build. Each choice reveals strategy and competitive pressure.',
        prompt: 'technology partnership acquisition strategic rationale'
      },
      {
        title: 'Developer ecosystems',
        description: 'API changes and marketplace policies influence which apps thrive. Track updates from platform leaders.',
        prompt: 'platform policy update developer reaction'
      },
      {
        title: 'Hardware realities',
        description: 'Manufacturing capacity, component shortages, and logistics determine who can scale their devices.',
        prompt: 'hardware supply chain constraint delay announcement'
      }
    ],
    keyPlayers: [
      {
        name: 'Platform owners',
        role: 'Cloud providers, app stores, hardware ecosystems',
        whyItMatters: 'They set the rules others must play by.'
      },
      {
        name: 'Builders & engineers',
        role: 'Developers shipping features and writing postmortems',
        whyItMatters: 'They surface the practical realities behind the hype.'
      },
      {
        name: 'Policy & trust teams',
        role: 'Privacy officers, security leads, safety reviewers',
        whyItMatters: 'Their decisions shape user confidence and regulatory compliance.'
      }
    ],
    signals: [
      {
        title: 'Roadmap slips or accelerations',
        description: 'Track release notes and hardware shipment updates for momentum clues.'
      },
      {
        title: 'Developer sentiment',
        description: 'Forum threads, community calls, and GitHub discussions reveal friction.'
      },
      {
        title: 'Adoption metrics',
        description: 'Usage spikes, churn, or customer testimonials show who is winning.'
      }
    ],
    nextSteps: [
      {
        title: 'Pick the layer',
        description: 'Clarify whether you care about infrastructure, platforms, or end-user apps, then search with that vocabulary.'
      },
      {
        title: 'Watch the feedback loop',
        description: 'Add “user feedback”, “developer response”, or “security review” to capture reactions.'
      },
      {
        title: 'Name the friction',
        description: 'Use “bottleneck”, “risk”, or “compliance” to surface blockers worth investigating.'
      }
    ]
  }
}

function createFallbackGuide(topicName?: string): TopicGuideContent {
  const name = topicName ?? 'this topic'

  return {
    headline: `Let’s find the story inside ${name}.`,
    intro: `We can explore the landscape, the people involved, and the proof points that make ${name.toLowerCase()} matter right now.`,
    reassurance: 'Start with the audience you want to inform, then add the tension they care about. Pair one of the prompts below with a location, organisation, or timeframe.',
    quickPrompts: [
      `What changed recently in ${name}?`,
      `Who is leading innovation around ${name} and why now?`,
      `How are regulations or policies influencing ${name}?`,
      `Where are people experiencing the impact of ${name} first-hand?`,
      `What data proves ${name} is more than hype?`
    ],
    storylines: [
      {
        title: 'Momentum check',
        description: `Look for launches, pilot programs, or new investments touching ${name}.`,
        prompt: `${name} latest launch pilot investment`
      },
      {
        title: 'Impact on people',
        description: `Surface how ${name} changes daily life for customers, workers, or communities.`,
        prompt: `${name} impact on workers customers`
      },
      {
        title: 'Pushback & risks',
        description: `Every trend faces friction—find the critics, constraints, or unsolved problems around ${name}.`,
        prompt: `${name} challenges criticism risk`
      }
    ],
    keyPlayers: [
      {
        name: 'Builders & operators',
        role: 'Those shipping products, services, or programs',
        whyItMatters: 'They explain what is practical versus still in testing.'
      },
      {
        name: 'Regulators & watchdogs',
        role: 'Agencies, standards bodies, or community organisers',
        whyItMatters: 'They set the rules and expectations for how far the topic can go.'
      },
      {
        name: 'End users & communities',
        role: 'The people living with the outcomes every day',
        whyItMatters: 'Their stories prove the change is real.'
      }
    ],
    signals: [
      {
        title: 'Hiring & investment moves',
        description: 'Growth or cuts reveal confidence levels.'
      },
      {
        title: 'Partnership announcements',
        description: 'Collaborations hint at strategic priorities and resource gaps.'
      },
      {
        title: 'Policy deadlines',
        description: 'Upcoming decisions often spark fresh coverage and commentary.'
      }
    ],
    nextSteps: [
      {
        title: 'Narrow the audience',
        description: `Add “for ${name}” + the group you care about (students, executives, patients, voters).`
      },
      {
        title: 'Timebox the search',
        description: 'Use phrases like “this quarter” or “since 2024” to keep results fresh.'
      },
      {
        title: 'Collect evidence',
        description: 'Include words such as “results”, “metrics”, or “case study” for proof points.'
      }
    ]
  }
}

export function getTopicGuideContent(slug?: string, topicName?: string): TopicGuideContent {
  const guideFromSlug = slug ? GUIDE_LIBRARY[slug] : undefined
  if (guideFromSlug) {
    return guideFromSlug
  }

  // Attempt to find guide by partial slug matches (e.g., "ai/regulation" -> "ai").
  if (slug) {
    const slugParts = slug.split('/')
    for (const part of slugParts) {
      const partialGuide = GUIDE_LIBRARY[part]
      if (partialGuide) {
        return partialGuide
      }
    }
  }

  return createFallbackGuide(topicName)
}
