import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingBag } from "lucide-react";

interface Product {
  id: string | number;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

interface ProductSummaryProps {
  products: Product[];
  orderId: string;
  lastSyncTime?: string;
}

export const ProductSummary = ({ products, orderId, lastSyncTime }: ProductSummaryProps) => {
  const subtotal = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  return (
    <Card className="shadow-card sticky top-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <CardTitle>Order Summary</CardTitle>
        </div>
        <CardDescription>Order #{orderId}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="flex gap-3">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-md border"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm leading-tight mb-1 truncate">
                  {product.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Qty: {product.quantity}
                </p>
                <p className="text-sm font-semibold text-primary">
                  PKR {product.price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">PKR {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax (10%)</span>
            <span className="font-medium">PKR {tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">PKR {total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-lg p-3 text-xs text-muted-foreground">
          <p>🔒 Secured by EasyRokra</p>
          <p className="mt-1">Your payment information is encrypted and safe</p>
        </div>
      </CardContent>
    </Card>
  );
};
