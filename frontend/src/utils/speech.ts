let speakTimeout: any = null;

export const cancelSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  if (speakTimeout) {
    clearTimeout(speakTimeout);
    speakTimeout = null;
  }
};

export const speakText = (text: string, onEndCallback?: () => void) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEndCallback) onEndCallback();
    return;
  }

  cancelSpeech();

  speakTimeout = setTimeout(() => {
    // Format table lines to be read out loud naturally, skipping only the markdown separator lines
    const lines = text.split('\n');
    let currentHeaders: string[] = [];
    let inTable = false;

    const cleanLines = lines.map(line => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('|')) {
        // Check if separator
        if (trimmed.includes('---') || trimmed.includes('- | -') || trimmed.includes('-|-')) {
          return '';
        }
        
        const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
        
        if (!inTable) {
          inTable = true;
          currentHeaders = cols;
          return ''; // Skip reading the header line itself
        } else {
          // Read data line mapped to headers
          const spokenParts: string[] = [];
          for (let i = 0; i < cols.length; i++) {
            const header = currentHeaders[i] || `Columna ${i + 1}`;
            let value = cols[i] || '';
            
            // Format dates YYYY-MM-DD naturally
            const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
            const match = value.match(dateRegex);
            if (match) {
              const year = match[1];
              const monthNum = parseInt(match[2], 10);
              const day = parseInt(match[3], 10);
              const months = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
              ];
              const monthName = months[monthNum - 1] || '';
              value = `${day} de ${monthName} de ${year}`;
            }
            
            spokenParts.push(`${header}: ${value}`);
          }
          return spokenParts.join('. ') + '.';
        }
      } else {
        inTable = false;
        currentHeaders = [];
        
        let cleanLine = line;
        const trimmedClean = cleanLine.trim();
        if (trimmedClean.length > 0) {
          const lastChar = trimmedClean.slice(-1);
          if (!['.', ',', ';', ':', '?', '!'].includes(lastChar)) {
            cleanLine = trimmedClean + '.';
          }
        }
        return cleanLine;
      }
    });
    const textWithoutTables = cleanLines.filter(Boolean).join(' ');

    const clean = textWithoutTables
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/g, '$1 dólares') // speak dollars naturally
      .replace(/[-+|#*`~&=_<>[\]{}()]/g, ' ') // remove special symbols, hashes, ampersands, dashes
      .replace(/\s+/g, ' ')           // normalize spaces
      .trim();

    if (!clean) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-CL';

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;

    const voiceURI = localStorage.getItem('lacteoserp_preferred_voice') || '';
    if (voiceURI) {
      selectedVoice = voices.find(v => v.voiceURI === voiceURI);
    }

    if (!selectedVoice) {
      const esVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
      const femaleKeywords = ['sabina', 'helena', 'laura', 'daria', 'paula', 'elena', 'maria', 'francisca', 'yolanda', 'google español', 'siri', 'female', 'mujer', 'zira', 'monica', 'paulina', 'ana'];
      selectedVoice = esVoices.find(v => 
        femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
      );
      if (!selectedVoice && esVoices.length > 0) {
        selectedVoice = esVoices[0];
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    let callbackCalled = false;
    const triggerCallback = () => {
      if (!callbackCalled) {
        callbackCalled = true;
        if (onEndCallback) onEndCallback();
      }
    };

    utterance.onend = triggerCallback;
    utterance.onerror = triggerCallback;

    // Safety fallback timeout
    const fallbackMs = (clean.length / 10) * 1000 + 2000;
    const fallbackTimeout = setTimeout(triggerCallback, fallbackMs);

    // Clear fallback timeout if it ends normally
    const originalOnEnd = utterance.onend;
    utterance.onend = (e) => {
      clearTimeout(fallbackTimeout);
      if (originalOnEnd) originalOnEnd.call(utterance, e);
      triggerCallback();
    };

    window.speechSynthesis.speak(utterance);
  }, 250);
};
