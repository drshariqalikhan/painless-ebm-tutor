let CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  EDGE_FUNCTION_NAME: 'ebm-tutor'
};

let supabaseClient = null;

// Asynchronously loads config from Vercel's /api/config or local fallback
async function initAppConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Failed to load /api/config');
    CONFIG = await res.json();
  } catch (err) {
    console.warn('Could not load /api/config, checking local fallback...');
    // Fallback if testing locally without Vercel CLI:
    CONFIG = {
      SUPABASE_URL: "https://your-project-ref.supabase.co",
      SUPABASE_ANON_KEY: "your-anon-key-here",
      EDGE_FUNCTION_NAME: "ebm-tutor"
    };
  }

  // Initialize Supabase Client once keys are loaded
  supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  return CONFIG;
}