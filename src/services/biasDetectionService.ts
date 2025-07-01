
export interface SourceBias {
  lean: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'libertarian';
  score: number;
}

export interface BiasBalance {
  averageBias: number;
  balance: 'Balanced' | 'Left-leaning' | 'Right-leaning';
  recommendation: string;
}

const SOURCE_BIAS_SCORES: Record<string, SourceBias> = {
  'CNN': { lean: 'left', score: -2 },
  'Fox News': { lean: 'right', score: 2 },
  'Reuters': { lean: 'center', score: 0 },
  'BBC': { lean: 'center-left', score: -0.5 },
  'The Guardian': { lean: 'left', score: -2 },
  'Wall Street Journal': { lean: 'center-right', score: 1 },
  'AP News': { lean: 'center', score: 0 },
  'The Economist': { lean: 'center-right', score: 0.5 },
  'MSNBC': { lean: 'left', score: -2.5 },
  'NPR': { lean: 'center-left', score: -1 },
  'USA Today': { lean: 'center', score: 0 },
  'Associated Press': { lean: 'center', score: 0 },
  'Bloomberg': { lean: 'center-right', score: 0.5 },
  'The New York Times': { lean: 'center-left', score: -1 },
  'The Washington Post': { lean: 'center-left', score: -1 },
  'Forbes': { lean: 'center-right', score: 1 },
  'Politico': { lean: 'center', score: 0 },
  'Axios': { lean: 'center', score: 0 },
  'The Hill': { lean: 'center', score: 0 },
  'TechCrunch': { lean: 'center', score: 0 },
  'Wired': { lean: 'center-left', score: -0.5 },
  'Financial Times': { lean: 'center-right', score: 0.5 }
};

export function getSourceBias(outlet: string): SourceBias | null {
  // Try exact match first
  if (SOURCE_BIAS_SCORES[outlet]) {
    return SOURCE_BIAS_SCORES[outlet];
  }
  
  // Try partial match for common cases
  const lowerOutlet = outlet.toLowerCase();
  for (const [source, bias] of Object.entries(SOURCE_BIAS_SCORES)) {
    if (lowerOutlet.includes(source.toLowerCase()) || source.toLowerCase().includes(lowerOutlet)) {
      return bias;
    }
  }
  
  return null;
}

export function calculateBiasBalance(sources: string[]): BiasBalance {
  const validSources = sources.map(s => getSourceBias(s)).filter(Boolean) as SourceBias[];
  
  if (validSources.length === 0) {
    return {
      averageBias: 0,
      balance: 'Balanced',
      recommendation: 'Source bias data unavailable'
    };
  }
  
  const scores = validSources.map(s => s.score);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  let balance: 'Balanced' | 'Left-leaning' | 'Right-leaning';
  let recommendation: string;
  
  if (Math.abs(average) < 0.5) {
    balance = 'Balanced';
    recommendation = 'Good source diversity';
  } else if (average < 0) {
    balance = 'Left-leaning';
    recommendation = Math.abs(average) > 1.5 
      ? 'Consider adding more conservative sources' 
      : 'Slightly left-leaning sources';
  } else {
    balance = 'Right-leaning';
    recommendation = average > 1.5 
      ? 'Consider adding more progressive sources' 
      : 'Slightly right-leaning sources';
  }
  
  return {
    averageBias: average,
    balance,
    recommendation
  };
}

export function getDiverseOutlets() {
  return [
    // Left-leaning
    { name: 'CNN', type: 'Broadcast Media' as const, bias: 'left' },
    { name: 'The Guardian', type: 'National Newspaper' as const, bias: 'left' },
    { name: 'MSNBC', type: 'Broadcast Media' as const, bias: 'left' },
    
    // Center
    { name: 'Reuters', type: 'News Agency' as const, bias: 'center' },
    { name: 'AP News', type: 'News Agency' as const, bias: 'center' },
    { name: 'Politico', type: 'Online Media' as const, bias: 'center' },
    
    // Right-leaning
    { name: 'Wall Street Journal', type: 'National Newspaper' as const, bias: 'right' },
    { name: 'Fox News', type: 'Broadcast Media' as const, bias: 'right' },
    { name: 'Forbes', type: 'Online Media' as const, bias: 'right' },
    
    // International/Independent
    { name: 'BBC', type: 'Broadcast Media' as const, bias: 'center-left' },
    { name: 'The Economist', type: 'National Newspaper' as const, bias: 'center-right' }
  ];
}
