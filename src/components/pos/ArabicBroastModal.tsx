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
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-2xl sm:rounded-3xl max-h-[90vh] flex flex-col">
        <div className="bg-emerald-500 px-5 py-4 text-white shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Arabic Broast Menu</DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs font-medium">Authentic Spicy Injected Broast</DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-white hover:bg-emerald-600 rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-300" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-emerald-600/50 border-none text-white placeholder:text-emerald-200 pl-9 h-9 text-sm rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-6">
            {/* Broast Items Section */}
            {broastItems.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">Broast Items</h3>
                <div className="grid gap-2">
                  {broastItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        onAdd(item);
                      }}
                      className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all text-left"
                    >
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-black text-slate-900 text-sm">Rs {item.price.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Combos Section */}
            {combos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">Exclusive Combos</h3>
                <div className="grid gap-2">
                  {combos.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onAdd(item)}
                      className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-100 hover:border-emerald-200 transition-all text-left"
                    >
                      <div className="flex-1 pr-4">
                        <p className="font-black text-emerald-600 text-sm group-hover:text-emerald-700 transition-colors mb-0.5">{item.name}</p>
                        {(item as any).description && (
                          <p className="text-[11px] text-slate-500 font-medium leading-tight">{(item as any).description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="font-black text-slate-900 text-sm whitespace-nowrap">Rs {item.price.toLocaleString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <div className="text-center py-8">
                <div className="bg-slate-50 h-12 w-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-slate-500 text-sm font-bold">No items found</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="px-5 py-3 bg-slate-50 border-t flex justify-end shrink-0">
          <Button 
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-lg px-6 h-9"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ArabicBroastModal;