const CATEGORIES = [
  { name: 'Traditional Attire', emoji: '🧵' },
  { name: 'Handicrafts & Art', emoji: '🏺' },
  { name: 'Electronics', emoji: '📱' },
  { name: 'Kitchen & Home', emoji: '🍳' },
  { name: 'Daily Groceries', emoji: '🛒' },
  { name: 'Fashion & Accessories', emoji: '👜' },
  { name: 'Books & Education', emoji: '📚' },
];

interface CategoryNavProps {
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
}

export function CategoryNav({ activeCategory, setActiveCategory }: CategoryNavProps) {
  return (
    <div className="w-full border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              activeCategory === null
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => setActiveCategory(c.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === c.name
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
