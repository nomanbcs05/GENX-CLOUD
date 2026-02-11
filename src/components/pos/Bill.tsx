import { forwardRef, useState } from 'react';
import { format } from 'date-fns';
import { businessInfo } from '@/data/mockData';
import { CartItem, Customer } from '@/stores/cartStore';

interface Order {
  orderNumber: string;
  items: CartItem[];
  customer: Customer | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  deliveryFee?: number;
  total: number;
  paymentMethod?: 'cash' | 'card' | 'wallet';
  orderType?: 'dine_in' | 'take_away' | 'delivery';
  createdAt: Date;
  cashierName: string;
  rider?: { name: string } | null;
  customerAddress?: string | null;
}

interface BillProps {
  order: Order;
}

const Bill = forwardRef<HTMLDivElement, BillProps>(({ order }, ref) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <div 
      ref={ref} 
      className="receipt-print bg-white text-black p-2 font-mono text-[11px] leading-tight"
      style={{ width: '80mm', maxWidth: '100%' }}
    >
      {/* Header */}
      <div className="text-center mb-1">
        {!logoError ? (
          <img 
            src={`/logo.jpeg?v=${Date.now()}`}
            alt="Logo" 
            className="max-w-[120px] mx-auto mb-1 object-contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="border-2 border-dashed border-gray-400 rounded-[50%] w-24 h-16 mx-auto flex items-center justify-center mb-1 transform rotate-[-5deg]">
            <h1 className="text-lg font-bold italic font-serif">Genai</h1>
          </div>
        )}
      </div>

      {/* Address Box */}
      <div className="border border-black p-1 text-center mb-1 text-[10px]">
        <p>{businessInfo.address}</p>
        <p>{businessInfo.city}</p>
        <p className="font-bold">{businessInfo.phone.split(',')[0]}</p>
        <p className="font-bold">{businessInfo.phone.split(',')[1]}</p>
        <p className="text-[9px] mt-1 border-t border-dotted border-black pt-1">
          Designed & Developed By Genai Tech
        </p>
      </div>

      {/* Order Number Box */}
      <div className="border-x border-t border-black p-1 text-center">
        <div className="text-2xl font-bold">{order.orderNumber.slice(-3)}</div>
      </div>

      {/* Info Section */}
      <div className="border border-black p-1 text-[10px]">
        <div className="flex justify-between">
          <span>Invoice #:</span>
          <span>{order.orderNumber}</span>
          <span>DAY-00{new Date().getDate()}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Restaurant:</span>
          <span className="font-bold uppercase">{businessInfo.name}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>{order.cashierName} / CASH 2</span>
          <span className="uppercase">{order.orderType}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>{format(order.createdAt, 'd-MMM-yy')}</span>
          <span>{format(order.createdAt, 'h:mm a')}</span>
        </div>
        
        {order.rider && (
          <div className="flex justify-between items-center mt-1">
            <span className="font-bold text-lg">Rider :</span>
            <span className="font-bold text-lg uppercase">{order.rider.name}</span>
          </div>
        )}

        {order.customer && (
          <div className="mt-1">
            <div className="flex justify-between">
              <span>Customer :</span>
              <span>{order.customer.name}</span>
            </div>
            {order.customer.phone && (
              <div className="flex justify-between">
                <span>PH#:</span>
                <span>{order.customer.phone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>CELL#:</span>
              <span>{order.customer.phone}</span>
            </div>
          </div>
        )}

        {order.customerAddress && (
          <div className="mt-1 border-t border-dotted border-black pt-1">
            <span className="font-bold">Address :</span>
            <p className="break-words uppercase text-[11px] leading-tight mt-0.5">
              {order.customerAddress}
            </p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="border-x border-b border-black">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-black bg-gray-100">
              <th className="text-left py-1 pl-1 w-8">Qty</th>
              <th className="text-left py-1">Item</th>
              <th className="text-right py-1 w-12">Rate</th>
              <th className="text-right py-1 pr-1 w-14">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.product.id}>
                <td className="py-1 pl-1 align-top">{item.quantity}</td>
                <td className="py-1 align-top uppercase">
                  {item.product.name}
                  {/* Modifiers could go here */}
                </td>
                <td className="text-right py-1 align-top">{item.product.price}</td>
                <td className="text-right py-1 pr-1 align-top">{item.lineTotal.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-x border-b border-black p-1 text-[11px]">
        <div className="flex justify-between">
          <span>SubTotal :</span>
          <span>{order.subtotal.toFixed(3)}</span>
        </div>
        {order.deliveryFee && order.deliveryFee > 0 && (
          <div className="flex justify-between">
            <span>Delivery Charges :</span>
            <span>{order.deliveryFee}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base mt-1 bg-gray-100 p-1">
          <span>Net Bill :</span>
          <span>{order.total}</span>
        </div>
        <div className="mt-1">
          <span>TIP :</span>
        </div>
      </div>

      {/* Footer */}
      <div className="border border-black mt-1 p-2 text-center text-[10px]">
        <p>!!!!FOR THE LOVE OF FOOD !!!!</p>
        <p className="font-bold mt-1">Powered By: GENAI TECHNOLOGY.</p>
        <p>+92334-2826675</p>
      </div>
    </div>
  );
});

Bill.displayName = 'Bill';

export default Bill;
