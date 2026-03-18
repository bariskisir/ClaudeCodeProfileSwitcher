export interface Provider {
  name: string;
  baseUrl: string;
  model: string;
  authToken: string;
  customHeaders: string;
  contextLength?: number | string;
  inputPrice?: number | string;
  outputPrice?: number | string;
}

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    name: 'OpenCode',
    baseUrl: 'https://opencode.ai/zen',
    model: 'minimax-m2.5-free',
    authToken: 'public',
    customHeaders: 'x-opencode-session: 1',
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Ollama Cloud',
    baseUrl: 'https://ollama.com',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Other - 1',
    baseUrl: '',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Other - 2',
    baseUrl: '',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Other - 3',
    baseUrl: '',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Abacus',
    baseUrl: 'https://routellm.abacus.ai',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'AIHubMix',
    baseUrl: 'https://aihubmix.com',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Cortecs',
    baseUrl: 'https://api.cortecs.ai',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'FastRouter',
    baseUrl: 'https://go.fastrouter.ai/api',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Helicone',
    baseUrl: 'https://ai-gateway.helicone.ai',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Hugging Face',
    baseUrl: 'https://router.huggingface.co',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Inception Labs',
    baseUrl: 'https://api.inceptionlabs.ai',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Moark',
    baseUrl: 'https://moark.com',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Nano GPT',
    baseUrl: 'https://nano-gpt.com/api',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Novita AI',
    baseUrl: 'https://api.novita.ai/openai',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Nvidia',
    baseUrl: 'https://integrate.api.nvidia.com',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'OVH Cloud',
    baseUrl: 'https://oai.endpoints.kepler.ai.cloud.ovh.net',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Poe',
    baseUrl: 'https://api.poe.com',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Requesty',
    baseUrl: 'https://router.requesty.ai',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Synthetic AI',
    baseUrl: 'https://api.synthetic.new',
    model: '',
    authToken: '',
    customHeaders: '',
  },
  {
    name: 'Zenmux',
    baseUrl: 'https://zenmux.ai/api',
    model: '',
    authToken: '',
    customHeaders: '',
  }
];
