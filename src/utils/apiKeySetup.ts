
// Auto-configure API keys on app startup
console.log('Setting up API keys...');

// Set OpenAI API key
const openaiKey = "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";
localStorage.setItem('openai_api_key', openaiKey);

// Set SerpAPI key  
const serpApiKey = "95479609629765d9d66f9f570093afbc88ef1345923386820eaf96a1416ad835";
localStorage.setItem('search_api_key', serpApiKey);

console.log('API keys configured successfully');
