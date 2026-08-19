const CATEGORIES = [
  { name: 'Traditional Attire' },
  { name: 'Handicrafts & Art' },
  { name: 'Electronics' },
  { name: 'Kitchen & Home' },
  { name: 'Daily Groceries' },
  { name: 'Fashion & Accessories' },
  { name: 'Books & Education' },
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
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              activeCategory === null
                ? 'bg-teal-700 text-white'
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
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeCategory === c.name
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
