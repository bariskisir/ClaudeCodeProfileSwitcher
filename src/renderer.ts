interface Provider {
  name: string;
  baseUrl: string;
  model: string;
  authToken: string;
  customHeaders: string;
}

interface ModelPricing {
  prompt?: number;
  input?: number;
  completion?: number;
  output?: number;
}

interface Model {
  id: string;
  name?: string;
  context_length?: number;
  max_tokens?: number;
  top_p?: number;
  pricing?: ModelPricing;
}

interface Window {
  api: {
    getProviders: () => Promise<Provider[]>;
    getEnv: () => Promise<Record<string, string>>;
    saveProvider: (providerData: Provider) => Promise<boolean>;
    setEnv: (vars: Record<string, string>) => Promise<{ success: boolean; errors?: string[] }>;
    deleteEnv: (keys: string[]) => Promise<{ success: boolean; errors?: string[] }>;
    fetchModels: (data: { baseUrl: string; authToken: string; customHeaders: string }) => Promise<any>;
    closeWindow: () => void;
  };
}

declare const window: Window;

let providers: Provider[] = [];
let filteredProviders: Provider[] = [];
let providerSelectedIndex = -1;
let currentProvider: Provider | null = null;

let models: Model[] = [];
let filteredModels: Model[] = [];
let modelSelectedIndex = -1;

let isDropdownOpen = false;
let isModelDropdownOpen = false;
let statusTimeout: NodeJS.Timeout | null = null;
let statusHideTimeout: NodeJS.Timeout | null = null;

const ui = {
  providerSearch: document.getElementById('providerSearch') as HTMLInputElement,
  providerDropdown: document.getElementById('providerDropdown') as HTMLElement,
  providerList: document.getElementById('providerList') as HTMLElement,
  modelSearch: document.getElementById('modelSearch') as HTMLInputElement,
  modelDropdown: document.getElementById('modelDropdown') as HTMLElement,
  modelList: document.getElementById('modelList') as HTMLElement,
  baseUrlInput: document.getElementById('baseUrlInput') as HTMLInputElement,
  tokenInput: document.getElementById('tokenInput') as HTMLInputElement,
  headersInput: document.getElementById('headersInput') as HTMLInputElement,
  modelLoading: document.getElementById('modelLoading') as HTMLElement,
  loadBtn: document.getElementById('loadBtn') as HTMLButtonElement,
  resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
  statusMessage: document.getElementById('statusMessage') as HTMLElement,
  modelInfo: document.getElementById('modelInfo') as HTMLElement,
  infoContext: document.getElementById('infoContext') as HTMLElement,
  infoInputPrice: document.getElementById('infoInputPrice') as HTMLElement,
  infoOutputPrice: document.getElementById('infoOutputPrice') as HTMLElement,
  activeEnvLabel: document.getElementById('activeEnvLabel') as HTMLElement
};

function formatCompactNumber(value: any): string {
  if (value === null || value === undefined) return '-';
  if (value === '-' || value === '') return '-';
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(num) || !Number.isFinite(num)) return String(value);
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1);
    return `${val.endsWith('.0') ? val.slice(0, -2) : val}M`;
  }
  if (num >= 1000) {
    return `${Math.round(num / 1000)}K`;
  }
  return String(Math.round(num));
}

function extractModelInfo(m: Model) {
  const context = m.context_length || m.max_tokens || m.top_p || '-';
  let priceIn = '-';
  let priceOut = '-';

  if (m.pricing) {
    const prompt = m.pricing.prompt !== undefined ? m.pricing.prompt : m.pricing.input;
    const completion = m.pricing.completion !== undefined ? m.pricing.completion : m.pricing.output;

    if (prompt !== undefined && !isNaN(prompt)) {
      const val = parseFloat(String(prompt));
      priceIn = '$' + parseFloat((val * 1000000).toFixed(4)).toString();
    }
    if (completion !== undefined && !isNaN(completion)) {
      const val = parseFloat(String(completion));
      priceOut = '$' + parseFloat((val * 1000000).toFixed(4)).toString();
    }
  }
  return { context: formatCompactNumber(context), inputPrice: priceIn, outputPrice: priceOut };
}

function filterModels(query: string): Model[] {
  const trimmed = (query || '').trim();
  if (!trimmed) return models;
  const terms = trimmed
    .split(/\s+/)
    .map(t => t.toLowerCase())
    .filter(Boolean);
  if (terms.length === 0) return models;
  const results = models.filter((m) => {
    const name = (m.name || '').toLowerCase();
    const id = (m.id || '').toLowerCase();
    const haystacks = name ? [name, id] : [id];
    return terms.every(term => haystacks.some(h => h.includes(term)));
  });
  results.sort((a, b) => {
    const aName = (a.name || a.id || '').toLowerCase();
    const bName = (b.name || b.id || '').toLowerCase();
    return aName.localeCompare(bName);
  });
  return results;
}

