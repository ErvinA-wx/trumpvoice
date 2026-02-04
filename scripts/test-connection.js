javascript
const { ApifyClient } = require('apify-client');
const { createClient } = require('@supabase/supabase-js');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

async function testConnections() {
    console.log('🔍 Testing connections...\n');
    
    console.log('1️⃣ Testing Apify...');
    try {
        const client = new ApifyClient({ token: APIFY_TOKEN });
        const user = await client.user().get();
        console.log(`✅ Apify connected: ${user.username}`);
    } catch (err) {
        console.error('❌ Apify failed:', err.message);
        process.exit(1);
    }
    
    console.log('\n2️⃣ Testing Supabase...');
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { count } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        console.log(`✅ Supabase connected, posts count: ${count || 0}`);
    } catch (err) {
        console.error('❌ Supabase failed:', err.message);
        process.exit(1);
    }
    
    console.log('\n✨ All tests passed!');
}

testConnections();
