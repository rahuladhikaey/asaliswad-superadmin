"use client";

import { useState } from "react";
import { Star, Trash2, ShieldAlert, CheckCircle2, Search } from "lucide-react";

export default function ReviewsModerationView() {
  const [reviews, setReviews] = useState<any[]>([
    { id: 1, product: "Organic Himalayan Shilajit Resin (20g)", reviewer: "Rahul A.", rating: 5, comment: "Authentic purity and remarkable energy boost! Fast delivery.", date: "2026-07-20", isAbusive: false },
    { id: 2, product: "Pure Wild Forest Honey (500g)", reviewer: "Ananya S.", rating: 5, comment: "Rich natural taste, non-adulterated quality. Highly recommend!", date: "2026-07-18", isAbusive: false },
    { id: 3, product: "Kashmiri Saffron Mogra A1", reviewer: "Spam Bot", rating: 1, comment: "Click this link for cheap crypto discount http://spam.xyz", date: "2026-07-15", isAbusive: true },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  const handleRemoveReview = (id: number) => {
    if (!confirm("Are you sure you want to remove this customer review?")) return;
    setReviews(reviews.filter(r => r.id !== id));
  };

  const filteredReviews = reviews.filter(r => 
    r.product.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.comment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Quality Moderation</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Customer Reviews & Ratings Control</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor customer feedback, remove spam or abusive reviews, and safeguard marketplace trust.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search review content or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredReviews.map(rev => (
          <div key={rev.id} className={`p-5 rounded-3xl border shadow-sm flex items-start justify-between gap-4 ${
            rev.isAbusive ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
          }`}>
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 dark:text-white text-xs">{rev.product}</span>
                {rev.isAbusive && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Flagged Spam
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-300"}`} />
                ))}
                <span className="text-[11px] text-slate-400 ml-2 font-bold">— {rev.reviewer} ({rev.date})</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{rev.comment}</p>
            </div>

            <button
              onClick={() => handleRemoveReview(rev.id)}
              className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shrink-0"
              title="Remove Abusive Review"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
