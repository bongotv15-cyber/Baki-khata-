import { useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ArrowLeft, Bell, Edit, Trash2, AlertTriangle, X, Download } from "lucide-react";
import { Customer, Transaction } from "../types";
import { formatAmountBng, formatDateBng, formatTimeBng } from "../lib/utils";
import { toast } from "sonner";

interface ReportScreenProps {
  customer: Customer;
  onBack: () => void;
  onUpdateCustomer: (customer: Customer) => void;
}

export default function ReportScreen({
  customer,
  onBack,
  onUpdateCustomer,
}: ReportScreenProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Edit form state
  const [editGave, setEditGave] = useState("");
  const [editGot, setEditGot] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDate, setEditDate] = useState("");

  const tGave = (customer.transactions || []).reduce((acc, r) => acc + r.gave, 0);
  const tGot = (customer.transactions || []).reduce((acc, r) => acc + r.got, 0);

  const recalculateBalances = (transactions: Transaction[]): Customer => {
    // Sort oldest first
    const sorted = [...transactions].reverse();
    let currentAmount = 0;
    let currentType: "customer" | "supplier" = "customer";

    const updatedTxs = sorted.map((tx) => {
      let netBalance =
        currentType === "customer"
          ? currentAmount + tx.gave - tx.got
          : currentAmount + tx.got - tx.gave;

      let newType = currentType;
      if (netBalance < 0) {
        newType = currentType === "customer" ? "supplier" : "customer";
        netBalance = Math.abs(netBalance);
      }

      currentAmount = netBalance;
      currentType = newType;

      return {
        ...tx,
        balance: currentAmount,
        type: currentType,
      };
    });

    // Reverse back to newest first
    updatedTxs.reverse();

    return {
      ...customer,
      amount: currentAmount,
      type: currentType,
      transactions: updatedTxs,
      updatedAt: Date.now(),
    };
  };

  const handleTxClick = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowActionModal(true);
  };

  const handleDelete = () => {
    if (!selectedTx) return;
    const newTxs = (customer.transactions || []).filter((t) => t.id !== selectedTx.id);
    const updatedCustomer = recalculateBalances(newTxs);
    onUpdateCustomer(updatedCustomer);
    setShowDeleteModal(false);
    setSelectedTx(null);
  };

  const handleEditSave = () => {
    if (!selectedTx) return;
    const gaveNum = parseFloat(editGave) || 0;
    const gotNum = parseFloat(editGot) || 0;

    if (gaveNum === 0 && gotNum === 0) {
      toast.error("পরিমাণ লিখুন");
      return;
    }

    const newTxs = (customer.transactions || []).map((t) => {
      if (t.id === selectedTx.id) {
        return {
          ...t,
          gave: gaveNum,
          got: gotNum,
          desc: editDesc.trim() || "লেনদেন",
          date: editDate ? formatDateBng(editDate) : t.date,
        };
      }
      return t;
    });

    const updatedCustomer = recalculateBalances(newTxs);
    onUpdateCustomer(updatedCustomer);
    setShowEditModal(false);
    setSelectedTx(null);
  };

  const handleDownloadPDF = async () => {
    toast.info("পিডিএফ তৈরি হচ্ছে, দয়া করে অপেক্ষা করুন...");
    
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = "-9999px";
    div.style.top = "-9999px";
    div.style.width = "800px";
    div.style.backgroundColor = "white";
    div.style.padding = "40px";
    div.style.fontFamily = "sans-serif";
    
    let trs = "";
    (customer.transactions || []).forEach((r) => {
      const typeLabel = r.type === "customer" ? "পাবো " : "দিবো ";
      const typeColor = r.type === "customer" ? "color:#e11b22;" : "color:#198754;";
      trs += `<tr>
        <td style="padding:12px; border:1px solid #ddd;">
          <div style="font-size:14px; color:#555;">${r.desc}</div>
          <div style="font-weight:bold; font-size:14px;">${r.date}</div>
          <div style="font-size:12px; color:#888;">${r.time}</div>
          <div style="font-size:12px; margin-top:4px; font-weight:bold; ${typeColor}">${typeLabel}${formatAmountBng(r.balance)}</div>
        </td>
        <td style="padding:12px; border:1px solid #ddd; text-align:center; color:#e11b22; font-weight:bold;">${r.gave > 0 ? formatAmountBng(r.gave) : ""}</td>
        <td style="padding:12px; border:1px solid #ddd; text-align:center; color:#198754; font-weight:bold;">${r.got > 0 ? formatAmountBng(r.got) : ""}</td>
      </tr>`;
    });

    const now = new Date();
    div.innerHTML = `
      <h2 style="text-align:center; color:#8c258d; margin-bottom:5px; font-size: 28px;">লেনদেন রিপোর্ট</h2>
      <h4 style="text-align:center; margin-bottom:10px; color:#333; font-size: 20px;">কাস্টমার: ${customer.name}</h4>
      <p style="text-align:center; font-size:16px; margin-bottom:20px; color:#777;">মোবাইল: ${customer.phone || '-'} | তারিখ: ${formatAmountBng(now.getDate())}-${formatAmountBng(now.getMonth() + 1)}-${formatAmountBng(now.getFullYear())}</p>
      <table style="width:100%; border-collapse:collapse; font-size:16px;">
        <tr style="background-color:#f4f4f4;">
          <th style="padding:14px; text-align:left; border:1px solid #ddd; width:45%;">লেনদেনের বিবরণ</th>
          <th style="padding:14px; text-align:center; border:1px solid #ddd; width:27.5%;">দিলাম</th>
          <th style="padding:14px; text-align:center; border:1px solid #ddd; width:27.5%;">পেলাম</th>
        </tr>
        ${trs}
        <tr style="background-color:#f9f9f9; font-weight:bold;">
          <td style="padding:14px; text-align:right; border:1px solid #ddd;">মোট:</td>
          <td style="padding:14px; text-align:center; border:1px solid #ddd; color:#e11b22;">${formatAmountBng(tGave)}</td>
          <td style="padding:14px; text-align:center; border:1px solid #ddd; color:#198754;">${formatAmountBng(tGot)}</td>
        </tr>
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
      
      pdf.save(`Report_${customer.name}_${now.getTime()}.pdf`);
      toast.success("পিডিএফ ডাউনলোড সফল হয়েছে!");
    } catch (err) {
      console.error(err);
      toast.error("পিডিএফ তৈরি করতে সমস্যা হয়েছে!");
    } finally {
      document.body.removeChild(div);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f9f9f9] relative">
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white z-[100] shrink-0">
        <div className="flex items-center">
          <div className="text-2xl cursor-pointer text-gray-800 mr-3" onClick={onBack}>
            <ArrowLeft className="w-6 h-6" />
          </div>
          <div className="w-10 h-10 bg-[#8c258d] text-white rounded-full flex items-center justify-center font-bold text-base mr-3">
            {customer.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[17px] text-gray-900 leading-tight">
              {customer.name}
            </span>
            <span
              className={`font-semibold text-[13px] mt-0.5 leading-tight ${
                customer.type === "customer" ? "text-[#e11b22]" : "text-[#198754]"
              }`}
            >
              {customer.type === "customer" ? "পাবো " : "দিবো "}৳{" "}
              {formatAmountBng(customer.amount || 0)}
            </span>
          </div>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="bg-gray-100 w-10 h-10 rounded-xl flex justify-center items-center text-[#8c258d] cursor-pointer transition-colors border border-gray-200 shrink-0"
          title="পিডিএফ ডাউনলোড"
        >
          <Download className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-white">
        <table className="w-full border-collapse">
          <thead className="border-y border-gray-100 bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="py-3 px-2.5 text-[13px] text-gray-500 font-semibold text-left pl-5 w-[45%]">
                লেনদেনের বিবরণ
              </th>
              <th className="py-3 px-2.5 text-[13px] text-gray-500 font-semibold text-center w-[27.5%]">
                দিলাম
              </th>
              <th className="py-3 px-2.5 text-[13px] text-gray-500 font-semibold text-center w-[27.5%]">
                পেলাম
              </th>
            </tr>
          </thead>
          <tbody>
            {!customer.transactions || customer.transactions.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center p-5 text-gray-500">
                  লেনদেন নেই
                </td>
              </tr>
            ) : (
              customer.transactions.map((r, index) => (
                <tr
                  key={r.id || index}
                  className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  onClick={() => handleTxClick(r)}
                >
                  <td className="py-4 px-2.5 align-top pl-5 w-[45%]">
                    <div className="text-[13px] text-gray-600 mb-1">{r.desc}</div>
                    <div className="font-semibold text-[13px] text-gray-800">
                      {r.date}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{r.time}</div>
                    <div
                      className={`text-[11px] px-2 py-0.5 rounded-full inline-block mt-2 font-semibold bg-gray-100 ${
                        r.type === "customer" ? "text-[#e11b22]" : "text-[#198754]"
                      }`}
                    >
                      {r.type === "customer" ? "পাবো " : "দিবো "}
                      {formatAmountBng(r.balance)}
                    </div>
                  </td>
                  <td className="py-4 px-2.5 align-top w-[27.5%] bg-red-50/30 text-[#e11b22] text-center font-bold text-[15px]">
                    {r.gave > 0 ? formatAmountBng(r.gave) : ""}
                  </td>
                  <td className="py-4 px-2.5 align-top w-[27.5%] text-[#198754] text-center font-bold text-[15px]">
                    {r.got > 0 ? formatAmountBng(r.got) : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex border-t border-gray-200 font-bold py-4 text-base bg-white shrink-0">
        <div className="w-[45%] pl-5 text-gray-800">মোট</div>
        <div className="w-[27.5%] text-center text-[#e11b22]">
          {formatAmountBng(tGave)}
        </div>
        <div className="w-[27.5%] text-center text-gray-800">
          {formatAmountBng(tGot)}
        </div>
      </footer>

      {/* Action Modal */}
      {showActionModal && selectedTx && (
        <div
          className="absolute inset-0 bg-black/50 z-[1000] flex flex-col justify-end"
          onClick={() => setShowActionModal(false)}
        >
          <div
            className="bg-white rounded-t-2xl p-5 pb-8 w-full animate-in slide-in-from-bottom-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-gray-100">
              <h3 className="text-lg font-bold">লেনদেন অপশন</h3>
              <button onClick={() => setShowActionModal(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="w-full text-left px-4 py-3.5 text-base text-gray-800 font-semibold flex items-center gap-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
                onClick={() => {
                  setEditGave(selectedTx.gave ? selectedTx.gave.toString() : "");
                  setEditGot(selectedTx.got ? selectedTx.got.toString() : "");
                  setEditDesc(selectedTx.desc === "লেনদেন" ? "" : selectedTx.desc);
                  setEditDate(""); // Optional: parse existing date or leave blank to keep old
                  setShowActionModal(false);
                  setShowEditModal(true);
                }}
              >
                <Edit className="w-5 h-5 text-gray-600" /> লেনদেন এডিট (Edit)
              </button>
              <button
                className="w-full text-left px-4 py-3.5 text-base text-[#e11b22] font-semibold flex items-center gap-3 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors"
                onClick={() => {
                  setShowActionModal(false);
                  setShowDeleteModal(true);
                }}
              >
                <Trash2 className="w-5 h-5" /> লেনদেন ডিলিট (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Warning Modal */}
      {showDeleteModal && (
        <div className="absolute inset-0 bg-black/50 z-[1000] flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] text-center shadow-xl animate-in zoom-in-95 duration-200">
            <div className="text-[40px] text-[#e11b22] mb-4 flex justify-center">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold">সতর্কতা</h3>
            <p className="text-sm mt-2.5 text-gray-600">
              আপনি কি নিশ্চিত যে এই লেনদেনটি ডিলিট করতে চান? ডিলিট করলে এটি স্থায়ীভাবে মুছে যাবে।
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
                onClick={handleDelete}
              >
                হ্যাঁ (Yes)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="absolute inset-0 bg-white z-[1000] flex flex-col animate-in slide-in-from-bottom-full duration-300">
          <header className="flex items-center px-5 py-4 border-b border-gray-100 bg-[#8c258d] text-white shrink-0">
            <div className="text-2xl cursor-pointer mr-3" onClick={() => setShowEditModal(false)}>
              <ArrowLeft className="w-6 h-6" />
            </div>
            <span className="font-bold text-lg">লেনদেন এডিট করুন</span>
          </header>
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center focus-within:border-[#8c258d] transition-colors">
                <span className="text-base text-gray-600 mr-2 font-bold">৳</span>
                <input
                  type="number"
                  placeholder="দিলাম"
                  value={editGave}
                  onChange={(e) => setEditGave(e.target.value)}
                  className="border-none outline-none text-lg w-full font-semibold text-gray-800 bg-transparent"
                />
              </div>
              <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center focus-within:border-[#8c258d] transition-colors">
                <span className="text-base text-gray-600 mr-2 font-bold">৳</span>
                <input
                  type="number"
                  placeholder="পেলাম"
                  value={editGot}
                  onChange={(e) => setEditGot(e.target.value)}
                  className="border-none outline-none text-lg w-full font-semibold text-gray-800 bg-transparent"
                />
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200 focus-within:border-[#8c258d] transition-colors">
              <input
                type="text"
                placeholder="বিবরণ লিখুন (ঐচ্ছিক)"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="border-none outline-none text-[15px] w-full bg-transparent"
              />
            </div>
            <div className="mb-5">
              <label className="block text-sm text-gray-600 mb-1.5 ml-1">তারিখ পরিবর্তন (ঐচ্ছিক)</label>
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none text-gray-700 text-base focus:border-[#8c258d]"
              />
            </div>
            <button
              className="w-full bg-[#8c258d] text-white border-none p-4 rounded-xl text-lg font-bold cursor-pointer active:bg-[#6a1a6a] transition-colors"
              onClick={handleEditSave}
            >
              সেভ করুন
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
