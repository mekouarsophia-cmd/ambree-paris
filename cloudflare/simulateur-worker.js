/**
 * ambree Paris — calcul du temps de trajet pour le simulateur « À domicile ».
 *
 * À coller dans un Worker Cloudflare. Rien de secret dans ce fichier :
 * l'adresse de départ et la clé PRIM sont saisies dans Cloudflare
 * (Settings > Variables and Secrets), jamais dans le site.
 *
 *   HOME_ADDRESS  (Secret)  adresse de départ, ex. « 12 rue Exemple 75010 Paris »
 *   PRIM_TOKEN    (Secret)  clé d'accès PRIM Île-de-France Mobilités
 *
 * Le site envoie : lat, lon (adresse de la cliente) et dt (AAAAMMJJTHHMM, heure du rendez-vous).
 * Le Worker renvoie seulement deux durées en minutes, arrondies à 5 min :
 *   { "aller": 25, "retour": 30 }
 */

const ALLOWED_ORIGINS = ['https://ambree-paris.fr', 'https://www.ambree-paris.fr'];
const PRIM_JOURNEYS = 'https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia/journeys';
const GEOCODE = 'https://data.geopf.fr/geocodage/search';
const MINUTES_SUR_PLACE = 50;
// Paris intra-muros (le simulateur ne calcule pas au-delà)
const PARIS = { latMin: 48.80, latMax: 48.91, lonMin: 2.22, lonMax: 2.47 };

let homeCache = null;

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET',
    'Vary': 'Origin',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function reply(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

async function homeCoords(env) {
  if (homeCache) return homeCache;
  const r = await fetch(`${GEOCODE}?q=${encodeURIComponent(env.HOME_ADDRESS)}&limit=1`);
  const j = await r.json();
  const [lon, lat] = j.features[0].geometry.coordinates;
  homeCache = `${lon};${lat}`;
  return homeCache;
}

async function bestDuration(env, from, to, datetime, represents) {
  const url = `${PRIM_JOURNEYS}?from=${from}&to=${to}&datetime=${datetime}&datetime_represents=${represents}&count=3`;
  const r = await fetch(url, { headers: { apikey: env.PRIM_TOKEN } });
  if (!r.ok) throw new Error('prim ' + r.status);
  const j = await r.json();
  const durations = (j.journeys || []).map(x => x.duration).filter(Boolean);
  if (!durations.length) throw new Error('no journey');
  return Math.ceil(Math.min(...durations) / 60 / 5) * 5;
}

function addMinutes(dt, minutes) {
  // dt = AAAAMMJJTHHMM (heure de Paris) ; calcul simple sur l'horloge locale
  const d = new Date(Date.UTC(+dt.slice(0, 4), +dt.slice(4, 6) - 1, +dt.slice(6, 8), +dt.slice(9, 11), +dt.slice(11, 13)) + minutes * 60000);
  const p = n => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(origin) });

    const url = new URL(request.url);
    const lat = parseFloat(url.searchParams.get('lat'));
    const lon = parseFloat(url.searchParams.get('lon'));
    const dt = url.searchParams.get('dt') || '';

    if (url.searchParams.get('test') === '1') {
      // Vérification de la configuration : trajet test vers Châtelet, sans exposer l'adresse
      const out = { adresse: !!env.HOME_ADDRESS, cle: !!env.PRIM_TOKEN };
      try {
        const home = await homeCoords(env);
        const d = new Date(Date.now() + 2 * 86400000);
        const p = n => String(n).padStart(2, '0');
        const when = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T140000`;
        out.trajet_test_minutes = await bestDuration(env, home, '2.3470;48.8590', when, 'arrival');
      } catch (e) {
        out.erreur = String(e.message || e);
      }
      return reply(out, 200, origin);
    }
    if (!/^\d{8}T\d{4}$/.test(dt) || isNaN(lat) || isNaN(lon)) return reply({ error: 'parametres' }, 400, origin);
    if (lat < PARIS.latMin || lat > PARIS.latMax || lon < PARIS.lonMin || lon > PARIS.lonMax) {
      return reply({ error: 'hors_paris' }, 200, origin);
    }

    try {
      const home = await homeCoords(env);
      const client = `${lon};${lat}`;
      const [aller, retour] = await Promise.all([
        bestDuration(env, home, client, dt + '00', 'arrival'),
        bestDuration(env, client, home, addMinutes(dt, MINUTES_SUR_PLACE) + '00', 'departure'),
      ]);
      return reply({ aller, retour }, 200, origin);
    } catch (e) {
      return reply({ error: 'calcul' }, 502, origin);
    }
  },
};
