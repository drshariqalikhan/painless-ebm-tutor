let CONFIG = {
  SUPABASE_URL: "https://ybzxkakjvxneqsmnmfrw.supabase.co",      // <-- Put your real Supabase Project URL here
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlienhrYWtqdnhuZXFzbW5tZnJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MzIxNTEsImV4cCI6MjEwODQwODE1MX0.3tv2zOQCA-X5j9GVZz4OXD1vcfCaDYZDjdGNSdJ6QdU",                        // <-- Put your real Supabase Anon Key here
  EDGE_FUNCTION_NAME: "ebm-tutor"
};

let supabaseClient = null;

async function initAppConfig() {
  if (window.app && typeof window.app.logEvent === 'function') {
    window.app.logEvent('Config', 'Attempting to fetch environment parameters from /api/config...');
  }

  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`Serverless config returned status ${res.status}`);
    const data = await res.json();
    
    if (data.SUPABASE_URL && data.SUPABASE_URL !== "https://your-project-ref.supabase.co") {
      CONFIG = data;
      if (window.app) window.app.logEvent('Config', 'Successfully loaded config via Vercel serverless route.', 'success');
    } else {
      throw new Error('Serverless config returned empty or placeholder URL.');
    }
  } catch (err) {
    console.warn('Could not load /api/config (Normal if running static local server):', err);
    if (window.app) window.app.logEvent('Config', 'Using local fallback credentials from config.js.', 'warning');
  }

  // Initialize Supabase Client
  if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== "https://YOUR-PROJECT-REF.supabase.co") {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    if (window.app) window.app.logEvent('Supabase', 'Supabase JS Client initialized successfully.', 'success');
  } else {
    if (window.app) window.app.logEvent('Supabase', 'CRITICAL: Supabase URL/Key in config.js is still set to placeholder values!', 'error');
    console.error('Supabase client failed to initialize because credentials are placeholders.');
  }

  return CONFIG;
}