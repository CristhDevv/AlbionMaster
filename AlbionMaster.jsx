import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Module-level cache for translations (survives component re-mounts)
let cachedItemNames = {};




const ITEMS = [
  ...[4, 5, 6, 7, 8].map(t => ({ id: `T${t}_BAG`, name: `Bolsa T${t}`, tier: `T${t}`, category: 'Bolsas' })),
  ...['WOOD', 'ORE', 'FIBER', 'ROCK', 'HIDE'].flatMap(res => 
    [4, 5, 6].map(t => ({ id: `T${t}_${res}`, name: `${res} crudo T${t}`, tier: `T${t}`, category: 'Recursos Crudos' }))
  ),
  ...['PLANKS', 'METALBAR', 'CLOTH', 'STONEBLOCK', 'LEATHER'].flatMap(res =>
    [4, 5, 6].map(t => ({ id: `T${t}_${res}`, name: `${res} procesado T${t}`, tier: `T${t}`, category: 'Recursos Procesados' }))
  ),
  ...['ARMOR_PLATE_SET1', 'HEAD_PLATE_SET1', 'SHOES_PLATE_SET1'].flatMap(set =>
    [4, 5, 6].map(t => ({ id: `T${t}_${set}`, name: `Placas ${set.split('_')[0]} T${t}`, tier: `T${t}`, category: 'Armaduras Plate' }))
  ),
  ...['ARMOR_LEATHER_SET1', 'HEAD_LEATHER_SET1', 'SHOES_LEATHER_SET1'].flatMap(set =>
    [4, 5, 6].map(t => ({ id: `T${t}_${set}`, name: `Cuero ${set.split('_')[0]} T${t}`, tier: `T${t}`, category: 'Armaduras Leather' }))
  ),
  ...['ARMOR_CLOTH_SET1', 'HEAD_CLOTH_SET1', 'SHOES_CLOTH_SET1'].flatMap(set =>
    [4, 5, 6].map(t => ({ id: `T${t}_${set}`, name: `Tela ${set.split('_')[0]} T${t}`, tier: `T${t}`, category: 'Armaduras Cloth' }))
  ),
  ...['MAIN_SWORD', 'MAIN_AXE', 'MAIN_MACE', 'MAIN_SPEAR', 'MAIN_BOW', 'STAFF_FIRE', 'STAFF_HOLY'].flatMap(w =>
    [4, 5, 6].map(t => ({ id: `T${t}_${w}`, name: `${w} T${t}`, tier: `T${t}`, category: 'Armas' }))
  ),
  ...['MEAL_STEW', 'MEAL_SOUP', 'MEAL_OMELETTE', 'MEAL_SALAD'].flatMap(m =>
    [4, 5].map(t => ({ id: `T${t}_${m}`, name: `${m} T${t}`, tier: `T${t}`, category: 'Comida' }))
  ),
  ...['POTION_HEAL', 'POTION_ENERGY'].flatMap(p => 
    [4, 5].map(t => ({ id: `T${t}_${p}`, name: `${p} T${t}`, tier: `T${t}`, category: 'Pociones' }))
  )
];

const ALL_CATEGORIES = [...new Set(ITEMS.map(i => i.category))];

const LOCATIONS = [
  'Caerleon', 'Bridgewatch', 'Martlock', 'Lymhurst', 
  'Thetford', 'Fort Sterling', 'Brecilien', 'Black Market'
];

const SAFE_CITIES = ['Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford'];
const PVP_CITIES = ['Caerleon', 'Black Market', 'Brecilien'];

const CITY_COLORS = {
  'Caerleon':       '#e74c3c',
  'Bridgewatch':    '#f39c12',
  'Martlock':       '#2ecc71',
  'Lymhurst':       '#27ae60',
  'Thetford':       '#8e44ad',
  'Fort Sterling':  '#3498db',
  'Brecilien':      '#1abc9c',
  'Black Market':   '#95a5a6',
};

const DISTANCE_MATRIX = {
  'Caerleon':      { 'Caerleon': 0, 'Black Market': 0, 'Martlock': 2, 'Thetford': 2, 'Fort Sterling': 2, 'Lymhurst': 2, 'Bridgewatch': 2, 'Brecilien': 5 },
  'Black Market':  { 'Caerleon': 0, 'Black Market': 0, 'Martlock': 2, 'Thetford': 2, 'Fort Sterling': 2, 'Lymhurst': 2, 'Bridgewatch': 2, 'Brecilien': 5 },
  'Martlock':      { 'Caerleon': 2, 'Black Market': 2, 'Martlock': 0, 'Thetford': 2, 'Fort Sterling': 3, 'Lymhurst': 4, 'Bridgewatch': 2, 'Brecilien': 5 },
  'Thetford':      { 'Caerleon': 2, 'Black Market': 2, 'Martlock': 2, 'Thetford': 0, 'Fort Sterling': 2, 'Lymhurst': 3, 'Bridgewatch': 4, 'Brecilien': 5 },
  'Fort Sterling': { 'Caerleon': 2, 'Black Market': 2, 'Martlock': 3, 'Thetford': 2, 'Fort Sterling': 0, 'Lymhurst': 2, 'Bridgewatch': 3, 'Brecilien': 5 },
  'Lymhurst':      { 'Caerleon': 2, 'Black Market': 2, 'Martlock': 4, 'Thetford': 3, 'Fort Sterling': 2, 'Lymhurst': 0, 'Bridgewatch': 2, 'Brecilien': 5 },
  'Bridgewatch':   { 'Caerleon': 2, 'Black Market': 2, 'Martlock': 2, 'Thetford': 4, 'Fort Sterling': 3, 'Lymhurst': 2, 'Bridgewatch': 0, 'Brecilien': 5 },
  'Brecilien':     { 'Caerleon': 5, 'Black Market': 5, 'Martlock': 5, 'Thetford': 5, 'Fort Sterling': 5, 'Lymhurst': 5, 'Bridgewatch': 5, 'Brecilien': 0 },
};

const BASE_URL = 'https://west.albion-online-data.com';
const LOCATIONS_PARAM = LOCATIONS.join(',');
const BATCH_SIZE = 15;
const MAX_AGE_HOURS = 4;

const LOADING_MESSAGES = [
  { min: 0,  max: 15, msg: "Conectando con los mercados del Royal Continent..." },
  { min: 15, max: 30, msg: "Explorando órdenes de compra en ciudades reales..." },
  { min: 30, max: 45, msg: "Rastreando precios en Bridgewatch y Martlock..." },
  { min: 45, max: 60, msg: "Analizando el Black Market de Caerleon..." },
  { min: 60, max: 75, msg: "Calculando márgenes de ganancia por ruta..." },
  { min: 75, max: 90, msg: "Filtrando oportunidades más rentables..." },
  { min: 90, max: 99, msg: "Ordenando mejores rutas de comercio..." },
  { min: 99, max: 100, msg: "¡Listo! Mercados escaneados con éxito." },
];

const ENCHANTABLE_CATEGORIES = ['Bolsas', 'Armaduras Plate', 'Armaduras Leather', 'Armaduras Cloth', 'Armas'];