function renderProviderList(list: Provider[]) {
  filteredProviders = list;
  ui.providerList.innerHTML = '';
  list.forEach((p, index) => {
    const li = document.createElement('li');
    const isSelected = index === providerSelectedIndex;
    li.className = `px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-blue-100' : ''}`;
    li.innerHTML = `
      <div class="flex flex-col">
        <div class="text-gray-700 font-medium text-sm">${p.name}</div>
      </div>
    `;
    li.onclick = () => selectProvider(p);
    ui.providerList.appendChild(li);
    if (isSelected) {
      li.scrollIntoView({ block: 'nearest' });
    }
  });
}

function renderModelList(list: Model[]) {
  filteredModels = list;
  ui.modelList.innerHTML = '';
  if (list.length === 0) {
    const li = document.createElement('li');
    li.className = 'px-2.5 py-1.5 text-gray-500 text-sm';
    li.textContent = 'No matches found';
    ui.modelList.appendChild(li);
    return;
  }
  list.forEach((m, index) => {
    const li = document.createElement('li');
    const isSelected = index === modelSelectedIndex;
    li.className = `px-2.5 py-1.5 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-0 ${isSelected ? 'bg-blue-100' : ''}`;

    const info = extractModelInfo(m);
    let infoHtml = '';
    if (info.context !== '-') {
      infoHtml = `<div class="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">In: ${info.inputPrice} | Out: ${info.outputPrice} | Ctx: ${info.context}</div>`;
    }

    li.innerHTML = `
      <div class="flex flex-col">
        <div class="text-gray-700 font-medium text-sm truncate" title="${m.id}">${m.name || m.id}</div>
        ${infoHtml}
      </div>
    `;

    li.onclick = () => {
      ui.modelSearch.value = m.id;
      ui.modelDropdown.classList.add('hidden');
      isModelDropdownOpen = false;
      updateModelInfo(m.id);
    };
    ui.modelList.appendChild(li);
    if (isSelected) {
      li.scrollIntoView({ block: 'nearest' });
    }
  });
}

function selectProvider(p: Provider) {
  currentProvider = p;
  ui.providerSearch.value = p.name;
  ui.providerDropdown.classList.add('hidden');
  isDropdownOpen = false;
  ui.activeEnvLabel.classList.add('hidden');

  ui.baseUrlInput.value = p.baseUrl || '';
  ui.tokenInput.value = p.authToken || '';
  ui.headersInput.value = p.customHeaders || '';
  ui.modelSearch.value = p.model || '';

  if (p.model) {
    updateModelInfo(p.model);
  } else {
    ui.modelInfo.classList.add('hidden');
  }

  ui.modelDropdown.classList.add('hidden');

  if (p.name.startsWith('Other')) {
    models = [];
  } else {
    fetchModels(p, true);
  }
}

async function fetchModels(provider: Provider, overwriteModelField: boolean) {
  ui.modelLoading.classList.remove('hidden');
  ui.modelSearch.disabled = true;

  try {
    const data = await window.api.fetchModels({
      baseUrl: provider.baseUrl,
      authToken: ui.tokenInput.value || provider.authToken,
      customHeaders: provider.customHeaders
    });

    if (data && data.error) {
      showStatus('Failed to fetch models: ' + String(data.error).substring(0, 30), 'error');
      models = [];
      return;
    }

    let rawModels: Model[] = [];
    if (data.data && Array.isArray(data.data)) {
      rawModels = data.data;
    } else if (Array.isArray(data)) {
      rawModels = data;
    } else if (data.models && Array.isArray(data.models)) {
      rawModels = data.models;
    }

    models = rawModels.sort((a: any, b: any) => {
      const timeA = a.created || 0;
      const timeB = b.created || 0;
      return timeB - timeA;
    });

    if (models.length > 0) {
      if (overwriteModelField && provider.model) {
        const savedModelExists = models.some(m => m.id === provider.model);
        if (savedModelExists) {
          ui.modelSearch.value = provider.model;
          updateModelInfo(provider.model);
        } else {
          ui.modelSearch.value = models[0].id;
          updateModelInfo(models[0].id);
        }
      } else if (!ui.modelSearch.value) {
        ui.modelSearch.value = models[0].id;
        updateModelInfo(models[0].id);
      } else {
        updateModelInfo(ui.modelSearch.value);
      }
    }

  } catch (e: any) {
    showStatus('Failed to fetch models: ' + e.message.substring(0, 20), 'error');
    models = [];
  } finally {
    ui.modelLoading.classList.add('hidden');
    ui.modelSearch.disabled = false;
  }
}

