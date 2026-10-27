let CONFIG = {
  SUPABASE_URL: "", // <-- PUT YOUR SUPABASE URL HERE
  SUPABASE_ANON_KEY: "",            // <-- PUT YOUR SUPABASE ANON KEY HERE
  EDGE_FUNCTION_NAME: "ebm-tutor"
};

let supabaseClient = null;

async function initAppConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.SUPABASE_URL) CONFIG = data;
    }
  } catch (err) {
    console.log('Using local fallback config for development.');
  }

  // Initialize Supabase Client
  if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_URL !== "https://your-actual-project-ref.supabase.co") {
    supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('Supabase client initialized successfully.');
  } else {
    console.error('CRITICAL: Supabase credentials are missing or still set to placeholders in config.js!');
  }

  return CONFIG;
}