import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/services/api';
import { useCartStore } from '@/stores/cartStore';
import { toast } from 'sonner';
import { Users, X, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TableSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning';
type TableSection = 'indoor' | 'outdoor' | 'vip';

const TableSelectionModal = ({ isOpen, onClose }: TableSelectionModalProps) => {
  const [activeFilter, setActiveFilter] = useState<TableSection | 'all'>('all');
  const { setTableId, setOrderType } = useCartStore();
  const queryClient = useQueryClient();

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: api.tables.getAll,
    enabled: isOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: TableStatus }) => {
      return api.tables.updateStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
    onError: (error) => {
      toast.error('Failed to update table status');
      console.error(error);
      // Rollback optimistic update
      setTableId(null);
      setOrderType('take_away');
    }
  });

  const clearReservedMutation = useMutation({
    mutationFn: api.tables.clearReserved,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('All reserved tables cleared');
    },
    onError: (error) => {
      toast.error('Failed to clear reserved tables');
      console.error(error);
    }
  });

  const handleTableSelect = (table: any) => {
    if (table.status !== 'available') return;

    // Optimistically update UI
    setTableId(table.table_id);
    setOrderType('dine_in');
    onClose();
    toast.success(`Table ${table.table_number} selected`);

    // Perform server update in background
    updateStatusMutation.mutate({ 
      id: table.table_id, 
      status: 'occupied' 
    });
  };

  const handleClearTable = (e: React.MouseEvent, table: any) => {
    e.stopPropagation(); // Prevent selecting the table
    
    updateStatusMutation.mutate({ 
      id: table.table_id, 
      status: 'available' 
    });
    
    toast.success(`Table ${table.table_number} is now available`);
  };

  const filteredTables = tables.filter((table: any) => 
    activeFilter === 'all' ? true : table.section === activeFilter
  );

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'available': return 'border-emerald-500 bg-emerald-50 hover:bg-emerald-100 text-emerald-700';
      case 'occupied': return 'border-red-500 bg-red-50 text-red-700';
      case 'reserved': return 'border-amber-500 bg-amber-50 text-amber-700';
      case 'cleaning': return 'border-gray-400 bg-gray-50 text-gray-500';
      default: return 'border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[700px] p-0 overflow-hidden bg-background">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl font-black font-heading uppercase tracking-tight">Table Selection</DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Select an available table for dine-in
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => clearReservedMutation.mutate()}
                className="text-[10px] font-bold font-heading uppercase tracking-widest border-slate-200"
              >
                Clear Reserved
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl">
            {(['all', 'indoor', 'outdoor', 'vip'] as const).map((section) => (
              <Button
                key={section}
                variant={activeFilter === section ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveFilter(section)}
                className={cn(
                  "flex-1 rounded-xl text-[10px] font-black font-heading uppercase tracking-widest h-10 transition-all",
                  activeFilter === section 
                    ? "bg-white text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {section}
              </Button>
            ))}
          </div>

          {/* Tables Grid */}
          <ScrollArea className="h-[400px] pr-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Loading tables...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredTables.map((table: any) => (
                  <div
                    key={table.table_id}
                    onClick={() => handleTableSelect(table)}
                    className={cn(
                      "relative border rounded-lg p-3 flex flex-col items-center justify-center gap-1 transition-all duration-200 group",
                      "h-24 shadow-sm",
                      getStatusColor(table.status),
                      table.status === 'available' && "cursor-pointer hover:-translate-y-1 hover:shadow-md"
                    )}
                  >
                    <span className="text-xl font-bold">{table.table_number}</span>
                    <div className="flex items-center gap-1 text-xs font-medium">
                      <Users className="w-3 h-3" />
                      <span>{table.capacity} Seats</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider font-semibold mt-0.5">
                      {table.status}
                    </span>
                    
                    {table.status !== 'available' && (
                      <Button 
                        size="icon" 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md z-10 opacity-100 hover:scale-110 transition-transform"
                        onClick={(e) => handleClearTable(e, table)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Reserved</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TableSelectionModal;
