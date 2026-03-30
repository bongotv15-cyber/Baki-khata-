import { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Store,
  Check,
  Settings,
  UserPlus,
  BookOpen,
  FileText,
  Calendar,
  Filter,
  Download,
  X,
  Home,
  Plus,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  LogOut,
  CloudOff,
  CloudCheck,
} from "lucide-react";
import { Customer } from "../types";
import { formatAmountBng } from "../lib/utils";
import { toast } from "sonner";
import { SyncManager } from "../lib/sync";

interface HomeScreenProps {
  storeName: string;
  syncStatus: string;
  syncMsg: string;
  customers: Customer[];
  syncEngine: SyncManager | null;
  onOpenAdd: () => void;
  onOpenTransaction: (id: string) => void;
  onOpenSettings: () => void;
  onSyncNow: () => void;
}

const bngDigits: Record<string, string> = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯",
};

const formatRelativeTimeBng = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const toBng = (n: number) => n.toString().replace(/[0-9]/g, (w) => bngDigits[w] || w);

  if (seconds < 60) return `${toBng(seconds)} সে আগে`;
  if (minutes < 60) return `${toBng(minutes)} মি আগে`;
  if (hours < 24) return `${toBng(hours)} ঘন্টা আগে`;
  return `${toBng(days)} দিন আগে`;
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/[\s/]+/);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const avatarColors = [
  "bg-red-100 text-red-800",
  "bg-green-100 text-green-800",
  "bg-yellow-100 text-yellow-800",
  "bg-blue-100 text-blue-800",
  "bg-teal-100 text-teal-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
];

const getAvatarColor = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % avatarColors.length;
  return avatarColors[index];
};

