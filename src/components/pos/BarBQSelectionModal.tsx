import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Utensils, ChefHat } from 'lucide-react';
import { cn } from "@/lib/utils";

interface BarBQSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: any) => void;
}

interface BarBQItem {
  name: string;
  price: number;
}

const BARBQ_DATA: BarBQItem[] = [
  { name: "All Flavours Leg Tikka", price: 350 },
  { name: "Green Chicken Tikka Chest", price: 450 },
  { name: "Behari Tikka Chest", price: 450 },
  { name: "Malai Tikka Chest", price: 450 },
  { name: "Green Chicken Boti Boneless 5 Pcs", price: 250 },
  { name: "Behari Boti Boneless 5 Pcs", price: 250 },
  { name: "Malai Boti Boneless 5 Pcs", price: 250 },
  { name: "Reshmi Kabab Chicken 1 Plate / 6 Pcs", price: 400 },
  { name: "Reshmi Kabab Beef 1 Plate / 6 Pcs", price: 400 },
  { name: "Chicken Gola Kabab 1 Plate / 4 Pcs", price: 250 },
];

export default function BarBQSelectionModal({ isOpen, onClose, onAdd }: BarBQSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBarBQ = BARBQ_DATA.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddBarBQ = (item: BarBQItem) => {
    const bbqProduct = {
      id: `barbq-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: item.name,
      price: item.price,
      category: 'BAR BQ',
      image: '🔥',
      sku: `BBQ-${item.name.substring(0,3).toUpperCase()}`
    };
    onAdd(bbqProduct);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-3xl max-h-[90vh] h-[90vh] flex flex-col shadow-2xl [&>button]:hidden" aria-describedby="barbq-selection-description">
        {/* Header */}
        <div className="bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 text-white shrink-0 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <ChefHat className="h-7 w-7 text-orange-500" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight">BAR BQ Menu</DialogTitle>
                <DialogDescription id="barbq-selection-description" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Fresh & Smoky Charcoal Grill
                </DialogDescription>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
            >
              <Plus className="h-6 w-6 rotate-45" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search Bar BQ items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-none text-white placeholder:text-slate-500 pl-10 h-11 text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-6 grid grid-cols-1 gap-3">
            {filteredBarBQ.map((item) => (
              <button
                key={item.name}
                onClick={() => handleAddBarBQ(item)}
                className="group flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 shadow-sm hover:shadow-md transition-all text-left"
              >
                <div className="flex-1 pr-4">
                  <p className="font-bold font-heading text-slate-800 text-[15px] group-hover:text-slate-900 transition-colors tracking-tight">{item.name}</p>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <span className="font-black font-heading text-slate-900 text-base tracking-tight">Rs {item.price}</span>
                  <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-orange-500 flex items-center justify-center transition-colors">
                    <Plus className="h-4 w-4 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
            Tap an item to add to cart
          </p>
          <Button 
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black font-heading uppercase tracking-widest px-8 rounded-xl h-11"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
