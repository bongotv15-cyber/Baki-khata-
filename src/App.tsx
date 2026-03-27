/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { LocalDB, purgeOldLocalStorage } from "./lib/db";
import { SyncManager } from "./lib/sync";
import { Customer } from "./types";
import { Toaster, toast } from "sonner";
import { RefreshCw } from "lucide-react";

import AuthScreen from "./components/AuthScreen";
import HomeScreen from "./components/HomeScreen";
import AddCustomerScreen from "./components/AddCustomerScreen";
import TransactionScreen from "./components/TransactionScreen";
import ShareScreen from "./components/ShareScreen";
import ReportScreen from "./components/ReportScreen";

type Screen =
  | "auth"
  | "home"
  | "add"
  | "transaction"
  | "share"
  | "report";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("auth");
  const [storeName, setStoreName] = useState("");

  const [appDB, setAppDB] = useState<LocalDB | null>(null);
  const [syncEngine, setSyncEngine] = useState<SyncManager | null>(null);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [syncMsg, setSyncMsg] = useState("");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [shareData, setShareData] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        purgeOldLocalStorage();

        const newDB = new LocalDB("DBK_" + currentUser.uid);
        await newDB.init();
        setAppDB(newDB);

        const newSyncEngine = new SyncManager(
          newDB,
          currentUser.uid,
          (status, msg) => {
            setSyncStatus(status);
            setSyncMsg(msg || "");
          },
          async () => {
            const all = await newDB.getAll("customers");
            setCustomers(all);
          }
        );
        setSyncEngine(newSyncEngine);

        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setStoreName(userDoc.data().storeName);
          }
        } catch (e) {
          console.error(e);
        }

        const meta = await newDB.get("meta", "initialSync");
        if (!meta) {
          setLoading(true);
          try {
            const snap = await getDocs(
              collection(db, "users", currentUser.uid, "customers")
            );
            for (let docSnap of snap.docs) {
              let d = docSnap.data();
              d.id = docSnap.id;
              await newDB.put("customers", d);
            }
            await newDB.put("meta", { key: "initialSync", done: true });
          } catch (e) {
            console.error(e);
          }
        }

        newSyncEngine.listenRemote();
        
        // Only process queue if there are unsynced items
        const queue = await newDB.getAll("sync_queue");
        if (queue.length > 0) {
          newSyncEngine.processQueue();
        } else {
          setSyncStatus("synced");
        }

        const all = await newDB.getAll("customers");
        setCustomers(all);
        setScreen("home");
        setLoading(false);
      } else {
        setUser(null);
        setScreen("auth");
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    if (window.confirm("লগআউট করতে চান?")) {
      await signOut(auth);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white">
        <RefreshCw className="w-10 h-10 text-[#8c258d] animate-spin mb-4" />
        <h3 className="text-[#8c258d] font-bold text-lg">ডেটা সিঙ্ক হচ্ছে...</h3>
        <p className="text-gray-500 text-sm mt-1">দয়া করে অপেক্ষা করুন</p>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center h-screen w-full bg-gray-100 overflow-hidden font-sans">
      <div className="w-full max-w-[400px] h-full max-h-[100dvh] bg-white relative shadow-lg flex flex-col overflow-hidden">
        {screen === "auth" && <AuthScreen />}

        {screen === "home" && (
          <HomeScreen
            storeName={storeName}
            syncStatus={syncStatus}
            syncMsg={syncMsg}
            customers={customers}
            onOpenAdd={() => {
              setActiveCustomer(null);
              setScreen("add");
            }}
            onOpenTransaction={(id) => {
              const c = customers.find((c) => c.id === id);
              if (c) {
                setActiveCustomer(c);
                setScreen("transaction");
              }
            }}
            onOpenSettings={() => {
              if (window.confirm("লগআউট করতে চান?")) {
                handleLogout();
              }
            }}
            onSyncNow={() => syncEngine?.processQueue()}
          />
        )}

        {screen === "add" && (
          <AddCustomerScreen
            storeName={storeName}
            activeCustomer={activeCustomer}
            customers={customers}
            onBack={() => setScreen("home")}
            onSave={async (customer) => {
              await syncEngine?.mutate("SET", customer.id, customer);
              toast.success("সংরক্ষণ সফল!");
              setScreen("home");
            }}
          />
        )}

        {screen === "transaction" && activeCustomer && (
          <TransactionScreen
            customer={activeCustomer}
            onBack={() => setScreen("home")}
            onEdit={() => setScreen("add")}
            onDelete={async () => {
              await syncEngine?.mutate("DELETE", activeCustomer.id);
              toast.success("ডিলিট হয়েছে!");
              setScreen("home");
            }}
            onReport={() => setScreen("report")}
            onTagada={() => {
              setShareData({
                mode: "tagada",
                name: activeCustomer.name,
                phone: activeCustomer.phone,
                currBal: activeCustomer.amount,
                currType: activeCustomer.type,
              });
              setScreen("share");
            }}
            onSave={async (updatedCustomer, gave, got) => {
              await syncEngine?.mutate("SET", updatedCustomer.id, updatedCustomer);
              setShareData({
                mode: "transaction",
                name: updatedCustomer.name,
                phone: updatedCustomer.phone,
                prevBal: activeCustomer.amount,
                gave,
                got,
                currBal: updatedCustomer.amount,
                currType: updatedCustomer.type,
              });
              setScreen("share");
            }}
          />
        )}

        {screen === "share" && shareData && (
          <ShareScreen
            storeName={storeName}
            {...shareData}
            onClose={() => setScreen("home")}
          />
        )}

        {screen === "report" && activeCustomer && (
          <ReportScreen
            customer={activeCustomer}
            onBack={() => setScreen("transaction")}
            onUpdateCustomer={async (updatedCustomer) => {
              await syncEngine?.mutate("SET", updatedCustomer.id, updatedCustomer);
              setActiveCustomer(updatedCustomer);
              toast.success("আপডেট সফল হয়েছে!");
            }}
          />
        )}
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}