export default function HomeScreen({
  storeName,
  syncStatus,
  syncMsg,
  customers,
  syncEngine,
  onOpenAdd,
  onOpenTransaction,
  onOpenSettings,
  onSyncNow,
}: HomeScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "customer" | "supplier">("all");
  const [sort, setSort] = useState<"new" | "old" | "low" | "high">("new");
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);

  useEffect(() => {
    if (syncEngine) {
      syncEngine.appDB.getAll("sync_queue").then(setSyncQueue);
    }
  }, [syncStatus, syncEngine, showOfflineModal]);

  const [displayList, setDisplayList] = useState<Customer[]>([]);
  const [renderCount, setRenderCount] = useState(50);
  const observerTarget = useRef(null);

  const searchedCustomers = customers.filter((c) => {
    return c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));
  });
  const totalCount = searchedCustomers.length;
  const customerCount = searchedCustomers.filter(c => c.type === "customer").length;
  const supplierCount = searchedCustomers.filter(c => c.type === "supplier").length;

  const totalCustomerBalance = customers.reduce((acc, c) => {
    if (c.type === "customer") return acc + (c.amount || 0);
    return acc;
  }, 0);

  const totalSupplierBalance = customers.reduce((acc, c) => {
    if (c.type === "supplier") return acc + (c.amount || 0);
    return acc;
  }, 0);

  useEffect(() => {
    let list = customers.filter((c) => {
      const matchText =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search));
      const matchType = filter === "all" || filter === c.type;
      return matchText && matchType;
    });

    list.sort((a, b) => {
      if (sort === "new") return (b.updatedAt || 0) - (a.updatedAt || 0);
      if (sort === "old") return (a.updatedAt || 0) - (b.updatedAt || 0);
      if (sort === "high") return Math.abs(b.amount || 0) - Math.abs(a.amount || 0);
      if (sort === "low") return Math.abs(a.amount || 0) - Math.abs(b.amount || 0);
      return 0;
    });

    setDisplayList(list);
    setRenderCount(50);
  }, [customers, search, filter, sort]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderCount((prev) => prev + 50);
        }
      },
      { rootMargin: "100px" }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget]);

  const handleClearSearch = () => {
    setSearch("");
  };

  const handleDownloadPDF = async () => {
    toast.info("পিডিএফ তৈরি হচ্ছে, দয়া করে অপেক্ষা করুন...");
    
    // Create a hidden div to render the PDF content
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = "-9999px";
    div.style.top = "-9999px";
    div.style.width = "800px"; // Fixed width for consistent rendering
    div.style.backgroundColor = "white";
    div.style.padding = "40px";
    div.style.fontFamily = "sans-serif";
    
    let trs = "";
    const now = new Date();
    displayList.forEach((c) => {
      const isNegative = (c.amount || 0) < 0;
      const color = isNegative ? "color:#198754;" : (c.type === "supplier" ? "color:#e11b22;" : "color:#0F7A6B;");
      const lbl = isNegative ? "জমা" : (c.type === "supplier" ? "দিবো" : "বাকি");
      trs += `<tr>
        <td style="padding:12px; border:1px solid #ddd;">${c.name}</td>
        <td style="padding:12px; border:1px solid #ddd;">${c.phone || '-'}</td>
        <td style="padding:12px; border:1px solid #ddd; text-align:right; font-weight:bold; ${color}">${formatAmountBng(Math.abs(c.amount || 0))}</td>
        <td style="padding:12px; border:1px solid #ddd; text-align:center;">${lbl}</td>
      </tr>`;
    });

    div.innerHTML = `
      <h2 style="text-align:center; color:#0F7A6B; margin-bottom:5px; font-size: 28px;">${storeName || "নিজাম ষ্টোর"}</h2>
      <h4 style="text-align:center; margin-bottom:10px; color:#555; font-size: 20px;">ডিজিটাল হিসাব - সম্পূর্ণ তালিকা</h4>
      <p style="text-align:center; font-size:16px; margin-bottom:20px; color:#777;">তারিখ: ${formatAmountBng(now.getDate())}-${formatAmountBng(now.getMonth() + 1)}-${formatAmountBng(now.getFullYear())}</p>
      <table style="width:100%; border-collapse:collapse; font-size:18px;">
        <tr style="background-color:#f4f4f4;">
          <th style="padding:14px; text-align:left; border:1px solid #ddd;">নাম</th>
          <th style="padding:14px; text-align:left; border:1px solid #ddd;">নম্বর</th>
          <th style="padding:14px; text-align:right; border:1px solid #ddd;">পরিমাণ</th>
          <th style="padding:14px; text-align:center; border:1px solid #ddd;">ধরণ</th>
        </tr>
        ${trs}
      </table>
    `;
    
    document.body.appendChild(div);
    
    try {
      const canvas = await html2canvas(div, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`Digital_Hisab_${now.getTime()}.pdf`);
      toast.success("পিডিএফ ডাউনলোড সফল হয়েছে!");
    } catch (err) {
      console.error(err);
      toast.error("পিডিএফ তৈরি করতে সমস্যা হয়েছে!");
    } finally {
      document.body.removeChild(div);
    }
  };

  const getSyncStatusUI = () => {
    const hasPending = syncQueue.length > 0;
    
    return (
      <div
        className="relative cursor-pointer p-1.5 rounded-full hover:bg-black/10 transition-colors"
        onClick={() => setShowOfflineModal(true)}
        title="অফলাইন ডাটা"
      >
        {syncStatus === "syncing" ? (
          <RefreshCw className="w-6 h-6 animate-spin" />
        ) : hasPending ? (
          <CloudOff className="w-6 h-6" />
        ) : (
          <CloudCheck className="w-6 h-6" />
        )}
        
        {hasPending && (
          <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-[#0F7A6B]">
            {syncQueue.length}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-hidden relative select-none">
      <header className="bg-[#0F7A6B] text-white px-4 pt-5 pb-9 shrink-0 transition-all duration-300">
        <div className="flex items-center justify-between mb-0 transition-all duration-300">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 min-w-[48px] bg-gradient-to-br from-white to-teal-100 text-[#0F7A6B] rounded-full border-2 border-white/90 shadow-md flex justify-center items-center">
              <Store className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-extrabold tracking-wide drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5">
                {storeName || "নিজাম ষ্টোর"}
              </h3>
              <p className="text-[9px] font-semibold text-white tracking-widest mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                ডিজিটাল বাকির হিসাব
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center text-white text-xl">
            {getSyncStatusUI()}
            <Settings
              className="w-6 h-6 cursor-pointer"
              onClick={() => setShowSettingsModal(true)}
            />
          </div>
        </div>
      </header>

      <div
        className={`relative -mt-5 bg-white rounded-t-3xl px-4 pt-6 flex-1 flex flex-col overflow-hidden z-10 transition-all duration-300`}
      >
        <div className="shrink-0 transition-all duration-500 ease-in-out overflow-hidden max-h-[350px] opacity-100 mb-4">
          <div className="grid grid-cols-4 gap-x-1 gap-y-4 pb-4 mb-4 border-b border-gray-100">
            <div
              className="flex flex-col items-center text-gray-700 cursor-pointer active:scale-95 transition-transform"
              onClick={onOpenAdd}
            >
              <div className="text-[#0F7A6B] h-10 flex justify-center items-center mb-1">
                <UserPlus className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                নতুন
                <br />
                কাস্টমার
              </p>
            </div>
            <div
              className="flex flex-col items-center text-gray-700 cursor-pointer active:scale-95 transition-transform"
              onClick={() => document.getElementById("searchInput")?.focus()}
            >
              <div className="text-[#0F7A6B] h-10 flex justify-center items-center mb-1">
                <BookOpen className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                কাস্টমার
                <br />
                লিস্ট
              </p>
            </div>
            <div
              className="flex flex-col items-center text-gray-700 cursor-pointer active:scale-95 transition-transform"
              onClick={() => toast.info("লেনদেন যোগ অপশনটি শীঘ্রই আসছে!")}
            >
              <div className="text-[#0F7A6B] h-10 flex justify-center items-center mb-1">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                লেনদেন
                <br />
                যোগ
              </p>
            </div>
            <div
              className="flex flex-col items-center text-gray-700 cursor-pointer active:scale-95 transition-transform"
              onClick={() => toast.info("আজকের হিসাব অপশনটি শীঘ্রই আসছে!")}
            >
              <div className="text-[#0F7A6B] h-10 flex justify-center items-center mb-1">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                আজকের
                <br />
                হিসাব
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-4 mb-1 px-1 relative">
            <div className="absolute left-1/2 top-2 bottom-2 w-px bg-gray-200 -translate-x-1/2"></div>
            <div className="flex-1 min-w-0 text-center p-2 break-words">
              <div className="text-xl font-bold text-[#0F7A6B] mb-1">
                {formatAmountBng(Math.abs(totalCustomerBalance))}
              </div>
              <div className="text-[11px] text-gray-500 font-semibold">
                {totalCustomerBalance >= 0 ? "মোট পাবো" : "মোট দিবো"}
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center p-2 break-words">
              <div className="text-xl font-bold text-[#e11b22] mb-1">
                {formatAmountBng(Math.abs(totalSupplierBalance))}
              </div>
              <div className="text-[11px] text-gray-500 font-semibold">
                {totalSupplierBalance >= 0 ? "মোট দিবো" : "মোট পাবো"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center gap-2.5 mb-2 shrink-0 overflow-hidden">
          <div className="flex-1 flex items-center min-w-0 relative">
            <input
              id="searchInput"
              type="text"
              placeholder="নাম বা নম্বর দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none transition-colors focus:border-[#0F7A6B] focus:bg-white bg-gray-50"
            />
          </div>
          <div className="flex gap-2.5 transition-all duration-500 ease-in-out items-center max-w-[120px] opacity-100">
            <button
              onClick={() => setShowFilterModal(true)}
              className="bg-gray-100 w-10 h-10 rounded-xl flex justify-center items-center text-[#0F7A6B] cursor-pointer transition-colors border border-gray-200 shrink-0"
              title="ফিল্টার ও সর্ট"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-gray-100 w-10 h-10 rounded-xl flex justify-center items-center text-[#0F7A6B] cursor-pointer transition-colors border border-gray-200 shrink-0"
              title="পিডিএফ ডাউনলোড"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          {search && (
            <div className="transition-all duration-500 ease-in-out flex max-w-[40px] opacity-100">
              <button
                onClick={handleClearSearch}
                className="flex text-gray-600 cursor-pointer w-10 h-10 items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4 px-1 shrink-0 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="text-[10px] font-bold text-gray-800 whitespace-nowrap flex items-center gap-1.5">
            কাস্টমার: {formatAmountBng(customerCount).split(".")[0]}
          </div>
          <div className="text-[10px] font-bold text-gray-800 whitespace-nowrap flex items-center gap-1.5">
            সাপ্লায়ার: {formatAmountBng(supplierCount).split(".")[0]}
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto -mx-4 px-4 pb-5" 
          id="customerList"
        >
          <div className="flex flex-col">
            {displayList.slice(0, renderCount).map((c) => {
              const daysAgo = Math.floor((Date.now() - c.updatedAt) / (1000 * 60 * 60 * 24));
              const isZero = !c.amount || c.amount === 0;
              
              return (
                <div
                  key={c.id}
                  className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0 cursor-pointer transition-colors active:bg-gray-50"
                  onClick={() => onOpenTransaction(c.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-12 h-12 min-w-[48px] rounded-full flex justify-center items-center font-medium text-lg ${getAvatarColor(c.id)}`}>
                      {getInitials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[15px] font-medium text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                        {c.name}
                      </h4>
                      <p className="text-[12px] text-gray-500 mt-0.5 flex items-center gap-1.5 font-normal">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c.type === "customer" ? "bg-gray-100 text-black" : "bg-gray-100 text-black"}`}>
                          {c.type === "customer" ? "কাস্টমার" : "সাপ্লায়ার"}
                        </span>
                        <span>•</span>
                        <span>{formatRelativeTimeBng(c.updatedAt || 0)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3 whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <div
                        className={`text-[18px] font-extrabold ${
                          isZero 
                            ? "text-gray-800" 
                            : c.type === "customer"
                              ? ((c.amount || 0) >= 0 ? "text-[#0F7A6B]" : "text-[#e11b22]")
                              : ((c.amount || 0) >= 0 ? "text-[#e11b22]" : "text-[#0F7A6B]")
                        }`}
                      >
                        {formatAmountBng(Math.abs(c.amount || 0))}
                      </div>
                      {!isZero && (
                        <div className="text-[11px] text-gray-500 font-bold">
                          {c.type === "customer"
                            ? ((c.amount || 0) >= 0 ? "পাবো" : "দিবো")
                            : ((c.amount || 0) >= 0 ? "দিবো" : "পাবো")}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
                  </div>
                </div>
              );
            })}
          </div>
          <div ref={observerTarget} className="h-5 w-full"></div>
        </div>
      </div>

      <div className="bg-white justify-around py-3 border-t border-gray-200 items-center relative z-[100] shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] rounded-t-2xl flex">
        <div
          className="flex flex-col items-center text-xs text-[#0F7A6B] cursor-pointer gap-1 px-4 py-1 rounded-xl hover:bg-teal-50 transition-colors"
          onClick={() => {
            const list = document.getElementById("customerList");
            if (list) list.scrollTop = 0;
          }}
        >
          <Home className="w-6 h-6" />
          <span className="font-bold">হোম</span>
        </div>
        <div
          className="bg-[#0F7A6B] w-14 h-14 min-w-[56px] rounded-full flex justify-center items-center text-white border-[4px] border-[#f9f9f9] -mt-8 shadow-lg cursor-pointer transition-transform active:scale-95 hover:bg-[#0C695C]"
          title="নতুন যোগ করুন"
          onClick={onOpenAdd}
        >
          <Plus className="w-7 h-7" />
        </div>
        <div
          className="flex flex-col items-center text-xs text-gray-400 cursor-pointer gap-1 px-4 py-1 rounded-xl hover:bg-gray-100 transition-colors"
          onClick={() => setShowSettingsModal(true)}
        >
          <Settings className="w-6 h-6" />
          <span className="font-medium">সেটিংস</span>
        </div>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div
          className="absolute inset-0 bg-black/50 z-[1000] flex flex-col justify-end"
          onClick={() => setShowFilterModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl p-5 pb-8 w-full animate-in slide-in-from-bottom-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-gray-100">
              <h3 className="text-lg font-bold">তালিকা ফিল্টার করুন</h3>
              <div className="flex items-center gap-3">
                <div
                  className="cursor-pointer text-[#0F7A6B] font-semibold text-sm flex items-center gap-1"
                  onClick={() => {
                    setFilter("all");
                    setSort("new");
                    setShowFilterModal(false);
                    toast.info("ফিল্টার ক্লিয়ার করা হয়েছে");
                  }}
                >
                  <X className="w-4 h-4" /> ক্লিয়ার
                </div>
                <button onClick={() => setShowFilterModal(false)}>
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="font-bold mb-2 text-sm">ধরণ (Type):</div>
            <div className="mb-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value="all"
                  checked={filter === "all"}
                  onChange={() => setFilter("all")}
                  className="accent-[#0F7A6B]"
                />{" "}
                ডিফল্ট
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value="customer"
                  checked={filter === "customer"}
                  onChange={() => setFilter("customer")}
                  className="accent-[#0F7A6B]"
                />{" "}
                কাস্টমার
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value="supplier"
                  checked={filter === "supplier"}
                  onChange={() => setFilter("supplier")}
                  className="accent-[#0F7A6B]"
                />{" "}
                সাপ্লায়ার
              </label>
            </div>
            <div className="font-bold mb-2 text-sm">
              সর্ট (Sort):
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="low"
                  checked={sort === "low"}
                  onChange={() => setSort("low")}
                  className="accent-[#0F7A6B]"
                />{" "}
                কম বাকি
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="high"
                  checked={sort === "high"}
                  onChange={() => setSort("high")}
                  className="accent-[#0F7A6B]"
                />{" "}
                বেশি বাকি
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="old"
                  checked={sort === "old"}
                  onChange={() => setSort("old")}
                  className="accent-[#0F7A6B]"
                />{" "}
                পুরাতন বাকি
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="new"
                  checked={sort === "new"}
                  onChange={() => setSort("new")}
                  className="accent-[#0F7A6B]"
                />{" "}
                নতুন বাকি
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="absolute inset-0 bg-black/50 z-[1000] flex flex-col justify-end"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl p-5 pb-8 w-full animate-in slide-in-from-bottom-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-2.5 border-b border-gray-100">
              <h3 className="text-lg font-bold">সেটিংস</h3>
              <button onClick={() => setShowSettingsModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                className="w-full text-left px-4 py-3.5 text-base text-[#e11b22] font-bold flex items-center gap-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors border border-red-100"
                onClick={() => {
                  setShowSettingsModal(false);
                  onOpenSettings();
                }}
              >
                <LogOut className="w-5 h-5" /> লগ আউট (Log Out)
              </button>
            </div>

            <div className="mt-8 text-center text-gray-400 text-xs font-medium space-y-1">
              <p>ভার্সন ১.২ (Version 1.2)</p>
              <p>ডেভলপার: Mohammad Nijam</p>
            </div>
          </div>
        </div>
      )}
      {/* Offline Data Modal */}
      {showOfflineModal && (
        <div
          className="absolute inset-0 bg-black/50 z-[1000] flex flex-col justify-end"
          onClick={() => setShowOfflineModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl p-5 pb-8 w-full max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CloudOff className="w-5 h-5 text-gray-600" /> অফলাইন ডাটা
              </h3>
              <button onClick={() => setShowOfflineModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-4">
              {syncQueue.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <Check className="w-12 h-12 mx-auto text-green-500 mb-2 opacity-50" />
                  <p>সকল ডাটা সার্ভারে সেভ করা আছে।</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-2">
                    নিচের ডাটাগুলো এখনো সার্ভারে আপলোড হয়নি। ইন্টারনেট সংযোগ পেলে স্বয়ংক্রিয়ভাবে আপলোড হবে।
                  </p>
                  {syncQueue.map((item, idx) => (
                    <div key={item.queueId || idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-gray-800">
                          {item.payload?.name || "অজানা নাম"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          item.action === "DELETE" ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"
                        }`}>
                          {item.action === "DELETE" ? "ডিলিট" : "আপডেট"}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{item.payload?.type === "supplier" ? "সাপ্লায়ার" : "কাস্টমার"}</span>
                        {item.payload?.amount !== undefined && (
                          <span className="font-semibold text-gray-700">৳ {formatAmountBng(Math.abs(item.payload.amount))}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 pt-2">
              <button
                className="w-full bg-[#0F7A6B] text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                onClick={() => {
                  onSyncNow();
                  if (syncQueue.length === 0) setShowOfflineModal(false);
                }}
                disabled={syncStatus === "syncing" || syncQueue.length === 0}
              >
                {syncStatus === "syncing" ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> সিঙ্ক হচ্ছে...</>
                ) : (
                  <><CloudCheck className="w-5 h-5" /> এখনই সিঙ্ক করুন</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
