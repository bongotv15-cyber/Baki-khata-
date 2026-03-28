import React, { useState } from "react";
import { auth, db } from "../lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    toast.loading("অপেক্ষা করুন...", { id: "auth" });

    try {
      if (!isLogin) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), {
          storeName: name,
          email,
        });
        toast.success("অ্যাকাউন্ট তৈরি সফল!", { id: "auth" });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("লগইন সফল!", { id: "auth" });
      }
    } catch (err: any) {
      toast.error(err.message || "ভুল তথ্য!", { id: "auth" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-white p-5 overflow-y-auto z-50">
      <div className="w-full max-w-[360px] animate-in fade-in duration-300">
        <h2 className="text-center text-[#0F7A6B] mb-6 text-2xl font-bold">
          {isLogin ? "লগইন করুন" : "নতুন অ্যাকাউন্ট তৈরি করুন"}
        </h2>
        <form onSubmit={handleAuth}>
          {!isLogin && (
            <div className="mb-4">
              <label className="block mb-1 text-gray-700 font-semibold text-sm">
                স্টোরের / আপনার নাম
              </label>
              <input
                type="text"
                placeholder="নাম লিখুন"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none transition-all focus:border-[#0F7A6B] focus:bg-white bg-gray-50"
              />
            </div>
          )}
          <div className="mb-4">
            <label className="block mb-1 text-gray-700 font-semibold text-sm">
              জিমেইল (Email)
            </label>
            <input
              type="email"
              placeholder="আপনার জিমেইল লিখুন"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none transition-all focus:border-[#0F7A6B] focus:bg-white bg-gray-50"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1 text-gray-700 font-semibold text-sm">
              পাসওয়ার্ড (Password)
            </label>
            <input
              type="password"
              placeholder={isLogin ? "পাসওয়ার্ড লিখুন" : "নতুন পাসওয়ার্ড দিন"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm outline-none transition-all focus:border-[#0F7A6B] focus:bg-white bg-gray-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0F7A6B] text-white p-3.5 rounded-lg text-base font-bold cursor-pointer transition-colors hover:bg-[#0A5C50] mt-2 disabled:opacity-70"
          >
            {isLogin ? "লগইন" : "রেজিস্টার"}
          </button>
        </form>
        <div className="text-center mt-5 text-sm text-gray-600">
          {isLogin ? "অ্যাকাউন্ট নেই? " : "ইতিমধ্যে অ্যাকাউন্ট আছে? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#0F7A6B] font-bold cursor-pointer hover:underline"
          >
            {isLogin ? "রেজিস্ট্রেশন করুন" : "লগইন করুন"}
          </button>
        </div>
      </div>
    </div>
  );
}
