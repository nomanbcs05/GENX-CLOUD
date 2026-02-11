import { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, ShoppingCart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Product } from '@/stores/cartStore';

interface ArabicBroastModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAdd: (product: Product) => void;
}

const ArabicBroastModal = ({ isOpen, onClose, products, onAdd }: ArabicBroastModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const broastItems = filteredItems.filter(p => !p.name.toUpperCase().includes('COMBO'));
  const combos = filteredItems.filter(p => p.name.toUpperCase().includes('COMBO'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-3xl">
        <div className="bg-emerald-500 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-tight">Arabic Broast Menu</DialogTitle>
              <DialogDescription className="text-emerald-100 font-medium">Authentic Spicy Injected Broast</DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-emerald-600 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-300" />
            <Input
              placeholder="Search broast items or combos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-emerald-600/50 border-none text-white placeholder:text-emerald-200 pl-10 h-11 rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <ScrollArea className="max-h-[70vh] p-6">
          <div className="space-y-8">
            {/* Broast Items Section */}
            {broastItems.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Broast Items</h3>
                <div className="grid gap-3">
                  {broastItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAdd(item);
                        // Optional: don't close so they can add multiple
                      }}
                      className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all text-left"
                    >
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-900">Rs {item.price.toLocaleString()}</span>
                        <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Combos Section */}
            {combos.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b pb-2">Exclusive Combos</h3>
                <div className="grid gap-3">
                  {combos.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onAdd(item)}
                      className="group flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all text-left"
                    >
                      <div className="flex-1 pr-4">
                        <p className="font-black text-emerald-600 group-hover:text-emerald-700 transition-colors mb-1">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-900 whitespace-nowrap">Rs {item.price.toLocaleString()}</span>
                        <div className="h-10 w-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-slate-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-slate-300" />
                </div>
                <p className="text-slate-500 font-bold">No items found matching your search</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-6 bg-slate-50 border-t flex justify-end">
          <Button 
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl px-8"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArabicBroastModal;