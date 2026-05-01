module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return res.status(500).json({
      error: 'Supabase config not available. Set SUPABASE_URL and SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    });
  }
  res.json({ url, anonKey });
};
