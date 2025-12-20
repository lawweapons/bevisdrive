const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkFiles() {
  const { data: files, error } = await supabase
    .from('files')
    .select('id, original_name, folder, path')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Files in Database ===');
  files.forEach(file => {
    console.log(`Name: ${file.original_name}`);
    console.log(`Folder: "${file.folder}"`);
    console.log(`Path: ${file.path}`);
    console.log('---');
  });

  // Check folders table
  const { data: folders, error: folderError } = await supabase
    .from('folders')
    .select('*')
    .order('name');

  if (folderError) {
    console.error('Folder Error:', folderError);
    return;
  }

  console.log('\n=== Folders in Database ===');
  folders.forEach(folder => {
    console.log(`Name: "${folder.name}"`);
    console.log(`Path: "${folder.path}"`);
    console.log('---');
  });
}

checkFiles();
