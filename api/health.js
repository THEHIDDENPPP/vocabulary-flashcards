module.exports = (req, res) => {
  res.json({ status: 'OK', environment: process.env.SUPABASE_URL ? 'supabase configured' : 'missing env vars' });
};