function updateModelInfo(selectedId: string) {
  const m = models.find(x => x.id === selectedId);
  if (m) {
    const info = extractModelInfo(m);
    ui.infoContext.textContent = info.context;
    ui.infoInputPrice.textContent = info.inputPrice;
    ui.infoOutputPrice.textContent = info.outputPrice;

    if (info.context !== '-' || info.inputPrice !== '-' || info.outputPrice !== '-') {
      ui.modelInfo.classList.remove('hidden');
    } else {
      ui.modelInfo.classList.add('hidden');
    }
  } else {
    ui.modelInfo.classList.add('hidden');
  }
}

function showStatus(msg: string, type: 'success' | 'error') {
  ui.statusMessage.textContent = msg;
  ui.statusMessage.classList.remove('hidden', 'text-green-600', 'text-red-600');
  ui.statusMessage.style.opacity = '1';
  if (statusTimeout) clearTimeout(statusTimeout);
  if (statusHideTimeout) clearTimeout(statusHideTimeout);

  if (type === 'success') {
    ui.statusMessage.classList.add('text-green-600');
  } else {
    ui.statusMessage.classList.add('text-red-600');
  }

  statusTimeout = setTimeout(() => {
    ui.statusMessage.style.opacity = '0';
    statusHideTimeout = setTimeout(() => {
      ui.statusMessage.classList.add('hidden');
      ui.statusMessage.style.opacity = '1';
    }, 350);
  }, 3000);
}

ui.providerSearch.addEventListener('focus', () => {
  isDropdownOpen = true;
  ui.providerDropdown.classList.remove('hidden');
  providerSelectedIndex = -1;
  renderProviderList(providers);
  ui.providerSearch.select();
});

ui.providerSearch.addEventListener('click', () => {
  ui.providerSearch.select();
});

ui.providerSearch.addEventListener('input', (e: any) => {
  const query = e.target.value.toLowerCase();
  const filtered = providers.filter(p => p.name.toLowerCase().includes(query));
  providerSelectedIndex = -1;
  renderProviderList(filtered);
  ui.providerDropdown.classList.remove('hidden');
});

ui.providerSearch.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    providerSelectedIndex = Math.min(providerSelectedIndex + 1, filteredProviders.length - 1);
    renderProviderList(filteredProviders);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    providerSelectedIndex = Math.max(providerSelectedIndex - 1, -1);
    renderProviderList(filteredProviders);
  } else if (e.key === 'Enter') {
    if (providerSelectedIndex >= 0 && providerSelectedIndex < filteredProviders.length) {
      e.preventDefault();
      selectProvider(filteredProviders[providerSelectedIndex]);
    }
  } else if (e.key === 'Escape') {
    ui.providerDropdown.classList.add('hidden');
    isDropdownOpen = false;
  }
});

ui.modelSearch.addEventListener('focus', () => {
  isModelDropdownOpen = true;
  modelSelectedIndex = -1;
  if (models.length > 0) {
    ui.modelDropdown.classList.remove('hidden');
    renderModelList(models);
  }
  ui.modelSearch.select();
});

ui.modelSearch.addEventListener('click', () => {
  ui.modelSearch.select();
});

ui.modelSearch.addEventListener('input', (e: any) => {
  const query = e.target.value;
  const filtered = filterModels(query);
  modelSelectedIndex = -1;
  renderModelList(filtered);
  if (models.length > 0) ui.modelDropdown.classList.remove('hidden');
  updateModelInfo(e.target.value);
});

ui.modelSearch.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    modelSelectedIndex = Math.min(modelSelectedIndex + 1, filteredModels.length - 1);
    renderModelList(filteredModels);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    modelSelectedIndex = Math.max(modelSelectedIndex - 1, -1);
    renderModelList(filteredModels);
  } else if (e.key === 'Enter') {
    if (modelSelectedIndex >= 0 && modelSelectedIndex < filteredModels.length) {
      e.preventDefault();
      const m = filteredModels[modelSelectedIndex];
      ui.modelSearch.value = m.id;
      ui.modelDropdown.classList.add('hidden');
      isModelDropdownOpen = false;
      updateModelInfo(m.id);
    }
  } else if (e.key === 'Escape') {
    ui.modelDropdown.classList.add('hidden');
    isModelDropdownOpen = false;
  }
});

