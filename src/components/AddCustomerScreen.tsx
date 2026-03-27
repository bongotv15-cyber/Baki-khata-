import { useState, useEffect } from "react";
import { ArrowLeft, Users, BookUser } from "lucide-react";
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
  const [type, setType] = useState<"customer" | "supplier">("customer");

  useEffect(() => {
    if (activeCustomer) {
      setName(activeCustomer.name);
      setPhone(activeCustomer.phone);
      setType(activeCustomer.type);
    } else {
      setName("");
      setPhone("");
      setType("customer");
    }
  }, [activeCustomer]);

  const handleContactPick = async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await (navigator as any).contacts.select(props, opts);
        if (contacts.length > 0) {
          const contact = contacts[0];
          if (contact.name && contact.name.length > 0) {
            setName(contact.name[0]);
          }
          if (contact.tel && contact.tel.length > 0) {
            let phoneNum = contact.tel[0].replace(/\D/g, '');
            if (phoneNum.startsWith('880')) phoneNum = phoneNum.slice(3);
            setPhone(phoneNum);
          }
        }
      } catch (ex) {
        console.error(ex);
        toast.error("কন্টাক্ট নির্বাচন করা বাতিল হয়েছে বা ব্যর্থ হয়েছে");
      }
    } else {
      toast.error("আপনার ব্রাউজারে কন্টাক্ট পিকার সাপোর্ট করে না");
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      toast.error("নাম দিন!");
      return;
    }

    if (trimmedPhone) {
      const exists = customers.find(
        (c) => c.phone === trimmedPhone && c.id !== activeCustomer?.id
      );
      if (exists) {
        toast.error("এই নম্বরে কাস্টমার আছে!");
        return;
      }
    }

    const id = isEditMode ? activeCustomer.id : generateUUID();
    const payload: Customer = {
      ...(isEditMode ? activeCustomer : { amount: 0, transactions: [] }),
      id,
      name: trimmedName,
      phone: trimmedPhone,
      address: "",
      type,
      updatedAt: Date.now(),
    };

    onSave(payload);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white relative">
      <div className="flex items-center px-4 py-5 text-xl font-semibold bg-[#8c258d] text-white shadow-sm shrink-0">
        <span className="text-2xl mr-4 cursor-pointer flex items-center" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </span>
        <span className="ml-2.5">কাস্টমার যোগ করুন</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col">
        <div className="text-[50px] mb-4 text-[#8c258d] flex justify-center">
          <Users className="w-16 h-16" />
        </div>
        <div className="text-2xl font-bold text-gray-800 text-center mb-8">
          {isEditMode ? "কাস্টমার পরিবর্তন করুন" : "নতুন কাস্টমার যোগ করুন"}
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <label className="flex items-center gap-2 text-base cursor-pointer font-semibold">
            <input
              type="radio"
              name="personType"
              value="customer"
              checked={type === "customer"}
              onChange={() => setType("customer")}
              className="accent-[#8c258d] w-4 h-4"
            />{" "}
            কাস্টমার
          </label>
          <label className="flex items-center gap-2 text-base cursor-pointer font-semibold">
            <input
              type="radio"
              name="personType"
              value="supplier"
              checked={type === "supplier"}
              onChange={() => setType("supplier")}
              className="accent-[#8c258d] w-4 h-4"
            />{" "}
            সাপ্লায়ার
          </label>
        </div>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">নাম <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="নাম লিখুন"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-xl border border-gray-200 text-base outline-none transition-colors focus:border-[#8c258d] bg-gray-50 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">মোবাইল নম্বর (ঐচ্ছিক)</label>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden transition-colors focus-within:border-[#8c258d] bg-gray-50 focus-within:bg-white">
              <div className="bg-gray-100 p-4 font-semibold border-r border-gray-200 flex items-center text-gray-600">
                +880
              </div>
              <input
                type="number"
                placeholder="মোবাইল নম্বর"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="border-none mb-0 rounded-none flex-1 w-auto min-w-0 p-4 text-base outline-none bg-transparent"
              />
              {'contacts' in navigator && 'ContactsManager' in window && (
                <button
                  onClick={handleContactPick}
                  className="bg-purple-50 px-5 flex items-center justify-center text-[#8c258d] border-l border-gray-200 hover:bg-purple-100 transition-colors"
                  title="ফোনবুক থেকে নিন"
                >
                  <BookUser className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pb-6">
          <button
            className="w-full p-4 border-none rounded-xl bg-[#8c258d] text-white text-lg font-bold cursor-pointer active:bg-[#6a1a6a] transition-colors shadow-md hover:shadow-lg"
            onClick={handleSave}
          >
            সংরক্ষণ করুন
          </button>
        </div>
      </div>
    </div>
  );
}
