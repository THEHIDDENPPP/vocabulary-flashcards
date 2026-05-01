module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
  res.json({
    status: 'OK',
    supabaseUrl: url ? 'configured' : 'missing',
    supabaseAnonKey: anon ? 'configured' : 'missing',
    anthropicApiKey: anthropic ? 'configured' : 'missing'
  });
};
