import { LocalDB } from "./db";
import { generateUUID } from "./utils";
import { db as firestoreDB } from "./firebase";
import {
  collection,
  doc,
  writeBatch,
  onSnapshot,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";

export class SyncManager {
  appDB: LocalDB;
  userId: string;
  isSyncing: boolean = false;
  MAX_RETRIES: number = 5;
  MAX_BATCH_SIZE: number = 499;
  onStatusChange: (status: string, msg?: string) => void;
  onDataChange: () => void;

  constructor(
    appDB: LocalDB,
    userId: string,
    onStatusChange: (status: string, msg?: string) => void,
    onDataChange: () => void
  ) {
    this.appDB = appDB;
    this.userId = userId;
    this.onStatusChange = onStatusChange;
    this.onDataChange = onDataChange;

    window.addEventListener("online", () => {
      this.updateUI("online");
      this.processQueue();
    });
    window.addEventListener("offline", () => this.updateUI("offline"));
  }

  async mutate(action: "SET" | "DELETE", docId: string | null, dataPayload?: any) {
    const timestamp = Date.now();
    const id = docId || generateUUID();
    const localData = { 
      id, 
      ...dataPayload, 
      updatedAt: timestamp,
      deleted: action === "DELETE"
    };

    if (action === "DELETE") {
      await this.appDB.delete("customers", id);
    } else {
      await this.appDB.put("customers", localData);
    }

    await this.appDB.put("sync_queue", {
      queueId: generateUUID(),
      action: "SET", // Always SET because we use soft delete (deleted: true)
      docId: id,
      payload: localData,
      retry: 0,
    });

    this.onDataChange();
    this.processQueue();
  }

  async processQueue() {
    if (!navigator.onLine || this.isSyncing) return;
    this.isSyncing = true;
    this.updateUI("syncing");

    try {
      const queue = await this.appDB.getAll("sync_queue");
      if (queue.length === 0) {
        this.updateUI("success");
        this.isSyncing = false;
        return;
      }

      const activeQueue = queue.filter((item) => (item.retry || 0) < this.MAX_RETRIES);
      const failedItems = queue.filter((item) => (item.retry || 0) >= this.MAX_RETRIES);

      if (activeQueue.length === 0) {
        this.isSyncing = false;
        if (failedItems.length > 0) this.updateUI("manual_retry", String(failedItems.length));
        else this.updateUI("success");
        return;
      }

      const batch = writeBatch(firestoreDB);
      const userRef = collection(firestoreDB, "users", this.userId, "customers");

      const chunk = activeQueue.slice(0, this.MAX_BATCH_SIZE);

      chunk.forEach((item) => {
        const docRef = doc(userRef, item.docId);
        if (item.action === "SET") {
          batch.set(docRef, item.payload, { merge: true });
        } else if (item.action === "DELETE") {
          batch.delete(docRef);
        }
      });

      await batch.commit();

      for (let item of chunk) {
        await this.appDB.delete("sync_queue", item.queueId);
      }

      if (activeQueue.length > this.MAX_BATCH_SIZE) {
        setTimeout(() => this.processQueue(), 500);
      } else {
        this.isSyncing = false;
        if (failedItems.length > 0) this.updateUI("manual_retry", String(failedItems.length));
        else this.updateUI("success");
      }
    } catch (error) {
      console.error("Firebase Sync Error: ", error);
      this.updateUI("error", "Network Issue");
      await this.handleBackoff();
    } finally {
      if (this.isSyncing) this.isSyncing = false;
    }
  }

  async handleBackoff() {
    this.isSyncing = false;
    const queue = await this.appDB.getAll("sync_queue");
    const activeItems = queue.filter((item) => (item.retry || 0) < this.MAX_RETRIES);

    if (activeItems.length === 0) return;

    const chunk = activeItems.slice(0, this.MAX_BATCH_SIZE);
    let maxRetryInChunk = 0;

    for (let item of chunk) {
      item.retry = (item.retry || 0) + 1;
      await this.appDB.put("sync_queue", item);
      if (item.retry > maxRetryInChunk) maxRetryInChunk = item.retry;
    }

    if (maxRetryInChunk >= this.MAX_RETRIES) {
      this.updateUI("error", "Sync Blocked");
      return;
    }

    const delay = Math.min(1000 * 2 ** maxRetryInChunk, 60000);
    setTimeout(() => this.processQueue(), delay);
  }

  async retryFailedItems() {
    this.updateUI("syncing");
    const queue = await this.appDB.getAll("sync_queue");
    const failedItems = queue.filter((item) => (item.retry || 0) >= this.MAX_RETRIES);

    if (failedItems.length === 0) {
      this.processQueue();
      return;
    }

    for (let item of failedItems) {
      item.retry = 0;
      await this.appDB.put("sync_queue", item);
    }

    this.processQueue();
  }

  async listenRemote() {
    const userRef = collection(firestoreDB, "users", this.userId, "customers");
    
    // Get last sync time from local DB
    const meta = await this.appDB.get("meta", "lastSyncTime");
    const lastSync = meta ? meta.value : 0;

    // Only listen for documents updated after the last sync
    const q = query(
      userRef,
      where("updatedAt", ">", lastSync),
      orderBy("updatedAt", "asc")
    );

    onSnapshot(
      q,
      async (snapshot) => {
        let changed = false;
        let latestTimestamp = lastSync;

        for (const change of snapshot.docChanges()) {
          const rData = change.doc.data();
          const rId = change.doc.id;
          if (!rData.id) rData.id = rId;

          if (rData.updatedAt > latestTimestamp) {
            latestTimestamp = rData.updatedAt;
          }

          if (change.type === "added" || change.type === "modified") {
            if (rData.deleted) {
              await this.appDB.delete("customers", rId);
              changed = true;
            } else {
              const local = await this.appDB.get("customers", rId);
              if (!local || !local.updatedAt || rData.updatedAt > local.updatedAt) {
                await this.appDB.put("customers", rData);
                changed = true;
              }
            }
          } else if (change.type === "removed") {
            // This handles hard deletes if they happen, though we prefer soft deletes
            await this.appDB.delete("customers", rId);
            changed = true;
          }
        }

        if (latestTimestamp > lastSync) {
          await this.appDB.put("meta", { key: "lastSyncTime", value: latestTimestamp });
        }

        if (changed) this.onDataChange();
      },
      (err) => {
        console.error("Listener Error", err);
        // If query fails (e.g. index missing), fallback to full sync
        if (err.message.includes("index")) {
          console.warn("Firestore Index missing. Falling back to full sync.");
          this.listenRemoteFull();
        }
      }
    );
  }

  private listenRemoteFull() {
    const userRef = collection(firestoreDB, "users", this.userId, "customers");
    onSnapshot(
      userRef,
      async (snapshot) => {
        let changed = false;
        for (const change of snapshot.docChanges()) {
          const rData = change.doc.data();
          const rId = change.doc.id;
          if (!rData.id) rData.id = rId;

          if (change.type === "added" || change.type === "modified") {
            if (rData.deleted) {
              await this.appDB.delete("customers", rId);
              changed = true;
            } else {
              const local = await this.appDB.get("customers", rId);
              if (!local || !local.updatedAt || rData.updatedAt > local.updatedAt) {
                await this.appDB.put("customers", rData);
                changed = true;
              }
            }
          } else if (change.type === "removed") {
            await this.appDB.delete("customers", rId);
            changed = true;
          }
        }
        if (changed) this.onDataChange();
      },
      (err) => console.error("Full Listener Error", err)
    );
  }

  updateUI(state: string, msg: string = "") {
    this.onStatusChange(state, msg);
  }
}
