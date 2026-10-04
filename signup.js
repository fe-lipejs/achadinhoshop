import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mvcnptyhzogrjidodedo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12Y25wdHloem9ncmppZG9kZWRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwOTUwMTIsImV4cCI6MjEwNjY3MTAxMn0.Y-ZyjdwxwqIFVi23YFYMucnBAW-4PEMOr8Np742F2xk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function signUp() {
  const { data, error } = await supabase.auth.signUp({
    email: 'felipejsf7@gmail.com',
    password: 'el4ever7',
  });
  
  if (error) {
    console.error('Error signing up:', error.message);
  } else {
    console.log('User signed up successfully:', data.user?.id);
  }
}

signUp();
