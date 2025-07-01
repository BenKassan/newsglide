
export const SOURCE_BIAS_MAP = {
  'CNN': { lean: 'Left', color: 'blue' },
  'Fox News': { lean: 'Right', color: 'red' },
  'Reuters': { lean: 'Center', color: 'gray' },
  'BBC': { lean: 'Center-Left', color: 'blue' },
  'The Guardian': { lean: 'Left', color: 'blue' },
  'Wall Street Journal': { lean: 'Center-Right', color: 'red' },
  'Bloomberg': { lean: 'Center', color: 'gray' },
  'AP': { lean: 'Center', color: 'gray' },
  'NBC': { lean: 'Left', color: 'blue' },
  'The New York Times': { lean: 'Left', color: 'blue' }
};

export function getSourceBias(outlet: string) {
  // Check if outlet name contains any of our known sources
  const outletLower = outlet.toLowerCase();
  for (const [source, bias] of Object.entries(SOURCE_BIAS_MAP)) {
    if (outletLower.includes(source.toLowerCase())) {
      return bias;
    }
  }
  return { lean: 'Unknown', color: 'gray' };
}
