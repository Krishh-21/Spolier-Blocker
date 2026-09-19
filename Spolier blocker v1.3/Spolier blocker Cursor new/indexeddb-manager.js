// IndexedDB Manager for Spoiler Shield
// Migrates large data from Chrome Sync Storage to IndexedDB for unlimited local storage
// Phase 2 Optimization

const DB_NAME = 'spoiler-shield';
const DB_VERSION = 1;

// Store names
const STORES = {
  PHRASES: 'phrases',        // Expanded phrase lists per title
  RL_WEIGHTS: 'rlWeights',   // Reinforcement learning weights
  CACHE: 'cache',            // Performance cache
  METADATA: 'metadata'       // Migration tracking, stats
};

/**
 * Open IndexedDB connection
 */
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PHRASES)) {
        const phraseStore = db.createObjectStore(STORES.PHRASES, { keyPath: 'titleId' });
        phraseStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.RL_WEIGHTS)) {
        const rlStore = db.createObjectStore(STORES.RL_WEIGHTS, { keyPath: 'phrase' });
        rlStore.createIndex('weight', 'weight', { unique: false });
        rlStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.CACHE)) {
        const cacheStore = db.createObjectStore(STORES.CACHE, { keyPath: 'key' });
        cacheStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
      
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
      
      console.log('[IndexedDB] Database schema created');
    };
  });
}

/**
 * Save phrases for a title to IndexedDB
 */
async function savePhrases(titleId, phrases) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHRASES], 'readwrite');
    const store = transaction.objectStore(STORES.PHRASES);
    
    const data = {
      titleId: String(titleId),
      phrases: phrases || [],
      timestamp: Date.now()
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get phrases for a title from IndexedDB
 */
async function getPhrases(titleId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHRASES], 'readonly');
    const store = transaction.objectStore(STORES.PHRASES);
    
    const request = store.get(String(titleId));
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.phrases : []);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all phrases from IndexedDB
 */
async function getAllPhrases() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHRASES], 'readonly');
    const store = transaction.objectStore(STORES.PHRASES);
    
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      // Flatten all phrases into single array
      const allPhrases = results.flatMap(r => r.phrases || []);
      resolve(allPhrases);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete phrases for a title
 */
async function deletePhrases(titleId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.PHRASES], 'readwrite');
    const store = transaction.objectStore(STORES.PHRASES);
    
    const request = store.delete(String(titleId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save RL weight to IndexedDB
 */
async function saveRLWeight(phrase, weight) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RL_WEIGHTS], 'readwrite');
    const store = transaction.objectStore(STORES.RL_WEIGHTS);
    
    const data = {
      phrase: String(phrase).toLowerCase(),
      weight: Number(weight),
      lastUpdated: Date.now()
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save multiple RL weights in batch
 */
async function saveRLWeightsBatch(weightsObject) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RL_WEIGHTS], 'readwrite');
    const store = transaction.objectStore(STORES.RL_WEIGHTS);
    
    const entries = Object.entries(weightsObject || {});
    let completed = 0;
    let errors = [];
    
    if (entries.length === 0) {
      resolve();
      return;
    }
    
    entries.forEach(([phrase, weight]) => {
      const data = {
        phrase: String(phrase).toLowerCase(),
        weight: Number(weight),
        lastUpdated: Date.now()
      };
      
      const request = store.put(data);
      request.onsuccess = () => {
        completed++;
        if (completed === entries.length) {
          resolve({ saved: completed, errors: errors.length });
        }
      };
      request.onerror = () => {
        errors.push(phrase);
        completed++;
        if (completed === entries.length) {
          resolve({ saved: completed - errors.length, errors: errors.length });
        }
      };
    });
  });
}

/**
 * Get RL weight from IndexedDB
 */
async function getRLWeight(phrase) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RL_WEIGHTS], 'readonly');
    const store = transaction.objectStore(STORES.RL_WEIGHTS);
    
    const request = store.get(String(phrase).toLowerCase());
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.weight : 0.5); // Default neutral weight
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all RL weights as object
 */
