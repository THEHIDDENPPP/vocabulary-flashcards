const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Use a different approach - we'll let the frontend handle auth
// and just use the Supabase client for data operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Debugging endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Verify auth token
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(403).json({ error: 'Token required' });
  
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error('Auth error:', error);
      return res.status(401).json({ error: 'Invalid token', details: error?.message });
    }
    
    req.user = user;
    next();
  } catch (e) {
    console.error('Token verification error:', e);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Frontend will handle registration/login via Supabase client
// These endpoints are just for redirects or webhooks if needed
app.get('/api/register', (req, res) => {
  res.json({ message: 'Use Supabase client for registration on frontend' });
});

app.get('/api/login', (req, res) => {
  res.json({ message: 'Use Supabase client for login on frontend' });
});

// Get all words for user
app.get('/api/words', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Fetch words error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json(data || []);
  } catch (e) {
    console.error('Get words error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add word
app.post('/api/words', verifyToken, async (req, res) => {
  const { word, def, ex, trick, cat } = req.body;
  if (!word || !def) {
    return res.status(400).json({ error: 'Word and definition required' });
  }
  try {
    const { data, error } = await supabase
      .from('words')
      .insert([{ word, def, ex: ex || '', trick: trick || '', cat: cat || 'none', user_id: req.user.id }])
      .select();
    if (error) {
      console.error('Insert word error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json(data[0]);
  } catch (e) {
    console.error('Add word error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update word
app.put('/api/words/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('words')
      .update(req.body)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select();
    if (error) {
      console.error('Update word error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json(data[0]);
  } catch (e) {
    console.error('Update word error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete word
app.delete('/api/words/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    if (error) {
      console.error('Delete word error:', error);
      return res.status(400).json({ error: error.message });
    }
    res.json({ message: 'Deleted' });
  } catch (e) {
    console.error('Delete word error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = app;