function getExpandedItems(baseItems, filters) {
  const expanded = [];
  for (const item of baseItems) {
    const canEnchant = ENCHANTABLE_CATEGORIES.includes(item.category);
    
    if (filters[0]) {
      expanded.push({ ...item, isEnchanted: false, enchantLevel: 0, baseId: item.id });
    }
    
    if (canEnchant) {
      if (filters[1]) expanded.push({ ...item, id: `${item.id}@1`, isEnchanted: true, enchantLevel: 1, baseId: item.id });
      if (filters[2]) expanded.push({ ...item, id: `${item.id}@2`, isEnchanted: true, enchantLevel: 2, baseId: item.id });
      if (filters[3]) expanded.push({ ...item, id: `${item.id}@3`, isEnchanted: true, enchantLevel: 3, baseId: item.id });
      if (filters[4]) expanded.push({ ...item, id: `${item.id}@4`, isEnchanted: true, enchantLevel: 4, baseId: item.id });
    }
  }
  return expanded;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

function hoursSince(dateStr) {
  if (!dateStr || dateStr === '0001-01-01T00:00:00') return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.max(0, (Date.now() - d.getTime()) / 3600000);
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function relativeTime(date) {
  if (!date) return '—';
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `hace ${s}s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)}min`;
  return `hace ${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`;
}

function formatAge(hours) {
  if (hours === Infinity) return '—';
  if (hours < 1) return Math.floor(hours * 60) + 'min';
  return hours.toFixed(1) + 'h';
}

function ageColor(hours) {
  if (hours < 1) return '#00ff88';
  if (hours <= 3) return '#ffd700';
  return '#ff6b6b';
}



// ─── API LAYER ────────────────────────────────────────────────────────────────
async function fetchPricesBatch(ids) {
  const url = `${BASE_URL}/api/v2/stats/prices/${ids.join(',')}.json?locations=${LOCATIONS_PARAM}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prices ${res.status}`);
  return res.json();
}

async function fetchHistoryBatch(ids) {
  const url = `${BASE_URL}/api/v2/stats/history/${ids.join(',')}.json?time-scale=24&locations=${LOCATIONS_PARAM}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`History ${res.status}`);
  return res.json();
}

async function fetchBatch(ids) {
  const pRes = await Promise.allSettled([
    fetchPricesBatch(ids),
    fetchHistoryBatch(ids)
  ]);
  return {
    prices: pRes[0].status === 'fulfilled' ? pRes[0].value : [],
    history: pRes[1].status === 'fulfilled' ? pRes[1].value : [],
    pErr: pRes[0].status === 'rejected' ? pRes[0].reason : null,
    hErr: pRes[1].status === 'rejected' ? pRes[1].reason : null,
  };
}

// ─── OPPORTUNITIES ENGINE ─────────────────────────────────────────────────────
function computeOpportunities(prices, history, items, taxSell = 3, taxBuy = 0) {
  const itemMap = {};
  items.forEach(it => { itemMap[it.id] = it; });

  const TRAVEL_TIME_MAP = { 0: 0, 1: 5, 2: 10, 3: 20, 4: 30, 5: 45 };

  // Index: for each item_id+city keep the best (freshest) entry
  const priceIndex = {};
  prices.forEach(p => {
    const key = `${p.item_id}::${p.city}`;
    if (!priceIndex[key]) {
      priceIndex[key] = p;
    }
  });

  // Index history by item+city
  const historyIndex = {};
  history.forEach(h => {
    const key = `${h.item_id}::${h.location}`;
    if (!historyIndex[key]) historyIndex[key] = [];
    historyIndex[key].push(h);
  });

  function getVolumeAndStd(itemId, city) {
    const key = `${itemId}::${city}`;
    const entries = historyIndex[key] || [];
    let totalVol = 0;
    const avgPrices = [];
    entries.forEach(e => {
      if (e.data && Array.isArray(e.data)) {
        e.data.forEach(d => {
          totalVol += d.item_count || 0;
          if (d.avg_price > 0) avgPrices.push(d.avg_price);
        });
      }
    });
    let stddev = 0, avg = 0;
    if (avgPrices.length > 1) {
      avg = avgPrices.reduce((a, b) => a + b, 0) / avgPrices.length;
      stddev = Math.sqrt(avgPrices.reduce((s, p) => s + (p - avg) ** 2, 0) / avgPrices.length);
    } else if (avgPrices.length === 1) {
      avg = avgPrices[0];
    }
    return { volume: totalVol, stddev, avg };
  }

  const opportunities = [];

  for (const item of items) {
    for (const buyCity of LOCATIONS) {
      const buyKey = `${item.id}::${buyCity}`;
      const buyData = priceIndex[buyKey];
      if (!buyData) continue;

      // Buy price = lowest sell order in buy city
      const buyPrice = buyData.sell_price_min;
      if (!buyPrice || buyPrice <= 0) continue;

      // Check freshness of buy data
      const buyAge = hoursSince(buyData.sell_price_min_date);
      if (buyAge > MAX_AGE_HOURS) continue;

      for (const sellCity of LOCATIONS) {
        if (sellCity === buyCity) continue;
        const sellKey = `${item.id}::${sellCity}`;
        const sellData = priceIndex[sellKey];
        if (!sellData) continue;

        // Sell price = highest buy order in sell city
        let sellPrice = sellData.buy_price_max;
        let sellDate = sellData.buy_price_max_date;

        if (!sellPrice || sellPrice <= 0) continue;
        let estimatedSell = false;

        const sellAge = hoursSince(sellDate);
        if (sellAge > MAX_AGE_HOURS) continue;

        const grossMargin = sellPrice - buyPrice;
        
        const distance = DISTANCE_MATRIX[buyCity]?.[sellCity] || 5;
        const travelTime = TRAVEL_TIME_MAP[distance] || 45;
        const taxValSell = sellPrice * (taxSell / 100);
        const taxValBuy = buyPrice * (taxBuy / 100);
        const netProfit = sellPrice - taxValSell - buyPrice - taxValBuy;

        const marginPct = (netProfit / buyPrice) * 100;

        // Skip negative margins entirely
        if (netProfit <= 0 || marginPct > 300) continue;

        const buyStats = getVolumeAndStd(item.id, buyCity);
        const sellStats = getVolumeAndStd(item.id, sellCity);
        const vol24h = Math.max(buyStats.volume, sellStats.volume);

        const maxAge = Math.max(buyAge, sellAge);

        const stats = buyStats.avg > 0 ? buyStats : sellStats;
        const consistency = stats.avg > 0 ? Math.max(0, Math.min(1, 1 - (stats.stddev / stats.avg))) : 0.5;

        opportunities.push({
          item,
          buyCity,
          sellCity,
          buyPrice,
          sellPrice,
          grossMargin,
          taxValSell,
          taxValBuy,
          travelTime,
          netProfit,
          marginPct,
          vol24h,
          maxAge,
          consistency,
          estimatedSell,
          buyDate: buyData.sell_price_min_date,
          sellDate,
        });
      }
    }
  }

  // Compute composite score
  const maxVol = Math.max(1, ...opportunities.map(o => o.vol24h));

  opportunities.forEach(o => {
    const rentabilidad = Math.min(Math.max(o.marginPct / 100, 0), 1);
    const liquidez = Math.log10(o.vol24h + 2) / Math.log10(maxVol + 2);
    const confiabilidad = Math.max(0, 1 - (o.maxAge / MAX_AGE_HOURS));
    const velocidad = Math.max(0, 1 - (o.travelTime / 45));
    o.score = (0.4 * rentabilidad + 0.25 * liquidez + 0.2 * confiabilidad + 0.15 * velocidad);
  });

  return opportunities;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');

  * { margin:0; padding:0; box-sizing:border-box; }

  body, #root {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    background: #0a0e1a;
    color: #c8d6e5;
    min-height: 100vh;
  }

  .app {
    display: flex;
    min-height: 100vh;
  }

  /* ── MAIN CONTENT ── */
  .main-content {
    flex: 1; display: flex; flex-direction: column; min-width: 0;
    padding: 16px 20px; overflow-y: auto;
  }



  /* ── SETTINGS PAGE ── */
  .settings-page { max-width: 900px; }
  .settings-section {
    background: #0d1127; border: 1px solid #1a2548; border-radius: 8px;
    padding: 16px; margin-bottom: 16px;
  }
  .settings-section-title {
    font-size: 14px; font-weight: 700; color: #00d4ff; margin-bottom: 12px;
    padding-bottom: 8px; border-bottom: 1px solid #1a2548;
    display: flex; align-items: center; gap: 8px;
  }

  /* ── HEADER ── */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    background: linear-gradient(135deg, #0d1127 0%, #131a35 100%);
    border: 1px solid #1a2548;
    border-radius: 10px;
    margin-bottom: 14px;
  }
  .header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .logo {
    font-size: 22px;
    font-weight: 700;
    background: linear-gradient(135deg, #00d4ff, #00ff88);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: -0.5px;
  }
  .logo-sub {
    font-size: 11px;
    color: #546a8d;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .last-update {
    font-size: 11px;
    color: #546a8d;
  }
  .refresh-btn {
    background: linear-gradient(135deg, #00d4ff22, #00ff8822);
    border: 1px solid #00d4ff44;
    color: #00d4ff;
    padding: 8px 18px;
    border-radius: 6px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .refresh-btn:hover { background: #00d4ff33; border-color: #00d4ff; }
  .refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── TOP RECOMMENDATION ── */
  .top-banner {
    background: linear-gradient(135deg, #0b2a1f 0%, #0d1f35 50%, #1a0d30 100%);
    border: 1px solid #00ff8844;
    border-radius: 10px;
    padding: 18px 22px;
    margin-bottom: 14px;
    position: relative;
    overflow: hidden;
  }
  .top-banner::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, #00ff88, #00d4ff, #00ff88);
    background-size: 200% 100%;
    animation: shimmer 3s linear infinite;
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .top-badge {
    display: inline-block;
    background: #00ff8822;
    color: #00ff88;
    font-size: 10px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 4px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  .top-text {
    font-size: 13px;
    line-height: 1.7;
    color: #b0c4d8;
  }
  .top-text strong {
    color: #00ff88;
    font-weight: 600;
  }
  .top-text .city-highlight {
    padding: 1px 6px;
    border-radius: 3px;
    font-weight: 600;
  }
  .top-numbers {
    display: flex;
    gap: 20px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
  .top-num-item {
    background: #ffffff08;
    border: 1px solid #ffffff11;
    padding: 8px 14px;
    border-radius: 6px;
    text-align: center;
  }
  .top-num-label { font-size: 9px; color: #546a8d; text-transform: uppercase; letter-spacing: 1px; }
  .top-num-val { font-size: 16px; font-weight: 700; color: #00ff88; margin-top: 2px; }
  .estimated-tag {
    display: inline-block;
    background: #ffd70022;
    color: #ffd700;
    font-size: 8px;
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 6px;
    letter-spacing: 0.5px;
  }

  /* ── FILTERS ── */
  .filters {
    display: flex;
    gap: 16px;
    align-items: center;
    flex-wrap: wrap;
    background: #0d1127;
    border: 1px solid #1a2548;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 14px;
  }
  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .filter-label {
    font-size: 10px;
    color: #546a8d;
    text-transform: uppercase;
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .filter-select, .filter-input {
    background: #0a0e1a;
    border: 1px solid #1a2548;
    color: #c8d6e5;
    padding: 6px 10px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 12px;
  }
  .filter-select:focus, .filter-input:focus {
    outline: none;
    border-color: #00d4ff66;
  }
  input[type=range] {
    -webkit-appearance: none;
    height: 4px;
    background: #1a2548;
    border-radius: 2px;
    outline: none;
    width: 100px;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    background: #00d4ff;
    border-radius: 50%;
    cursor: pointer;
  }
  .filter-val {
    font-size: 12px;
    color: #00d4ff;
    min-width: 35px;
    text-align: right;
    font-weight: 600;
  }

  /* ── TABLE ── */
  .table-wrap {
    background: #0d1127;
    border: 1px solid #1a2548;
    border-radius: 10px;
    overflow: hidden;
  }
  .table-scroll {
    overflow-x: hidden;
    max-height: 70vh;
    overflow-y: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    table-layout: fixed;
  }
  thead th {
    background: #0a0e1a;
    color: #546a8d;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: 10px;
    font-weight: 600;
    padding: 10px 8px;
    text-align: left;
    border-bottom: 1px solid #1a2548;
    white-space: normal;
    word-break: break-word;
    position: sticky;
    top: 0;
    z-index: 1;
    cursor: pointer;
    user-select: none;
  }
  thead th:hover { color: #00d4ff; }
  tbody tr {
    border-bottom: 1px solid #0f1530;
    transition: background 0.15s;
  }
  tbody tr:hover { background: #111b38; }
  tbody tr.row-selected { background: #00d4ff15; border-left: 2px solid #00d4ff; }
  tbody tr.row-selected:hover { background: #00d4ff25; }
  td {
    padding: 8px 8px;
    white-space: normal;
    word-break: break-word;
    vertical-align: top;
  }
  .line1 {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 4px;
  }
  .line2 {
    font-size: 10px; color: #546a8d; display: flex; align-items: center; justify-content: space-between;
  }
  .rank {
    font-weight: 700;
    color: #546a8d;
    font-size: 11px;
  }
  .item-name {
    font-weight: 600;
    color: #e2e8f0;
  }
  .city-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
  }
  .price { font-weight: 500; color: #c8d6e5; }
  .margin-positive { color: #00ff88; font-weight: 600; }
  .margin-pct { color: #00d4ff; font-weight: 600; }
  .volume { color: #ffd700; }

  /* Score bar */
  .score-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .score-bar-bg {
    width: 60px;
    height: 6px;
    background: #1a2548;
    border-radius: 3px;
    overflow: hidden;
    flex-shrink: 0;
  }
  .score-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }
  .score-val {
    font-weight: 700;
    font-size: 12px;
    min-width: 36px;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: #c8d6e5;
  }
  .loading-logo {
    font-size: 24px;
    font-weight: 800;
    background: linear-gradient(135deg, #00d4ff, #00ff88);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 24px;
    letter-spacing: -0.5px;
  }
  .loading-msg {
    font-size: 16px;
    font-weight: 500;
    color: #e2e8f0;
    margin-bottom: 20px;
    text-align: center;
    min-height: 24px;
  }
  .progress-bar-container {
    width: 60%;
    min-width: 300px;
    max-width: 600px;
    height: 8px;
    background: #1a2548;
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    margin-bottom: 12px;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.5);
  }
  .progress-bar-fill {
    height: 100%;
    background: #00d4ff;
    border-radius: 4px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 10px #00d4ff88, 0 0 20px #00d4ff44;
  }
  .progress-pct {
    font-size: 32px;
    font-weight: 800;
    color: #00d4ff;
    margin-bottom: 16px;
    font-variant-numeric: tabular-nums;
  }
  .loading-batch {
    font-size: 11px;
    color: #546a8d;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .loading-stats {
    font-size: 13px;
    color: #00ff88;
    font-weight: 600;
    background: #00ff8815;
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid #00ff8833;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% { opacity: 0.8; }
    50% { opacity: 1; box-shadow: 0 0 15px #00ff8822; }
    100% { opacity: 0.8; }
  }
  .error-bar {
    background: #2d1320;
    border: 1px solid #ff4466;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 11px;
    color: #ff8899;
  }
  .info-bar {
    background: #0d1f35;
    border: 1px solid #1a3a5c;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 11px;
    color: #6a8ab0;
  }
  .empty-state {
    text-align: center;
    padding: 40px;
    color: #546a8d;
    font-size: 13px;
  }

  .checkbox-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; color: #c8d6e5; cursor: pointer;
    user-select: none;
  }
  .checkbox-label input { cursor: pointer; }

  /* ── HISTORY & PINS ── */
  .row-pinned { background: #1a2a40 !important; border-left: 3px solid #00d4ff; }
  .row-alert { background: #2d1320 !important; border-left: 3px solid #ff4466; opacity: 0.9; }
  .pin-btn { background: none; border: none; cursor: pointer; filter: grayscale(1); opacity: 0.3; transition: 0.2s; font-size: 12px; }
  .pin-btn.active { filter: none; opacity: 1; text-shadow: 0 0 5px #ffd700; }
  .pin-btn:hover { opacity: 1; filter: none; }
  .pin-btn:hover { opacity: 1; filter: none; }
  .alert-msg { color: #ff8899; font-size: 10px; font-weight: bold; margin-left: 8px; }

  /* ── NET PROFIT ── */
  .th-net { color: #00ff88; }
  .sortable { cursor: pointer; user-select: none; position: relative; transition: color 0.2s; }
  .sortable:hover { color: #00d4ff; }
  .sort-icon { font-size: 10px; margin-left: 4px; vertical-align: middle; }
  .td-gross { color: #546a8d; font-size: 11px; }
  .td-tax { color: #ff4466; font-size: 11px; }
  .td-travel { font-weight: 500; }
  .td-net { color: #00ff88; font-weight: bold; }
  .val-input { width: 60px; background: #111b38; color: #fff; border: 1px solid #1a2548; padding: 4px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }

  /* ── CATEGORIES ── */
  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
    margin-top: 8px;
    margin-bottom: 12px;
  }
  .cat-btn {
    background: #111b38; border: 1px solid #1a2548; color: #c8d6e5;
    padding: 6px 10px; border-radius: 4px; font-size: 11px;
    cursor: pointer; display: flex; justify-content: space-between;
    align-items: center; transition: 0.15s;
    user-select: none;
  }
  .cat-btn.active {
    background: #00d4ff22; border-color: #00d4ff; color: #00d4ff;
  }
  .cat-count {
    background: #0a0e1a; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;
  }
  .cat-btn.active .cat-count {
    background: #00d4ff; color: #000;
  }
  .cat-controls {
    display: flex; gap: 8px; margin-bottom: 8px;
  }
  .cat-ctrl-btn {
    background: none; border: 1px solid #3a4f70; color: #6a8ab0;
    padding: 4px 8px; border-radius: 4px; font-size: 10px; cursor: pointer;
  }
  .cat-ctrl-btn:hover { color: #fff; border-color: #6a8ab0; }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .main-content { padding: 10px; }

    /* Hide desktop elements on mobile */
    .header { display: none !important; }
    .top-banner { display: none !important; }
    .filters-container { display: none !important; }
    .table-wrap { background: none; border: none; border-radius: 0; }
    .table-scroll { display: none !important; }

    /* Mobile Header */
    .mobile-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px;
      background: linear-gradient(135deg, #0d1127 0%, #131a35 100%);
      border: 1px solid #1a2548; border-radius: 8px; margin-bottom: 10px;
    }
    .mobile-header .logo { font-size: 18px; }
    .mobile-header-meta {
      font-size: 10px; color: #546a8d; padding: 0 14px; margin-bottom: 10px;
    }

    /* Mobile Banner */
    .mobile-banner {
      background: linear-gradient(135deg, #0b2a1f 0%, #0d1f35 50%, #1a0d30 100%);
      border: 1px solid #00ff8844; border-radius: 8px;
      padding: 12px 14px; margin-bottom: 10px;
      position: relative; overflow: hidden;
    }
    .mobile-banner::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, #00ff88, #00d4ff, #00ff88);
      background-size: 200% 100%; animation: shimmer 3s linear infinite;
    }
    .mobile-banner-line1 {
      font-size: 10px; font-weight: 700; color: #00ff88;
      letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px;
    }
    .mobile-banner-line2 {
      font-size: 13px; color: #e2e8f0; margin-bottom: 4px;
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .mobile-banner-line3 { font-size: 12px; color: #b0c4d8; }
    .mobile-banner-line3 strong { color: #00ff88; }
    .mobile-banner-line3 .cyan { color: #00d4ff; font-weight: 600; }

    /* Mobile Sort Bar */
    .mobile-sort-bar {
      display: flex; gap: 6px; align-items: center; padding: 8px 0;
      margin-bottom: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch;
    }
    .mobile-sort-bar-label {
      font-size: 10px; color: #546a8d; white-space: nowrap;
      text-transform: uppercase; letter-spacing: 1px;
    }
    .mobile-sort-btn {
      background: #111b38; border: 1px solid #1a2548; color: #8899aa;
      padding: 6px 12px; border-radius: 4px; font-family: inherit;
      font-size: 11px; cursor: pointer; white-space: nowrap; transition: all 0.15s;
    }
    .mobile-sort-btn.active {
      background: #00d4ff22; border-color: #00d4ff; color: #00d4ff; font-weight: 600;
    }

    /* Mobile Cards */
    .cards-container { display: flex; flex-direction: column; gap: 10px; }
    .mobile-card {
      background: #080f1c; border: 1px solid #112240;
      border-radius: 8px; padding: 14px; width: 100%;
    }
    .mobile-card-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
    }
    .mobile-card-item-name {
      font-weight: 700; color: #e2e8f0; font-size: 13px; line-height: 1.3;
    }
    .mobile-card-item-meta { font-size: 10px; color: #546a8d; }
    .mobile-card-route {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 0; border-top: 1px solid #112240;
      border-bottom: 1px solid #112240; margin-bottom: 10px; font-size: 12px;
    }
    .mobile-card-route-arrow { color: #3a4f70; font-size: 14px; }
    .mobile-card-profit-row {
      display: flex; justify-content: space-between;
      align-items: baseline; margin-bottom: 6px;
    }
    .mobile-card-profit { font-size: 18px; font-weight: 700; color: #00ff88; }
    .mobile-card-margin { font-size: 16px; font-weight: 700; color: #00d4ff; }
    .mobile-card-prices {
      display: flex; justify-content: space-between;
      font-size: 11px; color: #6a8ab0; margin-bottom: 4px;
    }
    .mobile-card-details {
      display: flex; gap: 12px; font-size: 10px; color: #546a8d; flex-wrap: wrap;
    }
    .mobile-card-details span { white-space: nowrap; }

    /* Mobile Pagination */
    .mobile-pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 12px; padding: 16px 0; margin-top: 8px;
    }
    .mobile-pagination-btn {
      background: #111b38; border: 1px solid #1a2548; color: #c8d6e5;
      padding: 0 20px; border-radius: 6px; font-family: inherit;
      font-size: 13px; font-weight: 600; cursor: pointer;
      min-height: 44px; display: flex; align-items: center;
      justify-content: center; transition: all 0.15s;
    }
    .mobile-pagination-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .mobile-pagination-btn:not(:disabled):active {
      background: #00d4ff22; border-color: #00d4ff; color: #00d4ff;
    }
    .mobile-pagination-info {
      font-size: 12px; color: #6a8ab0; min-width: 100px; text-align: center;
    }

    /* Mobile Bottom Sheet */
    .mobile-filter-fab {
      position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
      background: linear-gradient(135deg, #00d4ff22, #00ff8822);
      border: 1px solid #00d4ff66; color: #00d4ff;
      padding: 12px 28px; border-radius: 24px; font-family: inherit;
      font-size: 13px; font-weight: 700; cursor: pointer;
      z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      min-height: 44px; display: flex; align-items: center; gap: 8px;
    }
    .mobile-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); z-index: 1001;
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .mobile-bottom-sheet {
      position: fixed; bottom: 0; left: 0; right: 0; height: 80vh;
      background: #0a0e1a; border-top: 2px solid #00d4ff44;
      border-radius: 16px 16px 0 0; z-index: 1002;
      overflow-y: auto; padding: 20px 16px 40px;
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .mobile-bottom-sheet-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #1a2548;
    }
    .mobile-bottom-sheet-title { font-size: 16px; font-weight: 700; color: #00d4ff; }
    .mobile-bottom-sheet-close {
      background: #1a2548; border: 1px solid #2a3a5a; color: #c8d6e5;
      width: 36px; height: 36px; border-radius: 50%;
      font-size: 18px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
  }

  /* Desktop: hide mobile-only elements */
  @media (min-width: 769px) {
    .mobile-header, .mobile-header-meta, .mobile-banner,
    .mobile-sort-bar, .cards-container, .mobile-pagination,
    .mobile-filter-fab, .mobile-overlay, .mobile-bottom-sheet { display: none !important; }
  }
`;

// ─── ERROR BOUNDARY ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: '#ff4466', background: '#0a0e1a', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2>Algo salió mal en el dashboard</h2>
          <pre style={{ background: '#111b38', padding: 20, borderRadius: 8, overflowX: 'auto' }}>
            {this.state.error?.message || 'Error desconocido'}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: 20, padding: '10px 20px', background: '#1a2548', color: '#fff', border: '1px solid #3a4f70', borderRadius: 4, cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── ICON COMPONENT ───────────────────────────────────────────────────────────
// Global flag: once we know the render server is unreachable, skip all further attempts
let _renderApiDown = false;

const ItemIcon = ({ itemId, tier }) => {
  const [status, setStatus] = React.useState(_renderApiDown ? 'fallback' : 'loading');
  const imgRef = React.useRef(null);
  const src = `https://render.albiononline.com/v1/item/${itemId}.png?size=40`;

  // 5-second timeout: if the image hasn't loaded by then, show fallback
  React.useEffect(() => {
    if (status !== 'loading') return;
    const timer = setTimeout(() => {
      _renderApiDown = true; // mark globally so future rows skip immediately
      setStatus('fallback');
    }, 5000);
    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'fallback') {
    const tierColor = tier?.startsWith('T8') ? '#ff6b6b' : tier?.startsWith('T7') ? '#ffd700' : tier?.startsWith('T6') ? '#e67e22' : tier?.startsWith('T5') ? '#3498db' : '#546a8d';
    return (
      <div style={{ 
        width: 32, height: 32, borderRadius: 4, 
        background: 'linear-gradient(135deg, #1a2548, #0d1127)', 
        border: `1px solid ${tierColor}44`,
        color: tierColor, fontSize: 11, fontWeight: 'bold', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        letterSpacing: 0.5
      }}>
        {tier || '?'}
      </div>
    );
  }

  return (
    <img 
      ref={imgRef}
      src={src} 
      alt="" 
      loading="lazy"
      onLoad={() => setStatus('loaded')}
      onError={() => { _renderApiDown = true; setStatus('fallback'); }}
      style={{ 
        width: 32, height: 32, borderRadius: 4, flexShrink: 0, background: '#1a2548',
        opacity: status === 'loaded' ? 1 : 0,
        position: status === 'loaded' ? 'static' : 'absolute'
      }}
    />
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
function MarketScannerApp() {
  const [rawData, setRawData] = useState({ prices: [], history: [], fetchId: 0 });
  const [lastLoggedFetchId, setLastLoggedFetchId] = useState(0);

  const [taxSell, setTaxSell] = useState(3);
  const [taxBuy, setTaxBuy] = useState(0);
  const [maxTravelTime, setMaxTravelTime] = useState(45);
  const [selectedCities, setSelectedCities] = useState(
    LOCATIONS.reduce((acc, c) => ({...acc, [c]: true}), {})
  );

  const [enchantmentFilters, setEnchantmentFilters] = useState({
    0: true, 1: true, 2: true, 3: true, 4: true
  });
  const [activeItemsFetched, setActiveItemsFetched] = useState([]);

  // Translation state
  const [namesLoading, setNamesLoading] = useState(false);
  const [namesError, setNamesError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [errors, setErrors] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(
    ALL_CATEGORIES.reduce((acc, c) => ({...acc, [c]: true}), {})
  );
  const [minMargin, setMinMargin] = useState(0);
  const [minVolume, setMinVolume] = useState(0);
  const [freshOnly, setFreshOnly] = useState(false);
  const [rawDataInfo, setRawDataInfo] = useState(null);
  const [nextRefresh, setNextRefresh] = useState(0);
  const [pinned, setPinned] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'netProfit', direction: 'desc' });
  
  // Custom states added for the redesigned UI
  const [showFilters, setShowFilters] = useState(false);
  const fetchIdRef = useRef(0);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobilePage, setMobilePage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const cardsContainerRef = useRef(null);

  // Mobile detection with resize listener + cleanup
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset mobile page when any filter changes
  useEffect(() => {
    setMobilePage(1);
  }, [minMargin, minVolume, freshOnly, maxTravelTime, selectedCities, selectedCategories, enchantmentFilters, sortConfig]);

  // Log errors to console only
  useEffect(() => {
    if (errors.length > 0) {
      console.warn(`⚠️ Algunos batches fallaron (${errors.length}):`, errors);
    }
  }, [errors]);

  const handleSort = (key) => {
    setSortConfig(prev => {
      if (prev.key !== key) return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: 'asc' };
      return { key, direction: 'desc' };
    });
  };

  // Fetch translations on mount
  useEffect(() => {
    if (Object.keys(cachedItemNames).length > 0) return;
    
    let isMounted = true;
    const fetchTranslations = async () => {
      setNamesLoading(true);
      try {
        const res = await fetch('https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json');
        if (!res.ok) throw new Error('Failed to fetch translations');
        const data = await res.json();
        
        const nameMap = {};
        data.forEach(item => {
          let name = item.UniqueName;
          if (item.LocalizedNames) {
            name = item.LocalizedNames['ES-ES'] || item.LocalizedNames['EN-US'] || name;
          }
          nameMap[item.UniqueName] = name;
        });
        
        cachedItemNames = nameMap;
        if (isMounted) setNamesError(false);
      } catch (err) {
        console.error('Error fetching item translations:', err);
        if (isMounted) setNamesError(true);
      } finally {
        if (isMounted) setNamesLoading(false);
      }
    };
    fetchTranslations();
    return () => { isMounted = false; };
  }, []);

  // Helper to get item name
  const getItemName = useCallback((itemId) => {
    // Return null if empty so `|| o.item.name` fallback works correctly
    return Object.keys(cachedItemNames).length > 0 ? cachedItemNames[itemId] : null;
  }, [namesLoading]); // Re-render when loading finishes

  // Compute opportunities asynchronously decoupled from API fetching
  const opportunities = useMemo(() => {
    if (!rawData.prices.length) return [];
    return computeOpportunities(rawData.prices, rawData.history, activeItemsFetched, taxSell, taxBuy);
  }, [rawData.prices, rawData.history, rawData.fetchId, activeItemsFetched, taxSell, taxBuy]);

  const loadData = useCallback(async () => {
    const currentFetchId = Date.now();
    fetchIdRef.current = currentFetchId;

    setLoading(true);
    setErrors([]);
    setRawDataInfo(null);
    
    const currentActiveItems = getExpandedItems(ITEMS, enchantmentFilters);
    setActiveItemsFetched(currentActiveItems);
    
    const ids = currentActiveItems.map(i => i.id);
    const batches = chunk(ids, BATCH_SIZE);
    setLoadingProgress({ loaded: 0, total: batches.length });
    
    let allPrices = [];
    let allHistory = [];
    let fetchErrors = [];

    for (const batch of batches) {
      if (fetchIdRef.current !== currentFetchId) return; // Abort stale fetch

      try {
        const result = await fetchBatch(batch).catch(e => ({ prices: [], history: [], pErr: e, hErr: e }));
        if (fetchIdRef.current !== currentFetchId) return; // Re-check after await
        
        allPrices.push(...result.prices);
        allHistory.push(...result.history);
        
        if (result.pErr) fetchErrors.push(result.pErr.message || 'Error en precios');
        if (result.hErr) fetchErrors.push(result.hErr.message || 'Error en historial');
        
        setRawData({ prices: [...allPrices], history: [...allHistory], fetchId: Date.now() });
        setLoadingProgress(prev => ({ ...prev, loaded: prev.loaded + 1 }));
        
        await new Promise(r => setTimeout(r, 800));
      } catch (err) {
        fetchErrors.push(err.message);
        if (fetchIdRef.current === currentFetchId) {
          setLoadingProgress(prev => ({ ...prev, loaded: prev.loaded + 1 }));
        }
      }
    }

    if (fetchIdRef.current !== currentFetchId) return; // Final verification

    if (fetchErrors.length > 0) setErrors(fetchErrors);

    const validPrices = allPrices.filter(p => p.sell_price_min > 0);
    setRawDataInfo({
      totalPriceEntries: allPrices.length,
      validPriceEntries: validPrices.length,
      historyEntries: allHistory.length,
    });

    const health = {};
    LOCATIONS.forEach(city => health[city] = { fresh: 0, medium: 0, expired: 0 });
    allPrices.forEach(p => {
      if (!health[p.city]) return;
      if (p.sell_price_min <= 0 && p.buy_price_max <= 0) return;
      const ages = [];
      if (p.sell_price_min > 0) ages.push(hoursSince(p.sell_price_min_date));
      if (p.buy_price_max > 0) ages.push(hoursSince(p.buy_price_max_date));
      if (ages.length === 0) return;
      const bestAge = Math.min(...ages);
      if (bestAge < 1) health[p.city].fresh++;
      else if (bestAge <= 4) health[p.city].medium++;
      else health[p.city].expired++;
    });
    // setMarketHealth(health);

    setLastUpdate(new Date());
    setNextRefresh(Date.now() + 5 * 60 * 1000);
    setLoading(false);
  }, [enchantmentFilters]);

  useEffect(() => { loadData(); }, [loadData]);

  // Track last logged fetch
  useEffect(() => {
    if (rawData.fetchId === lastLoggedFetchId) return;
    setLastLoggedFetchId(rawData.fetchId);
  }, [rawData.fetchId, lastLoggedFetchId]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (document.visibilityState === 'visible' && nextRefresh > 0 && Date.now() >= nextRefresh && !loading) {
      loadData();
    }
  }, [tick, nextRefresh, loading, loadData]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && nextRefresh > 0 && Date.now() >= nextRefresh && !loading) {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [nextRefresh, loading, loadData]);

  const preCategoryFiltered = useMemo(() => {
    return opportunities
      .filter(o => o.marginPct >= minMargin)
      .filter(o => o.vol24h >= minVolume)
      .filter(o => o.travelTime <= maxTravelTime)
      .filter(o => selectedCities[o.buyCity] && selectedCities[o.sellCity])
      .filter(o => !freshOnly || o.maxAge < 1);
  }, [opportunities, minMargin, minVolume, freshOnly, maxTravelTime, selectedCities]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    ALL_CATEGORIES.forEach(c => counts[c] = 0);
    preCategoryFiltered.forEach(o => {
      counts[o.item.category]++;
    });
    return counts;
  }, [preCategoryFiltered]);

  const filtered = useMemo(() => {
    return preCategoryFiltered
      .filter(o => selectedCategories[o.item.category])
      .sort((a, b) => {
        const factor = sortConfig.direction === 'asc' ? 1 : -1;
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === 'itemName') {
          valA = getItemName(a.item.baseId || a.item.id) || a.item.name;
          valB = getItemName(b.item.baseId || b.item.id) || b.item.name;
        }

        if (valA < valB) return -1 * factor;
        if (valA > valB) return 1 * factor;
        return 0;
      });
  }, [preCategoryFiltered, selectedCategories, sortConfig]);

  const topOpp = filtered[0] || null;

  const timeRemaining = Math.max(0, Math.floor((nextRefresh - Date.now()) / 1000));
  const min = Math.floor(timeRemaining / 60).toString().padStart(2, '0');
  const sec = (timeRemaining % 60).toString().padStart(2, '0');
  const countdownStr = nextRefresh > 0 ? `${min}:${sec}` : '--:--';

  const togglePin = (opp) => {
    const key = `${opp.item.id}-${opp.buyCity}-${opp.sellCity}`;
    setPinned(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = opp;
      return next;
    });
  };

  const renderList = useMemo(() => {
    const pinnedItems = [];
    Object.values(pinned).forEach(pinnedOpp => {
      const liveOpp = opportunities.find(o => o.item.id === pinnedOpp.item.id && o.buyCity === pinnedOpp.buyCity && o.sellCity === pinnedOpp.sellCity);
      const isProfitable = liveOpp && liveOpp.marginPct >= 5;
      pinnedItems.push({
        ...(liveOpp || pinnedOpp),
        isPinned: true,
        isProfitable,
        key: `${pinnedOpp.item.id}-${pinnedOpp.buyCity}-${pinnedOpp.sellCity}`
      });
    });

    // Pinned rows also follow active sorting for consistency
    pinnedItems.sort((a, b) => {
      const factor = sortConfig.direction === 'asc' ? 1 : -1;
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return -1 * factor;
      if (valA > valB) return 1 * factor;
      return 0;
    });

    const normalItems = filtered.filter(o => !pinned[`${o.item.id}-${o.buyCity}-${o.sellCity}`]);
    const list = [...pinnedItems];
    normalItems.forEach(o => {
      list.push({
        ...o,
        isPinned: false,
        isProfitable: true,
        key: `${o.item.id}-${o.buyCity}-${o.sellCity}`
      });
    });
    return list;
  }, [filtered, pinned, opportunities, sortConfig]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return { count: 0, maxMargin: 0, maxVol: 0, freshest: null };
    return {
      count: filtered.length,
      maxMargin: Math.max(...filtered.map(o => o.marginPct)),
      maxVol: Math.max(...filtered.map(o => o.vol24h)),
      freshest: Math.min(...filtered.map(o => o.maxAge)),
    };
  }, [filtered]);

  function scoreColor(score) {
    if (score >= 0.7) return '#00ff88';
    if (score >= 0.5) return '#00d4ff';
    if (score >= 0.3) return '#ffd700';
    return '#ff6b6b';
  }

  function cityBadgeStyle(city) {
    const color = CITY_COLORS[city] || '#666';
    return {
      backgroundColor: color + '22',
      color: color,
      border: `1px solid ${color}44`,
    };
  }

  const shortCityName = (city) => {
    if (city === 'Fort Sterling') return 'F. Sterling';
    if (city === 'Black Market') return 'B. Market';
    return city;
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return null;
    return <span className="sort-icon">{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>;
  };



  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── MAIN CONTENT ── */}
        <div className="main-content">
          {/* Header */}
          <div className="header">
            <div className="header-left">
              <div>
                <div className="logo">⚔ ALBION MASTER</div>
                <div className="logo-sub">Market Scanner</div>
              </div>
            </div>
            <div className="header-right">
              <span className="last-update">
                {loading && loadingProgress.total > 0 
                  ? `Cargando... ${loadingProgress.loaded}/${loadingProgress.total} batches` 
                  : lastUpdate ? `Actualizado ${relativeTime(lastUpdate)}` : 'Sin datos'}
                {nextRefresh > 0 && !loading && ` | Auto-refresh: ${countdownStr}`}
              </span>
              <button className="refresh-btn" onClick={loadData} disabled={loading}>
                <span className={loading ? 'spin' : ''}>⟳</span>
                {loading ? 'Escaneando...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="mobile-header">
            <div className="logo">⚔ ALBION MASTER</div>
            <button className="refresh-btn" onClick={loadData} disabled={loading}>
              <span className={loading ? 'spin' : ''}>⟳</span>
              {loading ? '...' : 'Refresh'}
            </button>
          </div>
          <div className="mobile-header-meta">
            {loading && loadingProgress.total > 0
              ? `Cargando... ${loadingProgress.loaded}/${loadingProgress.total} batches`
              : lastUpdate ? `Actualizado ${relativeTime(lastUpdate)}` : 'Sin datos'}
            {nextRefresh > 0 && !loading && ` · Auto-refresh: ${countdownStr}`}
          </div>





            {/* Top Recommendation Banner */}
            {topOpp && !loading && (
              <div className="top-banner">
                <div className="top-badge">🏆 #1 Recomendación del momento</div>
                <div className="top-text">
                  Compra <strong>{getItemName(topOpp.item.baseId || topOpp.item.id) || topOpp.item.name}{topOpp.item.enchantLevel > 0 ? ` .${topOpp.item.enchantLevel}` : ''}</strong> en{' '}
                  <span className="city-highlight" style={cityBadgeStyle(topOpp.buyCity)}>
                    {topOpp.buyCity}
                  </span>{' '}
                  a <strong>{topOpp.buyPrice.toLocaleString()} plata</strong> y véndelo en{' '}
                  <span className="city-highlight" style={cityBadgeStyle(topOpp.sellCity)}>
                    {topOpp.sellCity}
                  </span>{' '}
                  a <strong>{topOpp.sellPrice.toLocaleString()} plata</strong>.

                  {' '}Ganancia neta estimada: <strong style={{color: '#00ff88'}}>+{topOpp.netProfit.toLocaleString()} plata</strong> por unidad ({topOpp.marginPct.toFixed(1)}% margen neto).
                  {' '}Costos descontados: {Math.floor(topOpp.taxValSell + topOpp.taxValBuy).toLocaleString()} imptos. Tiempo viaje: {topOpp.travelTime} min.
                  {topOpp.vol24h > 100
                    ? ` Alta liquidez con ${formatNumber(topOpp.vol24h)} unidades en 24h.`
                    : topOpp.vol24h > 0
                    ? ` Volumen moderado: ${formatNumber(topOpp.vol24h)} en 24h.`
                    : ' Sin volumen reciente — verificar en juego.'
                  }
                  {topOpp.maxAge < 1
                    ? ' Datos ultra-frescos (< 1h).'
                    : ` Datos de hace ${topOpp.maxAge.toFixed(1)}h.`
                  }
                  {topOpp.consistency > 0.8
                    ? ' Precios estables — bajo riesgo de fluctuación.'
                    : topOpp.consistency > 0.5
                    ? ' Volatilidad moderada — verificar antes de invertir fuerte.'
                    : ' ⚠ Alta volatilidad — operar con precaución.'
                  }
                </div>
                <div className="top-numbers">
                  <div className="top-num-item">
                    <div className="top-num-label">Compra</div>
                    <div className="top-num-val">{topOpp.buyPrice.toLocaleString()}</div>
                  </div>
                  <div className="top-num-item">
                    <div className="top-num-label">Venta</div>
                    <div className="top-num-val">{topOpp.sellPrice.toLocaleString()}</div>
                  </div>
                  <div className="top-num-item">
                    <div className="top-num-label">Ganancia Neta</div>
                    <div className="top-num-val" style={{color: '#00ff88'}}>+{topOpp.netProfit.toLocaleString()}</div>
                  </div>
                  <div className="top-num-item">
                    <div className="top-num-label">Score</div>
                    <div className="top-num-val" style={{ color: scoreColor(topOpp.score) }}>
                      {topOpp.score.toFixed(3)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Banner (compact 3-line version) */}
            {topOpp && !loading && (
              <div className="mobile-banner">
                <div className="mobile-banner-line1">🏆 #1 RECOMENDACIÓN</div>
                <div className="mobile-banner-line2">
                  <ItemIcon itemId={topOpp.item.id} tier={topOpp.item.tier} />
                  <span style={{ fontWeight: 700 }}>
                    {getItemName(topOpp.item.baseId || topOpp.item.id) || topOpp.item.name}{topOpp.item.enchantLevel > 0 ? ` .${topOpp.item.enchantLevel}` : ''}
                  </span>
                  <span style={{ color: '#546a8d' }}>—</span>
                  <span className="city-badge" style={cityBadgeStyle(topOpp.buyCity)}>{shortCityName(topOpp.buyCity)}</span>
                  <span style={{ color: '#3a4f70' }}>→</span>
                  <span className="city-badge" style={cityBadgeStyle(topOpp.sellCity)}>{shortCityName(topOpp.sellCity)}</span>
                </div>
                <div className="mobile-banner-line3">
                  <strong>+{topOpp.netProfit.toLocaleString()} a.</strong> netos · <span className="cyan">{topOpp.marginPct.toFixed(1)}%</span> margen
                </div>
              </div>
            )}







        {/* Filters Container */}
        <div className="filters-container" style={{ marginBottom: 16 }}>
          <button 
            className="filter-toggle-btn" 
            onClick={() => setShowFilters(!showFilters)}
            style={{ 
              background: '#1a2548', color: '#8899aa', border: '1px solid #2a3a5a', 
              padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
              marginBottom: showFilters ? 16 : 0, width: '100%', textAlign: 'left',
              fontWeight: 'bold'
            }}
          >
            {showFilters ? '⚙️ Ocultar Filtros ▲' : '⚙️ Mostrar Filtros ▼'}
          </button>
          
          {showFilters && (
          <div className="settings-page">
            <div style={{ fontSize: 12, color: '#6a8ab0', marginBottom: 16 }}>
              Los cambios se aplican en tiempo real a todas las secciones.
            </div>

            {/* Names loading status */}
            {namesLoading ? (
              <div style={{ color: '#00ff88', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span className="loading-spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                Cargando nombres...
              </div>
            ) : namesError ? (
              <div style={{ color: '#ffd700', fontSize: 12, marginBottom: 12 }}>
                ⚠️ Nombres en inglés (fallo al cargar traducción)
              </div>
            ) : null}

            {/* Categories Section */}
            <div className="settings-section">
              <div className="settings-section-title">📦 Categorías</div>
              <div className="cat-controls">
                <button className="cat-ctrl-btn" onClick={() => setSelectedCategories(ALL_CATEGORIES.reduce((acc, c) => ({...acc, [c]: true}), {}))}>
                  Seleccionar todo
                </button>
                <button className="cat-ctrl-btn" onClick={() => setSelectedCategories(ALL_CATEGORIES.reduce((acc, c) => ({...acc, [c]: false}), {}))}>
                  Limpiar todo
                </button>
              </div>
              <div className="category-grid">
                {ALL_CATEGORIES.map(c => (
                  <div 
                    key={c} 
                    className={`cat-btn ${selectedCategories[c] ? 'active' : ''}`}
                    onClick={() => setSelectedCategories(prev => ({...prev, [c]: !prev[c]}))}
                  >
                    <span>{c}</span>
                    <span className="cat-count">{categoryCounts[c] || 0}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enchantments Section */}
            <div className="settings-section">
              <div className="settings-section-title">✨ Encantamientos</div>
              <div className="cat-controls">
                <button className="cat-ctrl-btn" onClick={() => setEnchantmentFilters({0:true, 1:true, 2:true, 3:true, 4:true})}>
                  Todos
                </button>
              </div>
              <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                <div className={`cat-btn ${enchantmentFilters[0] ? 'active' : ''}`} onClick={() => setEnchantmentFilters(p => ({...p, 0: !p[0]}))}>
                  <span>Base (0)</span>
                </div>
                {[1, 2, 3, 4].map(level => (
                  <div key={level} className={`cat-btn ${enchantmentFilters[level] ? 'active' : ''}`} onClick={() => setEnchantmentFilters(p => ({...p, [level]: !p[level]}))}>
                    <span>.{level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cities Section */}
            <div className="settings-section">
              <div className="settings-section-title">🏰 Ciudades</div>
              <div className="cat-controls">
                <button className="cat-ctrl-btn" onClick={() => setSelectedCities(LOCATIONS.reduce((acc, c) => ({...acc, [c]: SAFE_CITIES.includes(c)}), {}))}>
                  Solo ciudades seguras
                </button>
                <button className="cat-ctrl-btn" onClick={() => setSelectedCities(LOCATIONS.reduce((acc, c) => ({...acc, [c]: true}), {}))}>
                  Todas las ciudades
                </button>
              </div>
              <div className="category-grid">
                {SAFE_CITIES.map(c => (
                  <div 
                    key={c} 
                    className={`cat-btn ${selectedCities[c] ? 'active' : ''}`}
                    onClick={() => {
                      const activeCount = Object.values(selectedCities).filter(v => v).length;
                      if (selectedCities[c] && activeCount <= 2) return;
                      setSelectedCities(prev => ({...prev, [c]: !prev[c]}));
                    }}
                  >
                    <span>🛡️ {c}</span>
                  </div>
                ))}
                {PVP_CITIES.map(c => (
                  <div 
                    key={c} 
                    className={`cat-btn ${selectedCities[c] ? 'active' : ''}`}
                    style={selectedCities[c] ? { background: '#ff446622', borderColor: '#ff4466' } : {}}
                    onClick={() => {
                      const activeCount = Object.values(selectedCities).filter(v => v).length;
                      if (selectedCities[c] && activeCount <= 2) return;
                      setSelectedCities(prev => ({...prev, [c]: !prev[c]}));
                    }}
                  >
                    <span style={selectedCities[c] ? { color: '#ff8899' } : {}}>⚔️ {c}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Taxes & Thresholds Section */}
            <div className="settings-section">
              <div className="settings-section-title">📊 Impuestos y Umbrales</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="filter-group">
                  <span className="filter-label">Impuesto Venta %</span>
                  <input type="number" step="0.5" min="0" max="30" value={taxSell} onChange={e => setTaxSell(Number(e.target.value))} className="val-input" />
                </div>
                <div className="filter-group">
                  <span className="filter-label">Impuesto Compra %</span>
                  <input type="number" step="0.5" min="0" max="30" value={taxBuy} onChange={e => setTaxBuy(Number(e.target.value))} className="val-input" />
                </div>
                <div className="filter-group">
                  <span className="filter-label">Tiempo máx viaje</span>
                  <select className="filter-select" value={maxTravelTime} onChange={e => setMaxTravelTime(Number(e.target.value))}>
                    {[5, 10, 20, 30, 45].map(v => <option key={v} value={v}>{v} min</option>)}
                  </select>
                </div>
                <div className="filter-group" style={{ borderLeft: '1px solid #1a2548', paddingLeft: 24 }}>
                  <span className="filter-label">Margen Neto Mín</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={minMargin}
                    onChange={e => setMinMargin(Number(e.target.value))}
                  />
                  <span className="filter-val">{minMargin}%</span>
                </div>
                <div className="filter-group">
                  <span className="filter-label">Volumen mín</span>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={minVolume}
                    onChange={e => setMinVolume(Number(e.target.value))}
                  />
                  <span className="filter-val">{formatNumber(minVolume)}</span>
                </div>
                <div className="filter-group" style={{ flexGrow: 0 }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={freshOnly}
                      onChange={e => setFreshOnly(e.target.checked)}
                    />
                    Solo datos frescos (&lt;1h)
                  </label>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div className="loading-container">
              {(() => {
                const total = loadingProgress.total || 1;
                const loaded = loadingProgress.loaded || 0;
                const pct = Math.min(100, Math.floor((loaded / total) * 100));
                
                const currentMsg = LOADING_MESSAGES.find(m => pct >= m.min && pct <= m.max)?.msg 
                  || "Procesando datos del mercado...";

                return (
                  <>
                    <div className="loading-logo">⚔️ ALBION MASTER</div>
                    <div className="loading-msg">{currentMsg}</div>
                    
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    
                    <div className="progress-pct">{pct}%</div>
                    
                    <div className="loading-batch">
                      Procesando lote {loaded} de {total}...
                    </div>
                    
                    {opportunities.length > 0 && (
                      <div className="loading-stats">
                        {opportunities.length.toLocaleString()} oportunidades encontradas hasta ahora
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {opportunities.length === 0 ? (
                <>
                   No se encontraron oportunidades rentables en este momento.<br />
                  Esto puede ocurrir cuando el Data Project tiene pocos datos recientes.<br />
                  Intenta hacer click en Refresh en unos minutos.
                </>
              ) : (
                <>
                  {opportunities.length} oportunidades brutas encontradas, pero ninguna cumple los filtros actuales.<br />
                  Intenta reducir el margen mínimo ({minMargin}%) o el volumen mínimo ({minVolume}).
                </>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                    
                    <th style={{ width: '240px' }}>
                      <span className="sortable" onClick={() => handleSort('itemName')}>ÍTEM {renderSortIcon('itemName')}</span>
                    </th>

                    <th style={{ width: '130px' }}>
                      <span className="sortable" onClick={() => handleSort('buyCity')}>COMPRAR EN {renderSortIcon('buyCity')}</span>
                    </th>

                    <th style={{ width: '30px', textAlign: 'center' }}>→</th>

                    <th style={{ width: '130px' }}>
                      <span className="sortable" onClick={() => handleSort('sellCity')}>VENDER EN {renderSortIcon('sellCity')}</span>
                    </th>
                    
                    <th style={{ width: '120px' }}>
                      <span className="sortable" onClick={() => handleSort('buyPrice')}>PRECIO COMPRA {renderSortIcon('buyPrice')}</span>
                    </th>

                    <th style={{ width: '120px' }}>
                      <span className="sortable" onClick={() => handleSort('sellPrice')}>PRECIO VENTA {renderSortIcon('sellPrice')}</span>
                    </th>

                    <th style={{ width: '130px' }}>
                      <span className="th-net sortable" onClick={() => handleSort('netProfit')}>GANANCIA NETA {renderSortIcon('netProfit')}</span>
                    </th>

                    <th style={{ width: '100px' }}>
                      <span className="sortable" onClick={() => handleSort('marginPct')}>MARGEN % {renderSortIcon('marginPct')}</span>
                    </th>

                    <th style={{ width: '110px' }}>
                      IMPUESTOS
                    </th>

                    <th style={{ width: '130px' }}>
                      <span className="sortable" onClick={() => handleSort('vol24h')}>VOLUMEN 24H {renderSortIcon('vol24h')}</span>
                    </th>

                    <th style={{ width: '100px' }}>
                      <span className="sortable" onClick={() => handleSort('maxAge')}>FRESCURA {renderSortIcon('maxAge')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {renderList.map((o, i) => {
                    return (
                      <tr key={o.key} className={`${o.isPinned ? 'row-pinned' : ''} ${!o.isProfitable || o.maxAge > MAX_AGE_HOURS ? 'row-alert' : ''}`}>
                        <td style={{ textAlign: 'center' }}>
                          <button className={`pin-btn ${o.isPinned ? 'active' : ''}`} onClick={() => togglePin(o)} title="Fijar oportunidad">📌</button>
                          {!o.isPinned && <div style={{ fontSize: 10, opacity: 0.5 }}>{i + 1}</div>}
                        </td>

                        <td className="item-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ItemIcon itemId={o.item.id} tier={o.item.tier} />
                          <span>
                            {getItemName(o.item.baseId || o.item.id) || o.item.name}{o.item.enchantLevel > 0 ? ` .${o.item.enchantLevel}` : ''}
                          </span>
                        </td>

                        <td>
                          <span className="city-badge" style={cityBadgeStyle(o.buyCity)}>{shortCityName(o.buyCity)}</span>
                        </td>

                        <td style={{ textAlign: 'center', color: '#3a4f70' }}>→</td>

                        <td>
                          <span className="city-badge" style={cityBadgeStyle(o.sellCity)}>{shortCityName(o.sellCity)}</span>
                        </td>

                        <td className="price">{o.buyPrice.toLocaleString()} a.</td>
                        <td className="price">{o.sellPrice.toLocaleString()} a.</td>

                        <td className="td-net">+{o.netProfit.toLocaleString()}</td>

                        <td style={{ color: o.marginPct > 30 ? '#00ff88' : '#c8d6e5', fontWeight: 'bold' }}>
                          {o.marginPct.toFixed(1)}%
                        </td>

                        <td className="td-tax">-{Math.floor(o.taxValSell + o.taxValBuy).toLocaleString()}</td>

                        <td className="volume">{formatNumber(o.vol24h)}</td>

                        <td style={{ color: ageColor(o.maxAge), fontWeight: '500' }}>
                          {formatAge(o.maxAge)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Mobile Sort + Cards + Pagination */}
        {isMobile && !loading && filtered.length > 0 && (() => {
          const MOBILE_PAGE_SIZE = 20;
          const totalPages = Math.ceil(renderList.length / MOBILE_PAGE_SIZE);
          const startIdx = (mobilePage - 1) * MOBILE_PAGE_SIZE;
          const pageItems = renderList.slice(startIdx, startIdx + MOBILE_PAGE_SIZE);

          return (
            <>
              <div className="mobile-sort-bar">
                <span className="mobile-sort-bar-label">Ordenar:</span>
                {[
                  { key: 'netProfit', label: 'Ganancia ▼' },
                  { key: 'marginPct', label: 'Margen' },
                  { key: 'vol24h', label: 'Volumen' },
                  { key: 'maxAge', label: 'Frescura' },
                ].map(s => (
                  <button
                    key={s.key}
                    className={`mobile-sort-btn ${sortConfig.key === s.key ? 'active' : ''}`}
                    onClick={() => handleSort(s.key)}
                  >
                    {s.label}{sortConfig.key === s.key ? (sortConfig.direction === 'desc' ? ' ▼' : ' ▲') : ''}
                  </button>
                ))}
              </div>

              <div className="cards-container" ref={cardsContainerRef}>
                {pageItems.map((o) => (
                  <div key={o.key} className="mobile-card">
                    <div className="mobile-card-header">
                      <ItemIcon itemId={o.item.id} tier={o.item.tier} />
                      <div>
                        <div className="mobile-card-item-name">
                          {getItemName(o.item.baseId || o.item.id) || o.item.name}
                          {o.item.enchantLevel > 0 ? ` .${o.item.enchantLevel}` : ''}
                        </div>
                        <div className="mobile-card-item-meta">
                          {o.item.enchantLevel > 0 ? `.${o.item.enchantLevel} · ` : ''}{o.item.tier}
                        </div>
                      </div>
                    </div>
                    <div className="mobile-card-route">
                      <span>🏙️</span>
                      <span className="city-badge" style={cityBadgeStyle(o.buyCity)}>{shortCityName(o.buyCity)}</span>
                      <span className="mobile-card-route-arrow">→</span>
                      <span className="city-badge" style={cityBadgeStyle(o.sellCity)}>{shortCityName(o.sellCity)}</span>
                    </div>
                    <div className="mobile-card-profit-row">
                      <span className="mobile-card-profit">+{o.netProfit.toLocaleString()} a.</span>
                      <span className="mobile-card-margin">{o.marginPct.toFixed(1)}%</span>
                    </div>
                    <div className="mobile-card-prices">
                      <span>Compra: {o.buyPrice.toLocaleString()}</span>
                      <span>Venta: {o.sellPrice.toLocaleString()}</span>
                    </div>
                    <div className="mobile-card-details">
                      <span style={{ color: '#ff4466' }}>TAX: -{Math.floor(o.taxValSell + o.taxValBuy).toLocaleString()}</span>
                      <span style={{ color: '#ffd700' }}>Vol: {formatNumber(o.vol24h)}</span>
                      <span style={{ color: ageColor(o.maxAge) }}>📅 {formatAge(o.maxAge)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mobile-pagination">
                  <button
                    className="mobile-pagination-btn"
                    disabled={mobilePage <= 1}
                    onClick={() => {
                      setMobilePage(p => p - 1);
                      cardsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    ← Anterior
                  </button>
                  <span className="mobile-pagination-info">
                    Página {mobilePage} de {totalPages}
                  </span>
                  <button
                    className="mobile-pagination-btn"
                    disabled={mobilePage >= totalPages}
                    onClick={() => {
                      setMobilePage(p => p + 1);
                      cardsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          );
        })()}

        {/* Explicación de Uso */}
        <div style={{
          background: '#080f1c',
          borderTop: '1px solid #1a2548',
          padding: '24px',
          marginTop: '24px',
          color: '#5a7a9a',
          fontSize: '12px',
          lineHeight: '1.6',
          fontFamily: 'monospace'
        }}>
          <h3 style={{ color: '#00d4ff', marginBottom: '12px', fontSize: '14px' }}>¿Cómo usar Albion Master Scanner?</h3>
          <p style={{ marginBottom: '16px' }}>
            Este scanner detecta oportunidades rentables de comercio en tiempo real: comprar un ítem barato en una ciudad y venderlo más caro en otra.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            <div>
              <div style={{ fontWeight: 'bold', color: '#c8d6e5', marginBottom: '8px' }}>📋 Columnas de la tabla:</div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>• <strong>Ítem</strong> — nombre del producto y nivel de encantamiento (.1 .2 .3 .4)</li>
                <li>• <strong>Comprar en</strong> — ciudad donde encontrarás el precio más bajo</li>
                <li>• <strong>Vender en</strong> — ciudad donde hay órdenes de compra activas más altas</li>
                <li>• <strong>Precio compra</strong> — lo que pagarás por unidad en el mercado</li>
                <li>• <strong>Precio venta</strong> — lo que recibirás por unidad (orden de compra activa)</li>
                <li>• <strong>Ganancia neta</strong> — beneficio real por unidad después de impuestos</li>
                <li>• <strong>Margen %</strong> — rentabilidad porcentual de la operación</li>
                <li>• <strong>Impuestos</strong> — costo fiscal descontado (configurable en Filtros)</li>
                <li>• <strong>Volumen 24h</strong> — unidades transaccionadas en las últimas 24 horas (liquidez)</li>
                <li>• <strong>Frescura</strong> — hace cuánto se actualizó el precio (verde &lt;1h, amarillo &lt;3h, rojo &gt;3h)</li>
              </ul>
            </div>
            
            <div>
              <div style={{ fontWeight: 'bold', color: '#c8d6e5', marginBottom: '8px' }}>💡 Tips:</div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                <li>• Activa "Solo datos frescos" en Filtros para ver solo precios de menos de 1 hora</li>
                <li>• Desactiva ciudades PVP (⚔️) si no quieres arriesgar tus ítems en zonas peligrosas</li>
                <li>• El precio de venta mostrado es una orden de compra activa — la venta es inmediata</li>
                <li>• ⚠️ Black Market tiene demanda limitada — la venta puede no ser inmediata</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
          {/* Footer */}
          <div style={{
            textAlign: 'center',
            padding: '16px',
            fontSize: 10,
            color: '#2a3a5a',
            letterSpacing: 1,
          }}>
            ALBION MASTER v1.0.0 • DATOS VÍA ALBION ONLINE DATA PROJECT • SIN AFILIACIÓN OFICIAL • SCORE = 0.4×RENT + 0.25×LIQ + 0.2×CONF + 0.15×VEL
          </div>
        </div>{/* /main-content */}
      </div>{/* /app */}

      {/* Mobile Bottom Sheet */}
      {isMobile && showMobileFilters && (
        <>
          <div className="mobile-overlay" onClick={() => setShowMobileFilters(false)} />
          <div className="mobile-bottom-sheet">
            <div className="mobile-bottom-sheet-header">
              <div className="mobile-bottom-sheet-title">⚙️ Filtros</div>
              <button className="mobile-bottom-sheet-close" onClick={() => setShowMobileFilters(false)}>✕</button>
            </div>
            <div className="settings-page" style={{ maxWidth: '100%' }}>
              {namesLoading ? (
                <div style={{ color: '#00ff88', fontSize: 12, marginBottom: 12 }}>Cargando nombres...</div>
              ) : namesError ? (
                <div style={{ color: '#ffd700', fontSize: 12, marginBottom: 12 }}>⚠️ Nombres en inglés</div>
              ) : null}
              <div className="settings-section">
                <div className="settings-section-title">📦 Categorías</div>
                <div className="cat-controls">
                  <button className="cat-ctrl-btn" onClick={() => setSelectedCategories(ALL_CATEGORIES.reduce((acc, c) => ({...acc, [c]: true}), {}))}>Seleccionar todo</button>
                  <button className="cat-ctrl-btn" onClick={() => setSelectedCategories(ALL_CATEGORIES.reduce((acc, c) => ({...acc, [c]: false}), {}))}>Limpiar todo</button>
                </div>
                <div className="category-grid">
                  {ALL_CATEGORIES.map(c => (
                    <div key={c} className={`cat-btn ${selectedCategories[c] ? 'active' : ''}`} onClick={() => setSelectedCategories(prev => ({...prev, [c]: !prev[c]}))}>
                      <span>{c}</span>
                      <span className="cat-count">{categoryCounts[c] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">✨ Encantamientos</div>
                <div className="cat-controls">
                  <button className="cat-ctrl-btn" onClick={() => setEnchantmentFilters({0:true, 1:true, 2:true, 3:true, 4:true})}>Todos</button>
                </div>
                <div className="category-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                  <div className={`cat-btn ${enchantmentFilters[0] ? 'active' : ''}`} onClick={() => setEnchantmentFilters(p => ({...p, 0: !p[0]}))}><span>Base (0)</span></div>
                  {[1, 2, 3, 4].map(level => (
                    <div key={level} className={`cat-btn ${enchantmentFilters[level] ? 'active' : ''}`} onClick={() => setEnchantmentFilters(p => ({...p, [level]: !p[level]}))}><span>.{level}</span></div>
                  ))}
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">🏰 Ciudades</div>
                <div className="cat-controls">
                  <button className="cat-ctrl-btn" onClick={() => setSelectedCities(LOCATIONS.reduce((acc, c) => ({...acc, [c]: SAFE_CITIES.includes(c)}), {}))}>Solo seguras</button>
                  <button className="cat-ctrl-btn" onClick={() => setSelectedCities(LOCATIONS.reduce((acc, c) => ({...acc, [c]: true}), {}))}>Todas</button>
                </div>
                <div className="category-grid">
                  {SAFE_CITIES.map(c => (
                    <div key={c} className={`cat-btn ${selectedCities[c] ? 'active' : ''}`} onClick={() => { const n = Object.values(selectedCities).filter(v => v).length; if (selectedCities[c] && n <= 2) return; setSelectedCities(prev => ({...prev, [c]: !prev[c]})); }}>
                      <span>🛡️ {c}</span>
                    </div>
                  ))}
                  {PVP_CITIES.map(c => (
                    <div key={c} className={`cat-btn ${selectedCities[c] ? 'active' : ''}`} style={selectedCities[c] ? { background: '#ff446622', borderColor: '#ff4466' } : {}} onClick={() => { const n = Object.values(selectedCities).filter(v => v).length; if (selectedCities[c] && n <= 2) return; setSelectedCities(prev => ({...prev, [c]: !prev[c]})); }}>
                      <span style={selectedCities[c] ? { color: '#ff8899' } : {}}>⚔️ {c}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="settings-section">
                <div className="settings-section-title">📊 Impuestos y Umbrales</div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div className="filter-group">
                    <span className="filter-label">Tax Venta %</span>
                    <input type="number" step="0.5" min="0" max="30" value={taxSell} onChange={e => setTaxSell(Number(e.target.value))} className="val-input" />
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Tax Compra %</span>
                    <input type="number" step="0.5" min="0" max="30" value={taxBuy} onChange={e => setTaxBuy(Number(e.target.value))} className="val-input" />
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Tiempo máx</span>
                    <select className="filter-select" value={maxTravelTime} onChange={e => setMaxTravelTime(Number(e.target.value))}>
                      {[5, 10, 20, 30, 45].map(v => <option key={v} value={v}>{v} min</option>)}
                    </select>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Margen Mín</span>
                    <input type="range" min="0" max="100" value={minMargin} onChange={e => setMinMargin(Number(e.target.value))} />
                    <span className="filter-val">{minMargin}%</span>
                  </div>
                  <div className="filter-group">
                    <span className="filter-label">Vol mín</span>
                    <input type="range" min="0" max="5000" step="50" value={minVolume} onChange={e => setMinVolume(Number(e.target.value))} />
                    <span className="filter-val">{formatNumber(minVolume)}</span>
                  </div>
                  <div className="filter-group">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={freshOnly} onChange={e => setFreshOnly(e.target.checked)} />
                      Solo frescos (&lt;1h)
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Mobile Filter FAB */}
      {isMobile && !showMobileFilters && !loading && (
        <button className="mobile-filter-fab" onClick={() => setShowMobileFilters(true)}>
          ⚙️ Filtros
        </button>
      )}

    </>
  );
}

export default function AlbionMaster() {
  return (
    <ErrorBoundary>
      <MarketScannerApp />
    </ErrorBoundary>
  );
}
