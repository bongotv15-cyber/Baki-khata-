import { useState, useEffect } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Bell,
  FileText,
  Edit,
  Trash2,
  MessageSquare,
  Camera,
  AlertTriangle,
} from "lucide-react";
import { Customer, Transaction } from "../types";
import { formatAmountBng, formatDateBng, formatTimeBng, generateUUID } from "../lib/utils";
import { toast } from "sonner";

interface TransactionScreenProps {
  customer: Customer;
  onBack: () => void;
  onSave: (customer: Customer, gave: number, got: number) => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onTagada: () => void;
}

export default function TransactionScreen({
  customer,
  onBack,
  onSave,
  onEdit,
  onDelete,
  onReport,
  onTagada,
}: TransactionScreenProps) {
  const [gave, setGave] = useState("");
  const [got, setGot] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setGave("");
    setGot("");
    setDesc("");
    setDate(new Date().toISOString().split("T")[0]);
    setShowMenu(false);
  }, [customer]);

  const handleSubmit = () => {
    const gaveNum = parseFloat(gave) || 0;
    const gotNum = parseFloat(got) || 0;

    if (gaveNum === 0 && gotNum === 0) {
      toast.error("পরিমাণ লিখুন");
      return;
    }

    const prevBal = customer.amount || 0;
    let netBalance =
      customer.type === "customer"
        ? prevBal + gaveNum - gotNum
        : prevBal + gotNum - gaveNum;

    const newTransaction: Transaction = {
      id: generateUUID(),
      desc: desc.trim() || "লেনদেন",
      date: formatDateBng(date),
      time: formatTimeBng(new Date()),
      gave: gaveNum,
      got: gotNum,
      balance: netBalance,
      type: customer.type,
    };

    const updatedTransactions = [newTransaction, ...(customer.transactions || [])];
    if (updatedTransactions.length > 50) updatedTransactions.pop();

    const updatedCustomer: Customer = {
      ...customer,
      amount: netBalance,
      type: customer.type,
      updatedAt: Date.now(),
      transactions: updatedTransactions,
    };

    onSave(updatedCustomer, gaveNum, gotNum);
  };

  return (
    <div
      className="flex flex-col h-full w-full bg-[#f9f9f9] relative"
      onClick={() => setShowMenu(false)}
    >
      <div className="flex items-center justify-between px-4 py-5 font-semibold bg-[#0F7A6B] text-white shadow-sm shrink-0">
        <div className="flex items-center">
          <span className="text-2xl mr-4 cursor-pointer flex items-center" onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </span>
          <div className="ml-2.5 flex flex-col">
            <span className="text-lg leading-tight">{customer.name}</span>
            <span className="text-[13px] font-normal leading-tight opacity-90">
              {customer.phone}
            </span>
          </div>
        </div>
        <div
          className="cursor-pointer px-2.5 py-1 text-xl flex items-center relative"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <MoreVertical className="w-6 h-6" />
          {showMenu && (
            <div className="absolute top-12 right-0 bg-white rounded-xl shadow-lg w-[200px] z-50 border border-gray-100 flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
              <div
                className="px-4 py-3.5 text-sm text-gray-800 cursor-pointer flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50"
                onClick={onTagada}
              >
                <Bell className="w-4 h-4" /> তাগাদা
              </div>
              <div
                className="px-4 py-3.5 text-sm text-gray-800 cursor-pointer flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50"
                onClick={onReport}
              >
                <FileText className="w-4 h-4" /> লেনদেন রিপোর্ট
              </div>
              <div
                className="px-4 py-3.5 text-sm text-gray-800 cursor-pointer flex items-center gap-3 border-b border-gray-50 hover:bg-gray-50"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" /> কাস্টমার এডিট
              </div>
              <div
                className="px-4 py-3.5 text-sm text-[#e11b22] cursor-pointer flex items-center gap-3 hover:bg-red-50 rounded-b-xl"
                onClick={() => setShowDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4" /> কাস্টমার ডিলিট
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto">
        <div className="text-center mb-6 text-base text-gray-600 font-semibold">
          <span>
            {customer.type === "customer"
              ? (customer.amount || 0) >= 0 ? "পাবো / বাকি:" : "জমা / এডভান্স:"
              : (customer.amount || 0) >= 0 ? "দিবো / ডিউ:" : "জমা / এডভান্স:"}
          </span>
          <span
            className={`text-[26px] font-bold ml-1.5 ${
              customer.type === "customer"
                ? (customer.amount || 0) >= 0 ? "text-[#0F7A6B]" : "text-[#198754]"
                : (customer.amount || 0) >= 0 ? "text-[#e11b22]" : "text-[#0F7A6B]"
            }`}
          >
            ৳ {formatAmountBng(Math.abs(customer.amount || 0))}
          </span>
        </div>

        <div className="flex gap-2.5 mb-4">
          <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center focus-within:border-[#0F7A6B] transition-colors">
            <span className="text-base text-gray-600 mr-2 font-bold">৳</span>
            <input
              type="number"
              placeholder={customer.type === "customer" ? "দিলাম/বেচা" : "দিলাম/পেমেন্ট"}
              value={gave}
              onChange={(e) => setGave(e.target.value)}
              className="border-none outline-none text-lg w-full font-semibold text-gray-800 bg-transparent"
            />
          </div>
          <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center focus-within:border-[#0F7A6B] transition-colors">
            <span className="text-base text-gray-600 mr-2 font-bold">৳</span>
            <input
              type="number"
              placeholder={customer.type === "customer" ? "পেলাম/জমা" : "পেলাম/কেনা"}
              value={got}
              onChange={(e) => setGot(e.target.value)}
              className="border-none outline-none text-lg w-full font-semibold text-gray-800 bg-transparent"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200 focus-within:border-[#0F7A6B] transition-colors">
          <input
            type="text"
            placeholder="বিবরণ লিখুন (ঐচ্ছিক)"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="border-none outline-none text-[15px] w-full bg-transparent"
          />
        </div>

        <div className="flex gap-2.5 mb-5">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 px-4 py-2.5 border-none rounded-full bg-gray-200 outline-none text-gray-700 text-sm"
          />
          <button
            className="flex-1 border-none p-2.5 rounded-full bg-gray-200 text-sm cursor-pointer text-gray-700 flex items-center justify-center gap-1.5 active:bg-gray-300 transition-colors"
            onClick={() => toast.info("মেসেজ অপশনটি শীঘ্রই আসছে!")}
          >
            <MessageSquare className="w-4 h-4" /> মেসেজ
          </button>
          <button
            className="flex-1 border-none p-2.5 rounded-full bg-gray-200 text-sm cursor-pointer text-gray-700 flex items-center justify-center gap-1.5 active:bg-gray-300 transition-colors"
            onClick={() => toast.info("ছবি আপলোড অপশনটি শীঘ্রই আসছে!")}
          >
            <Camera className="w-4 h-4" /> ছবি
          </button>
        </div>
      </div>

      <button
        className="w-full bg-[#0F7A6B] text-white border-none p-4 text-lg font-bold cursor-pointer active:bg-[#0A5C50] transition-colors shrink-0"
        onClick={handleSubmit}
      >
        নিশ্চিত করুন
      </button>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="absolute inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] text-center shadow-xl animate-in zoom-in-95 duration-200">
            <div className="text-[40px] text-[#e11b22] mb-4 flex justify-center">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold">সতর্কতা</h3>
            <p className="text-sm mt-2.5 text-gray-600">
              আপনি কি নিশ্চিত যে এই কাস্টমারকে ডিলিট করতে চান? ডিলিট করলে এর সকল
              লেনদেনের তথ্য মুছে যাবে।
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                className="flex-1 p-3 rounded-xl border border-gray-300 bg-white text-gray-800 font-bold text-[15px] cursor-pointer"
                onClick={() => setShowDeleteModal(false)}
              >
                না (No)
              </button>
              <button
                className="flex-1 p-3 rounded-xl border-none bg-[#e11b22] text-white font-bold text-[15px] cursor-pointer"
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete();
                }}
              >
                হ্যাঁ (Yes)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
