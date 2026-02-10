import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between bg-muted/20">
          <DialogTitle className="text-xl font-bold">Select Table</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Filter Buttons & Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {(['all', 'indoor', 'outdoor', 'vip'] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "outline"}
                  onClick={() => setActiveFilter(filter)}
                  size="sm"
                  className="capitalize min-w-[80px]"
                >
                  {filter}
                </Button>
              ))}
            </div>

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={() => clearReservedMutation.mutate()}
              disabled={clearReservedMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Reserved
            </Button>
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
