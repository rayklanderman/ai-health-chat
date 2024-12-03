import { useState, useEffect } from 'react';

export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' }
];

const DEFAULT_LANGUAGE = 'en';

export const detectUserLanguage = async (): Promise<string> => {
  try {
    // First try to get from localStorage
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      return savedLanguage;
    }

    // Then try to detect from IP
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    // Get the country code and map it to our supported languages
    const countryCode = data.country_code.toLowerCase();
    
    // Map common country codes to languages
    const countryToLanguage: { [key: string]: string } = {
      'ke': 'sw', // Kenya -> Swahili
      'tz': 'sw', // Tanzania -> Swahili
      'ug': 'sw', // Uganda -> Swahili
      'fr': 'fr', // France -> French
      'sa': 'ar', // Saudi Arabia -> Arabic
      'ae': 'ar', // UAE -> Arabic
      'in': 'hi', // India -> Hindi
      'es': 'es', // Spain -> Spanish
      'mx': 'es', // Mexico -> Spanish
    };

    const detectedLanguage = countryToLanguage[countryCode] || DEFAULT_LANGUAGE;
    
    // Save to localStorage
    localStorage.setItem('preferredLanguage', detectedLanguage);
    
    return detectedLanguage;
  } catch (error) {
    console.error('Error detecting language:', error);
    return DEFAULT_LANGUAGE;
  }
};

export const useLanguage = () => {
  const [currentLanguage, setCurrentLanguage] = useState<string>(DEFAULT_LANGUAGE);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initLanguage = async () => {
      const detected = await detectUserLanguage();
      setCurrentLanguage(detected);
      setIsLoading(false);
    };

    initLanguage();
  }, []);

  const changeLanguage = (languageCode: string) => {
    if (SUPPORTED_LANGUAGES.some(lang => lang.code === languageCode)) {
      localStorage.setItem('preferredLanguage', languageCode);
      setCurrentLanguage(languageCode);
    }
  };

  return {
    currentLanguage,
    isLoading,
    changeLanguage,
    supportedLanguages: SUPPORTED_LANGUAGES
  };
};
