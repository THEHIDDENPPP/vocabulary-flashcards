const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function verifyToken(req, res) {
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
  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }

  const user = await verifyToken(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data || []);
  }

  if (req.method === 'POST') {
    const { word, def, ex, trick, cat } = req.body || {};
    if (!word || !def) {
      return res.status(400).json({ error: 'Word and definition required' });
    }

    const { data, error } = await supabase
      .from('words')
      .insert([{ word, def, ex: ex || '', trick: trick || '', cat: cat || 'none', user_id: user.id }])
      .select();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data[0]);
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
  res.status(405).json({ error: `Method ${req.method} not allowed` });
};
