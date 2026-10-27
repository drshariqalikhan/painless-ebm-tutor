let CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  EDGE_FUNCTION_NAME: "ebm-tutor"
};

let supabaseClient = null;

async function initAppConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load config endpoint');
    CONFIG = await res.json();
  } catch (err) {
    console.warn('Could not reach /api/config. Check local server environment.');
  }

  if (window.supabase && CONFIG.SUPABASE_URL) {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  }
  return CONFIG;
}