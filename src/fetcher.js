/**
 * TrumpVoice Data Fetcher
 */
const { ApifyClient } = require('apify-client');
const { createClient } = require('@supabase/supabase-js');

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const apifyClient = new ApifyClient({ token: APIFY_TOKEN });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const ACTORS = {
    x: 'apidojo/tweet-scraper',
    instagram: 'apify/instagram-scraper',
    facebook: 'apify/facebook-posts-scraper'
};

const MONITORED_ACCOUNTS = {
    x: { username: 'realDonaldTrump', searchTerm: 'from:realDonaldTrump' },
    instagram: { username: 'realdonaldtrump' },
    facebook: { username: 'DonaldTrump', url: 'https://www.facebook.com/DonaldTrump' }
};

async function fetchXPosts(limit = 50) {
    console.log('🐦 Fetching X/Twitter posts...');
    try {
        const run = await apifyClient.actor(ACTORS.x).call({
            searchTerms: [MONITORED_ACCOUNTS.x.searchTerm],
            sort: 'Latest',
            maxItems: limit,
            tweetLanguage: 'en'
        });
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        const posts = items.map(item => ({
            platform: 'x',
            platform_post_id: item.id,
            author_username: item.author?.userName || 'realDonaldTrump',
            author_display_name: item.author?.name,
            content: item.text,
            published_at: item.createdAt,
            media_urls: item.media ? item.media.map(m => m.url || m.media_url_https).filter(Boolean) : [],
            media_type: item.media?.length > 1 ? 'carousel' : item.media?.[0]?.type || 'text',
            likes: item.likeCount || 0,
            shares: item.retweetCount || 0,
            comments: item.replyCount || 0,
            original_url: `https://x.com/${item.author?.userName}/status/${item.id}`,
            tags: item.entities?.hashtags?.map(h => h.text) || []
        }));
        console.log(`✅ Fetched ${posts.length} X posts`);
        return posts;
    } catch (error) {
        console.error('❌ X fetch error:', error.message);
        return [];
    }
}

async function fetchInstagramPosts(limit = 50) {
    console.log('📸 Fetching Instagram posts...');
    try {
        const run = await apifyClient.actor(ACTORS.instagram).call({
            usernames: [MONITORED_ACCOUNTS.instagram.username],
            resultsType: 'posts',
            resultsLimit: limit
        });
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        const posts = items.map(item => ({
            platform: 'instagram',
            platform_post_id: item.id,
            author_username: item.ownerUsername || 'realdonaldtrump',
            author_display_name: item.ownerFullName,
            content: item.caption,
            published_at: item.timestamp,
            media_urls: item.videoUrl ? [item.videoUrl] : (item.images || []),
            media_type: item.videoUrl ? 'video' : (item.images?.length > 1 ? 'carousel' : 'image'),
            likes: item.likesCount || 0,
            shares: 0,
            comments: item.commentsCount || 0,
            original_url: item.url,
            tags: item.hashtags || []
        }));
        console.log(`✅ Fetched ${posts.length} Instagram posts`);
        return posts;
    } catch (error) {
        console.error('❌ Instagram fetch error:', error.message);
        return [];
    }
}

async function fetchFacebookPosts(limit = 50) {
    console.log('📘 Fetching Facebook posts...');
    try {
        const run = await apifyClient.actor(ACTORS.facebook).call({
            startUrls: [{ url: MONITORED_ACCOUNTS.facebook.url }],
            resultsLimit: limit,
            includeNestedComments: false
        });
        const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
        const posts = items.map(item => ({
            platform: 'facebook',
            platform_post_id: item.postId || item.id,
            author_username: 'DonaldTrump',
            author_display_name: item.pageName || 'Donald J. Trump',
            content: item.text || item.caption,
            published_at: item.time,
            media_urls: item.media ? [item.media] : (item.images || []),
            media_type: item.video ? 'video' : (item.images?.length > 1 ? 'carousel' : 'image'),
            likes: item.likesCount || item.likeCount || 0,
            shares: item.sharesCount || 0,
            comments: item.commentsCount || 0,
            original_url: item.url,
            tags: []
        }));
        console.log(`✅ Fetched ${posts.length} Facebook posts`);
        return posts;
    } catch (error) {
        console.error('❌ Facebook fetch error:', error.message);
        return [];
    }
}

async function savePosts(posts) {
    if (posts.length === 0) return 0;
    console.log(`💾 Saving ${posts.length} posts to Supabase...`);
    try {
        const { error } = await supabase
            .from('posts')
            .upsert(posts, { onConflict: 'platform,platform_post_id', ignoreDuplicates: false });
        if (error) {
            console.error('❌ Supabase error:', error.message);
            return 0;
        }
        console.log(`✅ Saved ${posts.length} posts`);
        return posts.length;
    } catch (error) {
        console.error('❌ Save error:', error.message);
        return 0;
    }
}

async function logFetch(platform, status, itemsCount, errorMsg = null) {
    try {
        await supabase.from('fetch_logs').insert({
            platform, status, items_fetched: itemsCount, error_message: errorMsg,
            completed_at: new Date().toISOString()
        });
    } catch (e) { console.error('Log error:', e.message); }
}

async function fetchAll(platforms = ['x', 'instagram', 'facebook']) {
    console.log('🚀 Starting TrumpVoice fetch...\n');
    const results = {};
    for (const platform of platforms) {
        try {
            let posts = [];
            if (platform === 'x') posts = await fetchXPosts();
            else if (platform === 'instagram') posts = await fetchInstagramPosts();
            else if (platform === 'facebook') posts = await fetchFacebookPosts();
            else { console.log(`⚠️ Unknown platform: ${platform}`); continue; }
            const saved = await savePosts(posts);
            await logFetch(platform, saved > 0 ? 'success' : 'partial', saved);
            results[platform] = saved;
        } catch (error) {
            console.error(`❌ ${platform} failed:`, error.message);
            await logFetch(platform, 'error', 0, error.message);
            results[platform] = 0;
        }
    }
    console.log('\n📊 Fetch Summary:', JSON.stringify(results, null, 2));
    return results;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    fetchAll(args.length > 0 ? args : ['x', 'instagram', 'facebook'])
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { fetchAll, fetchXPosts, fetchInstagramPosts, fetchFacebookPosts };
