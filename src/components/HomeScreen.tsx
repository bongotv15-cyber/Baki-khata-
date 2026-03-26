import { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Customer } from "../types";
import { formatAmountBng } from "../lib/utils";
import { toast } from "sonner";

interface HomeScreenProps {
  storeName: string;
  syncStatus: string;
  syncMsg: string;
  customers: Customer[];
  onOpenAdd: () => void;
  onOpenTransaction: (id: string) => void;
  onOpenSettings: () => void;
  onSyncNow: () => void;
}

export default function HomeScreen({
  storeName,
  syncStatus,
  syncMsg,
  customers,
  onOpenAdd,
  onOpenTransaction,
  onOpenSettings,
  onSyncNow,
}: HomeScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "customer" | "supplier">("all");
  const [sort, setSort] = useState<"new" | "old" | "low" | "high">("new");
  const [hideUI, setHideUI] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [displayList, setDisplayList] = useState<Customer[]>([]);
  const [renderCount, setRenderCount] = useState(50);
  const observerTarget = useRef(null);

  const totalDue = customers
    .filter((c) => c.type === "customer")
    .reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalGive = customers
    .filter((c) => c.type === "supplier")
    .reduce((acc, c) => acc + (c.amount || 0), 0);

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
      if (sort === "high") return (b.amount || 0) - (a.amount || 0);
      if (sort === "low") return (a.amount || 0) - (b.amount || 0);
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
    setHideUI(false);
  };

  const handleDownloadPDF = () => {
    toast.info("পিডিএফ তৈরি হচ্ছে...");
    let trs = "";
    const now = new Date();
    displayList.forEach((c) => {
      const color = c.type === "supplier" ? "color:#e11b22;" : "color:#8c258d;";
      const lbl = c.type === "supplier" ? "দিবো" : "বাকি";
      trs += `<tr><td style="padding:10px; border:1px solid #ddd;">${
        c.name
      }</td><td style="padding:10px; border:1px solid #ddd;">${
        c.phone
      }</td><td style="padding:10px; border:1px solid #ddd; text-align:right; font-weight:bold; ${color}">${formatAmountBng(
        c.amount || 0
      )}</td><td style="padding:10px; border:1px solid #ddd; text-align:center;">${lbl}</td></tr>`;
    });

    const printContent = `<div style="padding:20px; font-family:sans-serif; color:#333; width:100%;">
      <h2 style="text-align:center; color:#8c258d; margin-bottom:5px;">${storeName}</h2>
      <h4 style="text-align:center; margin-bottom:10px; color:#555;">ডিজিটাল বাকীর খাতা - সম্পূর্ণ তালিকা</h4>
      <p style="text-align:center; font-size:12px; margin-bottom:20px; color:#777;">তারিখ: ${formatAmountBng(
        now.getDate()
      )}-${formatAmountBng(now.getMonth() + 1)}-${formatAmountBng(
      now.getFullYear()
    )}</p>
      <table style="width:100%; border-collapse:collapse; font-size:14px;">
        <tr style="background-color:#f4f4f4;">
          <th style="padding:12px; text-align:left; border:1px solid #ddd;">নাম</th>
          <th style="padding:12px; text-align:left; border:1px solid #ddd;">নম্বর</th>
          <th style="padding:12px; text-align:right; border:1px solid #ddd;">পরিমাণ</th>
          <th style="padding:12px; text-align:center; border:1px solid #ddd;">ধরণ</th>
        </tr>
        ${trs}
      </table>
    </div>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    }
  };

  const getSyncStatusUI = () => {
    if (syncStatus === "syncing") {
      return (
        <div
          className="text-xs bg-orange-400/40 text-white px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all"
          onClick={onSyncNow}
        >
          <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
        </div>
      );
    } else if (syncStatus === "offline") {
      return (
        <div className="text-xs bg-gray-500/80 text-white px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all">
          <AlertTriangle className="w-3 h-3" /> Offline
        </div>
      );
    } else if (syncStatus === "manual_retry" || syncStatus === "error") {
      return (
        <div
          className="text-xs bg-red-600/80 text-white px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all"
          onClick={onOpenSettings}
        >
          <AlertTriangle className="w-3 h-3" /> {syncStatus === "error" ? "Failed" : `Retry (${syncMsg})`}
        </div>
      );
    }
    return (
      <div
        className="text-xs bg-black/20 text-white px-2 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all"
        onClick={onSyncNow}
      >
        <Check className="w-3 h-3" /> Synced
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-100 overflow-hidden relative">
      <header
        className={`bg-[#8c258d] text-white px-4 pt-5 pb-9 shrink-0 transition-all duration-300 ${
          hideUI ? "pb-9" : ""
        }`}
      >
        <div className="flex items-center justify-between mb-0 transition-all duration-300">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 min-w-[48px] bg-gradient-to-br from-white to-purple-100 text-[#8c258d] rounded-full border-2 border-white/90 shadow-md flex justify-center items-center">
              <Store className="w-6 h-6 drop-shadow-sm" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-extrabold tracking-wide drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-1.5">
                {storeName || "নিজাম ষ্টোর"}
              </h3>
              <p className="text-[11px] font-medium text-purple-200 uppercase tracking-wider mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                ডিজিটাল বাকীর খাতা
              </p>
            </div>
          </div>
          <div className="flex gap-3 items-center text-white text-xl">
            {getSyncStatusUI()}
            <Settings
              className="w-6 h-6 cursor-pointer"
              onClick={onOpenSettings}
            />
          </div>
        </div>
      </header>

      <div
        className={`relative -mt-5 bg-white rounded-t-3xl px-4 pt-6 flex-1 flex flex-col overflow-hidden z-10 transition-all duration-300`}
      >
        <div
          className={`shrink-0 transition-all duration-500 ease-in-out overflow-hidden ${
            hideUI ? "max-h-0 opacity-0 mb-0" : "max-h-[350px] opacity-100 mb-4"
          }`}
        >
          <div className="grid grid-cols-4 gap-x-1 gap-y-4 pb-4 mb-4 border-b border-gray-100">
            <div
              className="flex flex-col items-center text-gray-700 cursor-pointer active:scale-95 transition-transform"
              onClick={onOpenAdd}
            >
              <div className="text-[#8c258d] h-10 flex justify-center items-center mb-1">
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
              <div className="text-[#8c258d] h-10 flex justify-center items-center mb-1">
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
              <div className="text-[#8c258d] h-10 flex justify-center items-center mb-1">
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
              <div className="text-[#8c258d] h-10 flex justify-center items-center mb-1">
                <Calendar className="w-8 h-8" />
              </div>
              <p className="text-[11px] font-semibold text-center leading-tight whitespace-nowrap">
                আজকের
                <br />
                হিসাব
              </p>
            </div>
          </div>

          <div className="flex justify-between gap-4 mb-5 px-1 relative">
            <div className="absolute left-1/2 top-2 bottom-2 w-px bg-gray-200 -translate-x-1/2"></div>
            <div className="flex-1 min-w-0 text-center p-2 break-words">
              <div className="text-xl font-bold text-[#8c258d] mb-1">
                ৳ {formatAmountBng(totalDue)}
              </div>
              <div className="text-[11px] text-gray-500 font-semibold">
                মোট বাকি পাবো
              </div>
            </div>
            <div className="flex-1 min-w-0 text-center p-2 break-words">
              <div className="text-xl font-bold text-[#e11b22] mb-1">
                ৳ {formatAmountBng(totalGive)}
              </div>
              <div className="text-[11px] text-gray-500 font-semibold">
                মোট দিবো
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
              onFocus={() => setHideUI(true)}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl text-sm outline-none transition-colors focus:border-[#8c258d] focus:bg-white bg-gray-50"
            />
          </div>
          <div
            className={`flex gap-2.5 transition-all duration-500 ease-in-out items-center ${
              hideUI ? "max-w-0 opacity-0 overflow-hidden" : "max-w-[120px] opacity-100"
            }`}
          >
            <button
              onClick={() => setShowFilterModal(true)}
              className="bg-gray-100 w-10 h-10 rounded-xl flex justify-center items-center text-[#8c258d] cursor-pointer transition-colors border border-gray-200 shrink-0"
              title="ফিল্টার ও সর্ট"
            >
              <Filter className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="bg-gray-100 w-10 h-10 rounded-xl flex justify-center items-center text-[#8c258d] cursor-pointer transition-colors border border-gray-200 shrink-0"
              title="পিডিএফ ডাউনলোড"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
          <div
            className={`transition-all duration-500 ease-in-out flex ${
              hideUI ? "max-w-[40px] opacity-100" : "max-w-0 opacity-0 overflow-hidden"
            }`}
          >
            <button
              onClick={handleClearSearch}
              className="flex text-gray-600 cursor-pointer w-10 h-10 items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 mb-4 pl-0.5 font-semibold shrink-0">
          দেখাচ্ছে: {formatAmountBng(displayList.length).split(".")[0]} জন
        </div>

        <div className="flex-1 overflow-y-auto -mx-4 px-4 pb-5" id="customerList">
          <div className="flex flex-col">
            {displayList.slice(0, renderCount).map((c) => (
              <div
                key={c.id}
                className="flex justify-between items-center py-3 cursor-pointer transition-transform active:scale-95"
                onClick={() => onOpenTransaction(c.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 min-w-10 bg-gray-100 text-[#8c258d] rounded-full flex justify-center items-center font-bold text-base uppercase">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[15px] text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                      {c.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">{c.phone}</p>
                  </div>
                </div>
                <div className="text-right ml-2.5 whitespace-nowrap">
                  <div
                    className={`text-[15px] font-bold ${
                      c.type === "supplier" ? "text-[#e11b22]" : "text-[#8c258d]"
                    }`}
                  >
                    ৳ {formatAmountBng(c.amount || 0)}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    {c.type === "supplier" ? "দিবো" : "বাকি"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div ref={observerTarget} className="h-5 w-full"></div>
        </div>
      </div>

      <div className="bg-white flex justify-around py-2.5 border-t border-gray-100 items-center relative z-[100] shrink-0">
        <div
          className="flex flex-col items-center text-xs text-[#8c258d] cursor-pointer gap-1"
          onClick={() => {
            const list = document.getElementById("customerList");
            if (list) list.scrollTop = 0;
          }}
        >
          <Home className="w-[18px] h-[18px]" />
          Home
        </div>
        <div
          className="bg-[#8c258d] w-[60px] h-[60px] min-w-[60px] rounded-full flex justify-center items-center text-white border-[5px] border-white -mt-9 shadow-md cursor-pointer transition-transform active:scale-95"
          title="নতুন যোগ করুন"
          onClick={onOpenAdd}
        >
          <Plus className="w-6 h-6" />
        </div>
        <div
          className="flex flex-col items-center text-xs text-[#8c258d] cursor-pointer gap-1"
          onClick={onOpenSettings}
        >
          <Settings className="w-[18px] h-[18px]" />
          Settings
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
                  className="cursor-pointer text-[#8c258d] font-semibold text-sm flex items-center gap-1"
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
            <div className="font-bold mb-2 text-sm">ধরণ অনুযায়ী:</div>
            <div className="mb-4 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value="all"
                  checked={filter === "all"}
                  onChange={() => setFilter("all")}
                  className="accent-[#8c258d]"
                />{" "}
                সব
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value="customer"
                  checked={filter === "customer"}
                  onChange={() => setFilter("customer")}
                  className="accent-[#8c258d]"
                />{" "}
                কাস্টমার (বাকি পাবো)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="filter"
                  value="supplier"
                  checked={filter === "supplier"}
                  onChange={() => setFilter("supplier")}
                  className="accent-[#8c258d]"
                />{" "}
                সাপ্লায়ার (বাকি দিবো)
              </label>
            </div>
            <div className="font-bold mb-2 text-sm">
              বাকির পরিমাণ ও সময় অনুযায়ী:
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="new"
                  checked={sort === "new"}
                  onChange={() => setSort("new")}
                  className="accent-[#8c258d]"
                />{" "}
                নতুন লেনদেন আগে
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="old"
                  checked={sort === "old"}
                  onChange={() => setSort("old")}
                  className="accent-[#8c258d]"
                />{" "}
                পুরাতন লেনদেন আগে
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="low"
                  checked={sort === "low"}
                  onChange={() => setSort("low")}
                  className="accent-[#8c258d]"
                />{" "}
                কম বাকি আগে
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  value="high"
                  checked={sort === "high"}
                  onChange={() => setSort("high")}
                  className="accent-[#8c258d]"
                />{" "}
                বেশি বাকি আগে
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
