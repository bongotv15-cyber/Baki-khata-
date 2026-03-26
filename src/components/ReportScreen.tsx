import { ArrowLeft, Bell } from "lucide-react";
import { Customer } from "../types";
import { formatAmountBng } from "../lib/utils";

interface ReportScreenProps {
  customer: Customer;
  onBack: () => void;
  onTagada: () => void;
}

export default function ReportScreen({
  customer,
  onBack,
  onTagada,
}: ReportScreenProps) {
  const tGave = (customer.transactions || []).reduce((acc, r) => acc + r.gave, 0);
  const tGot = (customer.transactions || []).reduce((acc, r) => acc + r.got, 0);

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
      </header>

      <div className="px-5 py-4 shrink-0 bg-white">
        <div
          className="bg-gray-50 p-3 rounded-lg flex items-center justify-center text-[#e11b22] font-semibold text-sm border border-gray-200 cursor-pointer gap-2 active:bg-gray-100 transition-colors"
          onClick={onTagada}
        >
          <Bell className="w-4 h-4" /> তাগাদা মেসেজ পাঠাই
        </div>
      </div>

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
                <tr key={r.id || index} className="border-b border-gray-50">
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
    </div>
  );
}