document.addEventListener('click', (e: any) => {
  if (e.target !== ui.providerSearch && !ui.providerDropdown.contains(e.target)) {
    ui.providerDropdown.classList.add('hidden');
    isDropdownOpen = false;
    if (currentProvider && ui.providerSearch.value !== currentProvider.name && ui.providerSearch.value !== "Custom Config") {
      ui.providerSearch.value = currentProvider.name;
    }
  }
  if (e.target !== ui.modelSearch && !ui.modelDropdown.contains(e.target)) {
    ui.modelDropdown.classList.add('hidden');
    isModelDropdownOpen = false;
  }
});

ui.loadBtn.addEventListener('click', async () => {
  const btn = ui.loadBtn;
  btn.disabled = true;
  btn.textContent = 'SAVING...';

  const payload = {
    ANTHROPIC_BASE_URL: ui.baseUrlInput.value,
    ANTHROPIC_MODEL: ui.modelSearch.value || '',
    ANTHROPIC_AUTH_TOKEN: ui.tokenInput.value,
    ANTHROPIC_CUSTOM_HEADERS: ui.headersInput.value
  };

  try {
    const res = await window.api.setEnv(payload);

    if (res.success) {
      showStatus('Profile saved successfully', 'success');
      ui.activeEnvLabel.classList.remove('hidden');

      if (currentProvider && currentProvider.name !== "Custom Config") {
        const updatedProvider = {
          name: currentProvider.name,
          baseUrl: payload.ANTHROPIC_BASE_URL,
          model: payload.ANTHROPIC_MODEL,
          authToken: payload.ANTHROPIC_AUTH_TOKEN,
          customHeaders: payload.ANTHROPIC_CUSTOM_HEADERS
        };
        await window.api.saveProvider(updatedProvider);
        providers = await window.api.getProviders();
      }
    } else {
      const errs = res.errors ? res.errors.join(' | ') : 'Unknown error';
      showStatus('Error: ' + errs.substring(0, 30), 'error');
    }
  } catch (e: any) {
    showStatus('Network error: ' + e.message.substring(0, 20), 'error');
  } finally {
    btn.disabled = false;
    setTimeout(() => { if (btn.textContent === 'SAVING...') btn.textContent = 'Save Profile'; }, 500);
  }
});

ui.resetBtn.addEventListener('click', async () => {
  const btn = ui.resetBtn;
  btn.disabled = true;

  const keys = [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_CUSTOM_HEADERS'
  ];

  try {
    const res = await window.api.deleteEnv(keys);

    if (res.success) {
      showStatus('Profile is reset', 'success');
      ui.activeEnvLabel.classList.add('hidden');
      
      ui.baseUrlInput.value = '';
      ui.modelSearch.value = '';
      ui.tokenInput.value = '';
      ui.headersInput.value = '';
      ui.providerSearch.value = '';
      ui.modelInfo.classList.add('hidden');
      currentProvider = null;
      models = [];
    } else {
      const errs = res.errors ? res.errors.join(' | ') : 'Unknown error';
      showStatus('Error: ' + errs.substring(0, 30), 'error');
    }
  } catch (e: any) {
    showStatus('Network error: ' + e.message.substring(0, 20), 'error');
  } finally {
    btn.disabled = false;
  }
});

async function init() {
  try {
    const rawProviders = await window.api.getProviders();
    providers = rawProviders;
    renderProviderList(providers);

    const env = await window.api.getEnv();

    let hasEnv = false;
    if (env.ANTHROPIC_BASE_URL || env.ANTHROPIC_MODEL || env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_CUSTOM_HEADERS) {
      hasEnv = true;
    }

    if (hasEnv) {
      ui.baseUrlInput.value = env.ANTHROPIC_BASE_URL || '';
      ui.modelSearch.value = env.ANTHROPIC_MODEL || '';
      ui.tokenInput.value = env.ANTHROPIC_AUTH_TOKEN || '';
      ui.headersInput.value = env.ANTHROPIC_CUSTOM_HEADERS || '';
      ui.activeEnvLabel.classList.remove('hidden');

      if (env.ANTHROPIC_BASE_URL) {
        const matchedProvider = providers.find(p => p.baseUrl === env.ANTHROPIC_BASE_URL);
        if (matchedProvider) {
          ui.providerSearch.value = matchedProvider.name;
          currentProvider = matchedProvider;
          fetchModels(matchedProvider, false);
        } else {
          ui.providerSearch.value = "Custom Config";
        }
      }
    }
  } catch (e) {
    showStatus('Error loading initial data', 'error');
  }
}

init();
