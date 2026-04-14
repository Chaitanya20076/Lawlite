"use strict";

const memoryStore = new Map();

function storeMemory(userMessage) {
  if (!userMessage || userMessage.length < 10) return;
  const key = "mem_" + Date.now();
  memoryStore.set(key, { text: userMessage, ts: Date.now() });
  // Keep only last 50
  if (memoryStore.size > 50) {
    const firstKey = memoryStore.keys().next().value;
    memoryStore.delete(firstKey);
  }
}

function getRelevantMemory(query) {
  if (!query) return [];
  const q = query.toLowerCase();
  const results = [];
  for (const [, val] of memoryStore) {
    if (val.text.toLowerCase().includes(q.slice(0, 20))) {
      results.push(val.text);
    }
  }
  return results.slice(0, 3);
}

module.exports = { storeMemory, getRelevantMemory };