async function getAllRLWeights() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.RL_WEIGHTS], 'readonly');
    const store = transaction.objectStore(STORES.RL_WEIGHTS);
    
    const request = store.getAll();
    request.onsuccess = () => {
      const results = request.result || [];
      const weightsObject = {};
      results.forEach(r => {
        weightsObject[r.phrase] = r.weight;
      });
      resolve(weightsObject);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cache data with expiration
 */
async function setCache(key, value, ttlMs = 300000) { // Default 5 minutes
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    
    const data = {
      key: String(key),
      value: value,
      expiresAt: Date.now() + ttlMs
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get cached data (returns null if expired)
 */
async function getCache(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHE], 'readonly');
    const store = transaction.objectStore(STORES.CACHE);
    
    const request = store.get(String(key));
    request.onsuccess = () => {
      const result = request.result;
      if (!result) {
        resolve(null);
        return;
      }
      
      // Check expiration
      if (result.expiresAt < Date.now()) {
        // Expired, delete it
        deleteCache(key).catch(() => {});
        resolve(null);
        return;
      }
      
      resolve(result.value);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete cached data
 */
async function deleteCache(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.CACHE], 'readwrite');
    const store = transaction.objectStore(STORES.CACHE);
    
    const request = store.delete(String(key));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save metadata (migration status, stats, etc.)
 */
async function saveMetadata(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.METADATA], 'readwrite');
    const store = transaction.objectStore(STORES.METADATA);
    
    const data = {
      key: String(key),
      value: value,
      timestamp: Date.now()
    };
    
    const request = store.put(data);
    request.onsuccess = () => resolve(data);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get metadata
 */
async function getMetadata(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.METADATA], 'readonly');
    const store = transaction.objectStore(STORES.METADATA);
    
    const request = store.get(String(key));
    request.onsuccess = () => {
      const result = request.result;
      resolve(result ? result.value : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * MIGRATION: Move data from Chrome Sync to IndexedDB
 */
async function migrateFromSyncStorage() {
  console.log('[Migration] Starting migration from Chrome Sync to IndexedDB...');
  
  try {
    // Check if already migrated
    const migrated = await getMetadata('migrationComplete');
    if (migrated) {
      console.log('[Migration] Already migrated, skipping');
      return { success: true, alreadyMigrated: true };
    }
    
    // Get all data from sync storage
    const syncData = await new Promise(resolve => {
      chrome.storage.sync.get(null, resolve);
    });
    
    let migratedPhrases = 0;
    let migratedWeights = 0;
    
    // Migrate selectedMedia phrases
    if (syncData.selectedMedia && Array.isArray(syncData.selectedMedia)) {
      for (const media of syncData.selectedMedia) {
        if (media.id && media.phrases) {
          await savePhrases(media.id, media.phrases);
          migratedPhrases += media.phrases.length;
        }
      }
      console.log(`[Migration] Migrated ${migratedPhrases} phrases from ${syncData.selectedMedia.length} titles`);
    }
    
    // Migrate RL weights
    if (syncData.rlWeights && typeof syncData.rlWeights === 'object') {
      const result = await saveRLWeightsBatch(syncData.rlWeights);
      migratedWeights = result.saved;
      console.log(`[Migration] Migrated ${migratedWeights} RL weights`);
    }
    
    // Mark migration as complete
    await saveMetadata('migrationComplete', true);
    await saveMetadata('migrationDate', new Date().toISOString());
    await saveMetadata('migratedPhrases', migratedPhrases);
    await saveMetadata('migratedWeights', migratedWeights);
    
    // Preserve source data: the historical content script still consumes sync
    // phrases, and titles without IDs cannot be copied into IndexedDB safely.
    console.log('[Migration] Backup complete; source data preserved.');

    return {
      success: true,
      migratedPhrases,
      migratedWeights,
      freedSpace: false
    };
    
  } catch (error) {
    console.error('[Migration] Failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get database statistics
 */
async function getStorageStats() {
  try {
    const db = await openDatabase();
    
    const stats = {
      phrases: 0,
      rlWeights: 0,
      cache: 0,
      totalSize: 0
    };
    
    // Count phrases
    const phrasesCount = await new Promise((resolve) => {
      const transaction = db.transaction([STORES.PHRASES], 'readonly');
      const store = transaction.objectStore(STORES.PHRASES);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    stats.phrases = phrasesCount;
    
    // Count RL weights
    const weightsCount = await new Promise((resolve) => {
      const transaction = db.transaction([STORES.RL_WEIGHTS], 'readonly');
      const store = transaction.objectStore(STORES.RL_WEIGHTS);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    stats.rlWeights = weightsCount;
    
    // Count cache entries
    const cacheCount = await new Promise((resolve) => {
      const transaction = db.transaction([STORES.CACHE], 'readonly');
      const store = transaction.objectStore(STORES.CACHE);
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    stats.cache = cacheCount;
    
    return stats;
  } catch (error) {
    console.error('[IndexedDB] Failed to get stats:', error);
    return null;
  }
}

/**
 * Clear all IndexedDB data
 */
async function clearAllData() {
  try {
    const db = await openDatabase();
    
    const stores = [STORES.PHRASES, STORES.RL_WEIGHTS, STORES.CACHE, STORES.METADATA];
    
    for (const storeName of stores) {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    console.log('[IndexedDB] All data cleared');
    return true;
  } catch (error) {
    console.error('[IndexedDB] Failed to clear data:', error);
    return false;
  }
}
