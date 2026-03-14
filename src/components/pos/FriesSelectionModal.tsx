import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useMultiTenant } from '@/hooks/useMultiTenant';
import { toast } from 'sonner';

interface FriesSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (product: any) => void;
}

interface FriesItem {
  name: string;
  price: number;
}

const DEFAULT_FRIES_DATA: FriesItem[] = [
  { name: "Plain Fries", price: 100 },
  { name: "Garlic Mayo Fries", price: 150 },
  { name: "Pizza Fries Small", price: 200 },
  { name: "Pizza Fries Large", price: 300 },
];

export default function FriesSelectionModal({ isOpen, onClose, onAdd }: FriesSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [quantityPrefix, setQuantityPrefix] = useState<string>('');
  const { isAdmin } = useMultiTenant();
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [menuItems, setMenuItems] = useState<FriesItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('pos_menu_fries');
    if (saved) {
      setMenuItems(JSON.parse(saved));
    } else {
      setMenuItems(DEFAULT_FRIES_DATA);
    }
  }, [isOpen]);

  const saveMenu = (updatedItems: FriesItem[]) => {
    setMenuItems(updatedItems);
    localStorage.setItem('pos_menu_fries', JSON.stringify(updatedItems));
  };

  const handleUpdateItem = (index: number, field: keyof FriesItem, value: string | number) => {
    const updated = [...menuItems];
    updated[index] = { ...updated[index], [field]: field === 'price' ? Number(value) : value };
    saveMenu(updated);
  };

  const handleAddItem = () => {
    const updated = [...menuItems, { name: "New Fries", price: 0 }];
    saveMenu(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = menuItems.filter((_, i) => i !== index);
    saveMenu(updated);
    toast.success('Item removed');
  };

  const filteredFries = menuItems.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFries = (item: FriesItem) => {
    if (isEditingMode) return;
    const qty = parseInt(quantityPrefix) || 1;
    const friesProduct = {
      id: `fries-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: item.name,
      price: item.price,
      category: 'ALA CART',
      image: '🍟',
      sku: `FRS-${item.name.substring(0,3).toUpperCase()}`,
      quantity: qty
    };
    
    for (let i = 0; i < qty; i++) {
      onAdd(friesProduct);
    }
    
    setQuantityPrefix('');
  };

  const handleNumberClick = (num: number) => {
    setQuantityPrefix(prev => {
      const newPrefix = prev + num.toString();
      return newPrefix.length > 2 ? newPrefix.slice(-2) : newPrefix;
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setIsEditingMode(false);
        onClose();
      }
    }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-3xl max-h-[90vh] h-[90vh] flex flex-col shadow-2xl [&>button]:hidden">
        {/* Header */}
        <div className="bg-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-5 text-white shrink-0 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Plus className="h-7 w-7 text-yellow-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight">Fries Menu</DialogTitle>
                  {isAdmin && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-8 w-8 rounded-full",
                        isEditingMode ? "bg-yellow-500 text-white hover:bg-yellow-600" : "bg-white/10 text-white hover:bg-white/20"
                      )}
                      onClick={() => setIsEditingMode(!isEditingMode)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <DialogDescription className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  {isEditingMode ? "ADMIN MODE: EDITING ITEMS" : "Crispy & Delicious Fries"}
                </DialogDescription>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-90"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search fries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/10 border-none text-white placeholder:text-slate-500 pl-10 h-11 text-sm rounded-xl focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-0"
            />
          </div>

          {/* Number Pad */}
          {!isEditingMode && (
            <div className="mt-4 bg-white/10 p-2 rounded-2xl border border-white/10">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Quantity</span>
                {quantityPrefix && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-white text-slate-900 px-2 py-0.5 rounded-full">
                      Qty: {quantityPrefix}
                    </span>
                    <button onClick={() => setQuantityPrefix('')} className="text-[10px] font-bold text-white/50 hover:text-white underline uppercase">Clear</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    className={cn(
                      "h-9 rounded-lg font-black text-sm transition-all active:scale-90 flex items-center justify-center",
                      quantityPrefix.includes(num.toString()) 
                        ? "bg-white text-slate-900 shadow-lg" 
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar">
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3">
              {filteredFries.map((item, index) => {
                const originalIndex = menuItems.findIndex(f => f.name === item.name);
                return (
                  <div
                    key={index}
                    className={cn(
                      "group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all",
                      !isEditingMode && "hover:bg-slate-50 hover:border-slate-300 hover:shadow-md cursor-pointer"
                    )}
                    onClick={() => !isEditingMode && handleAddFries(item)}
                  >
                    <div className="flex-1 pr-4">
                      {isEditingMode ? (
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(originalIndex); }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Input 
                            value={item.name} 
                            onChange={(e) => handleUpdateItem(originalIndex, 'name', e.target.value)}
                            className="h-9 text-sm font-bold"
                          />
                          <Input 
                            type="number"
                            value={item.price} 
                            onChange={(e) => handleUpdateItem(originalIndex, 'price', e.target.value)}
                            className="h-9 w-24 text-sm font-black"
                          />
                        </div>
                      ) : (
                        <p className="font-bold font-heading text-slate-800 text-[15px] group-hover:text-slate-900 transition-colors tracking-tight">{item.name}</p>
                      )}
                    </div>
                    {!isEditingMode && (
                      <div className="flex items-center gap-5 shrink-0">
                        <span className="font-black font-heading text-slate-900 text-base tracking-tight">Rs {item.price}</span>
                        <div className="h-8 w-8 rounded-full bg-slate-100 group-hover:bg-yellow-500 flex items-center justify-center transition-colors">
                          <Plus className="h-4 w-4 text-slate-400 group-hover:text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isEditingMode && (
                <Button 
                  variant="outline" 
                  className="mt-4 border-dashed border-2 h-14 rounded-2xl text-slate-500 hover:text-yellow-600 hover:border-yellow-200 hover:bg-yellow-50 font-bold"
                  onClick={handleAddItem}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add New Fries
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4">
            {isEditingMode ? "Changes are saved automatically" : "Tap an item to add to cart"}
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