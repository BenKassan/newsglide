
// Set up API keys in localStorage
export const setupApiKeys = () => {
  // Set SerpAPI key
  localStorage.setItem('search_api_key', '95479609629765d9d66f9f570093afbc88ef1345923386820eaf96a1416ad835');
  
  console.log('SerpAPI key configured successfully');
};

// Call this when the app loads
setupApiKeys();
