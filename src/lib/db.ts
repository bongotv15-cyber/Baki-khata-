export class LocalDB {
  dbName: string;
  version: number;
  db: IDBDatabase | null = null;

  constructor(dbName: string) {
    this.dbName = dbName;
    this.version = 1;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("customers"))
          db.createObjectStore("customers", { keyPath: "id" });
        if (!db.objectStoreNames.contains("sync_queue"))
          db.createObjectStore("sync_queue", { keyPath: "queueId" });
        if (!db.objectStoreNames.contains("meta"))
          db.createObjectStore("meta", { keyPath: "key" });
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
    });
  }

  async put(store: string, item: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("DB not initialized"));
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async get(store: string, id: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("DB not initialized"));
      const req = this.db.transaction(store, "readonly").objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async getAll(store: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("DB not initialized"));
      const req = this.db.transaction(store, "readonly").objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async delete(store: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("DB not initialized"));
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }

  async clear(store: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error("DB not initialized"));
      const tx = this.db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  }
}

export function purgeOldLocalStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.includes("BakirKhata") || key.includes("rocketApp_db")) {
      localStorage.removeItem(key);
    }
  });
}
