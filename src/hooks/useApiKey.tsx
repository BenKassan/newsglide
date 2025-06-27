
import { useState, useEffect } from 'react';

export const useApiKey = () => {
  const [hasValidKey, setHasValidKey] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = () => {
    setIsChecking(true);
    const storedKey = localStorage.getItem('openai_api_key');
    setHasValidKey(!!storedKey);
    setIsChecking(false);
  };

  const onKeyValidated = (isValid: boolean) => {
    setHasValidKey(isValid);
  };

  return {
    hasValidKey,
    isChecking,
    onKeyValidated,
    checkApiKey
  };
};
