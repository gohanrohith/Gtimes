const https = require('https');

function fetchPlaceDetails(placeId, apiKey) {
  return new Promise((resolve, reject) => {
    const qs = `place_id=${encodeURIComponent(placeId)}&fields=name,rating,reviews,user_ratings_total&key=${encodeURIComponent(apiKey)}&language=en`;
    https.get(`https://maps.googleapis.com/maps/api/place/details/json?${qs}`, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON from Google Places API')); }
      });
    }).on('error', reject);
  });
}

async function syncGoogleReviews(placeId, apiKey, dbQuery) {
  const response = await fetchPlaceDetails(placeId, apiKey);
  if (response.status !== 'OK') {
    throw new Error(`Google Places API error: ${response.status}${response.error_message ? ' — ' + response.error_message : ''}`);
  }

  const { reviews = [], rating, user_ratings_total: totalRatings } = response.result || {};
  let synced = 0;

  for (const r of reviews) {
    const text = (r.text || '').trim();
    if (!text) continue;
    const sourceId = String(r.time || r.author_name);
    const existing = await dbQuery('SELECT id FROM google_reviews WHERE source_id=?', [sourceId]);
    if (!existing || existing.length === 0) {
      await dbQuery(
        'INSERT INTO google_reviews (author_name, rating, review_text, profile_photo_url, source_id) VALUES (?,?,?,?,?)',
        [r.author_name, Math.round(r.rating || 5), text, r.profile_photo_url || null, sourceId]
      );
      synced++;
    }
  }

  return { synced, total: reviews.length, overallRating: rating || null, totalRatings: totalRatings || 0 };
}

module.exports = { syncGoogleReviews };
