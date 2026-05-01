const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );
}

async function verifyToken(req, res, supabase) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(403).json({ error: 'Token required' });
    return null;
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid token', details: error?.message });
    return null;
  }

  return data.user;
}

module.exports = async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    const user = await verifyToken(req, res, supabase);
    if (!user) return;

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    if (req.method === 'PUT') {
      const updates = req.body || {};
      const { data, error } = await supabase
        .from('words')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select();

      if (error) return res.status(400).json({ error: error.message });
      return res.json(data[0]);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) return res.status(400).json({ error: error.message });
      return res.json({ message: 'Deleted' });
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
