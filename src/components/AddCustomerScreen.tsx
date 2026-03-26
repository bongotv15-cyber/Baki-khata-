import { useState, useEffect } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Customer } from "../types";
import { toast } from "sonner";
import { generateUUID } from "../lib/utils";

interface AddCustomerScreenProps {
  storeName: string;
  activeCustomer: Customer | null;
  onBack: () => void;
  onSave: (customer: Customer) => void;
  customers: Customer[];
}

export default function AddCustomerScreen({
  storeName,
  activeCustomer,
  onBack,
  onSave,
  customers,
}: AddCustomerScreenProps) {
  const isEditMode = !!activeCustomer;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<"customer" | "supplier">("customer");

  useEffect(() => {
    if (activeCustomer) {
      setName(activeCustomer.name);
      setPhone(activeCustomer.phone);
      setAddress(activeCustomer.address || "");
      setType(activeCustomer.type);
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setType("customer");
    }
  }, [activeCustomer]);

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      toast.error("নাম ও নম্বর দিন!");
      return;
    }

    const exists = customers.find(
      (c) => c.phone === trimmedPhone && c.id !== activeCustomer?.id
    );
    if (exists) {
      toast.error("এই নম্বরে কাস্টমার আছে!");
      return;
    }

    const id = isEditMode ? activeCustomer.id : generateUUID();
    const payload: Customer = {
      ...(isEditMode ? activeCustomer : { amount: 0, transactions: [] }),
      id,
      name: trimmedName,
      phone: trimmedPhone,
      address: address.trim(),
      type,
      updatedAt: Date.now(),
    };

    onSave(payload);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#f9f9f9] relative">
      <div className="flex items-center px-4 py-5 text-xl font-semibold bg-[#8c258d] text-white shadow-sm shrink-0">
        <span className="text-2xl mr-4 cursor-pointer flex items-center" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </span>
        <span className="ml-2.5">{storeName}</span>
      </div>

      <div className="bg-white m-5 px-5 py-6 rounded-2xl text-center shadow-sm">
        <div className="text-[50px] mb-2.5 text-[#8c258d] flex justify-center">
          <Users className="w-12 h-12" />
        </div>
        <div className="text-xl font-bold text-gray-800">
          {isEditMode ? "পরিবর্তন করুন" : "নতুন যোগ করুন"}
        </div>

        <div className="flex justify-center gap-5 my-5">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold">
            <input
              type="radio"
              name="personType"
              value="customer"
              checked={type === "customer"}
              onChange={() => setType("customer")}
              className="accent-[#8c258d]"
            />{" "}
            কাস্টমার
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer font-semibold">
            <input
              type="radio"
              name="personType"
              value="supplier"
              checked={type === "supplier"}
              onChange={() => setType("supplier")}
              className="accent-[#8c258d]"
            />{" "}
            সাপ্লায়ার
          </label>
        </div>

        <input
          type="text"
          placeholder="নাম লিখুন"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3.5 mb-4 rounded-xl border border-gray-200 text-[15px] outline-none transition-colors focus:border-[#8c258d]"
        />

        <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-4 transition-colors focus-within:border-[#8c258d]">
          <div className="bg-gray-100 p-3.5 font-semibold border-r border-gray-200 flex items-center text-gray-600">
            +880
          </div>
          <input
            type="number"
            placeholder="মোবাইল নম্বর"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border-none mb-0 rounded-none flex-1 w-auto min-w-0 p-3.5 text-[15px] outline-none"
          />
        </div>

        <input
          type="text"
          placeholder="ঠিকানা লিখুন (ঐচ্ছিক)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-3.5 mb-4 rounded-xl border border-gray-200 text-[15px] outline-none transition-colors focus:border-[#8c258d]"
        />

        <button
          className="w-full p-4 mt-2.5 border-none rounded-xl bg-[#8c258d] text-white text-[17px] font-semibold cursor-pointer active:bg-[#6a1a6a] transition-colors"
          onClick={handleSave}
        >
          সংরক্ষণ করুন
        </button>
      </div>
    </div>
  );
}
