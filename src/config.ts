import fs from 'fs';
import path from 'path';
import os from 'os';
import { Provider, DEFAULT_PROVIDERS } from './providers';

export const getConfigPath = (): string => path.join(os.homedir(), '.claude-code-profile-switcher.json');

export function loadSavedProviders(): Provider[] {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return [];

  try {
    const data = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(data);

    if (Array.isArray(parsed)) {
      return parsed.filter((p: Provider) => {
        const defaultProvider = DEFAULT_PROVIDERS.find(d => d.name === p.name);
        if (!defaultProvider) return true;
        return (
          p.baseUrl !== defaultProvider.baseUrl ||
          p.model !== defaultProvider.model ||
          p.authToken !== defaultProvider.authToken ||
          p.customHeaders !== defaultProvider.customHeaders
        );
      });
    }
  } catch (e) {
    return [];
  }
  return [];
}

export function loadConfig(): Provider[] {
  const saved = loadSavedProviders();
  const finalProviders = DEFAULT_PROVIDERS.map((defaultProvider) => {
    const savedProvider = saved.find(p => p.name === defaultProvider.name);
    return savedProvider ? { ...defaultProvider, ...savedProvider } : defaultProvider;
  });

  for (const savedProvider of saved) {
    if (!finalProviders.find(p => p.name === savedProvider.name)) {
      finalProviders.push(savedProvider);
    }
  }

  finalProviders.sort((a, b) => {
    const priorities: Record<string, number> = {
      'OpenCode': 1,
      'OpenRouter': 2,
      'Ollama Cloud': 3,
      'Other - 1': 4,
      'Other - 2': 5,
      'Other - 3': 6
    };
    const pA = priorities[a.name] || 99;
    const pB = priorities[b.name] || 99;

    if (pA !== pB) return pA - pB;
    return a.name.localeCompare(b.name);
  });

  return finalProviders;
}

export function saveConfig(providers: Provider[]): void {
  const configPath = getConfigPath();
  const existing = loadSavedProviders();
  const merged = [...existing];

  for (const provider of providers) {
    const idx = merged.findIndex(p => p.name === provider.name);
    if (idx !== -1) {
      merged[idx] = { ...merged[idx], ...provider };
    } else {
      merged.push(provider);
    }
  }

  const cleaned = merged.filter((p: Provider) => {
    const defaultProvider = DEFAULT_PROVIDERS.find(d => d.name === p.name);
    if (!defaultProvider) return true;
    return (
      p.baseUrl !== defaultProvider.baseUrl ||
      p.model !== defaultProvider.model ||
      p.authToken !== defaultProvider.authToken ||
      p.customHeaders !== defaultProvider.customHeaders
    );
  });

  const newContent = JSON.stringify(cleaned, null, 2);
  let currentContent = '';
  try {
    currentContent = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
  }

  if (currentContent !== newContent) {
    if (fs.existsSync(configPath)) {
      const fd = fs.openSync(configPath, 'r+');
      const buffer = Buffer.from(newContent, 'utf8');
      fs.writeSync(fd, buffer, 0, buffer.length, 0);
      fs.ftruncateSync(fd, buffer.length);
      fs.closeSync(fd);
    } else {
      fs.writeFileSync(configPath, newContent, 'utf8');
    }
  }
}
