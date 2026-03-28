import { CheckCircle, X, MessageSquare, Phone, Send } from "lucide-react";
import { formatAmountBng } from "../lib/utils";
import { toast } from "sonner";

interface ShareScreenProps {
  storeName: string;
  mode: "transaction" | "tagada";
  name: string;
  phone: string;
  prevBal?: number;
  gave?: number;
  got?: number;
  currBal: number;
  currType: "customer" | "supplier";
  onClose: () => void;
}

export default function ShareScreen({
  storeName,
  mode,
  name,
  phone,
  prevBal = 0,
  gave = 0,
  got = 0,
  currBal,
  currType,
  onClose,
}: ShareScreenProps) {
  const p = formatAmountBng(prevBal);
  const ga = formatAmountBng(gave);
  const go = formatAmountBng(got);
  const c = formatAmountBng(currBal);
  const ty = currType === "customer" ? "বাকি" : "ডিউ";

  let shareTextStr = "";
  if (mode === "transaction") {
    shareTextStr = `${storeName}\nনাম: ${name}\nআগের: ৳ ${p}\nদিলাম: ৳ ${ga}\nপেলাম: ৳ ${go}\nবর্তমান: ৳ ${c} (${ty})`;
  } else {
    shareTextStr = `${storeName}\nপ্রিয় ${name},\nআপনার বকেয়া ৳ ${c}। দয়া করে পরিশোধ করুন।`;
  }

  const shareVia = (platform: string) => {
    const formattedPhone = phone.startsWith("+") ? phone : "+88" + phone;
    if (platform === "sms") {
      window.location.href = `sms:${phone}?body=${encodeURIComponent(shareTextStr)}`;
    } else if (platform === "whatsapp") {
      window.location.href = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
        shareTextStr
      )}`;
    } else {
      navigator.clipboard.writeText(shareTextStr);
      toast.success("কপি হয়েছে!");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f9f9f9] relative">
      <div className="flex items-center justify-between px-4 py-5 font-semibold bg-[#0F7A6B] text-white shadow-sm shrink-0">
        <span className="text-lg font-bold">
          {mode === "transaction" ? "লেনদেন সফল" : "তাগাদা পাঠান"}
        </span>
        <span className="text-2xl cursor-pointer flex items-center" onClick={onClose}>
          <X className="w-6 h-6" />
        </span>
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          {mode === "transaction" ? (
            <div>
              <div className="text-[#198754] text-[45px] text-center mb-2.5 flex justify-center">
                <CheckCircle className="w-12 h-12" />
              </div>
              <h3 className="text-center mb-5 text-gray-800 font-bold text-lg">{name}</h3>
              <div className="flex justify-between text-sm text-gray-600 mb-2.5">
                <span>আগের ব্যালেন্স:</span>
                <span className="font-semibold">৳ {p}</span>
              </div>
              <div className="flex justify-between text-sm text-[#e11b22] mb-2.5">
                <span>{currType === "customer" ? "নতুন দিলাম/বেচা:" : "নতুন দিলাম/পেমেন্ট:"}</span>
                <span className="font-semibold">৳ {ga}</span>
              </div>
              <div className="flex justify-between text-sm text-[#198754] mb-2.5">
                <span>{currType === "customer" ? "নতুন জমা/পেলাম:" : "নতুন কেনা/পেলাম:"}</span>
                <span className="font-semibold">৳ {go}</span>
              </div>
              <hr className="my-3 border-0 border-t border-dashed border-gray-300" />
              <div className="flex justify-between font-bold text-base text-gray-800">
                <span>বর্তমান ব্যালেন্স:</span>
                <span>৳ {c}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2.5">
              <h3 className="mb-2.5 text-gray-800 font-bold text-lg">{name}</h3>
              <p className="text-[15px] text-gray-500 mb-1.5">বর্তমান {ty}</p>
              <h2 className="text-[32px] text-[#e11b22] font-bold">৳ {c}</h2>
            </div>
          )}
        </div>

        <h4 className="mb-4 text-center text-gray-600 font-semibold">
          কাস্টমারকে শেয়ার করুন
        </h4>
        <div className="grid grid-cols-4 gap-2.5 text-center">
          <div
            className="cursor-pointer transition-transform active:scale-95 flex flex-col items-center"
            onClick={() => shareVia("sms")}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-[#007bff] mb-2">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-gray-700">SMS</span>
          </div>
          <div
            className="cursor-pointer transition-transform active:scale-95 flex flex-col items-center"
            onClick={() => shareVia("whatsapp")}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-[#25d366] mb-2">
              <Phone className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-gray-700">WhatsApp</span>
          </div>
          <div
            className="cursor-pointer transition-transform active:scale-95 flex flex-col items-center"
            onClick={() => shareVia("messenger")}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-[#0084ff] mb-2">
              <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-gray-700">Messenger</span>
          </div>
          <div
            className="cursor-pointer transition-transform active:scale-95 flex flex-col items-center"
            onClick={() => shareVia("imo")}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white bg-[#118cff] mb-2">
              <Send className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium text-gray-700">Imo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
