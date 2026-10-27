let CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  EDGE_FUNCTION_NAME: "ebm-tutor"
};

let supabaseClient = null;

async function initAppConfig() {
  if (window.app && typeof window.app.logEvent === 'function') {
    window.app.logEvent('Config', 'Fetching environment parameters from /api/config...');
  }

  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Serverless config returned status ${res.status}`);
    CONFIG = await res.json();
    if (window.app) window.app.logEvent('Config', 'Successfully loaded config via Vercel serverless route.', 'success');
  } catch (err) {
    console.warn('Could not load /api/config, falling back to local defaults:', err);
    if (window.app) window.app.logEvent('Config', `Failed to load /api/config (${err.message}). Using local fallback config.`, 'warning');
    
    CONFIG = {
      SUPABASE_URL: "https://your-actual-project-ref.supabase.co",
      SUPABASE_ANON_KEY: "your-actual-anon-key-here",
      EDGE_FUNCTION_NAME: "ebm-tutor"
    };
  }

  if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== "https://your-actual-project-ref.supabase.co") {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    if (window.app) window.app.logEvent('Supabase', 'Supabase JS Client initialized successfully.', 'success');
  } else {
    if (window.app) window.app.logEvent('Supabase', 'CRITICAL: Supabase URL/Key is missing or still set to placeholder values!', 'error');
  }

  return CONFIG;
}