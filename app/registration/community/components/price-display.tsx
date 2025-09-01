import { CommunityPriceCalculation } from "@/lib/types/community-registration";
import { formatCurrency } from "@/lib/utils/format";

interface PriceDisplayProps {
  calculation: CommunityPriceCalculation | null;
  category: "5K" | "10K";
}

export default function PriceDisplay({ calculation, category }: PriceDisplayProps) {
  if (!calculation) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Rincian Biaya
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Kategori {category}:</span>
          <span>{formatCurrency(calculation.basePrice)}/orang</span>
        </div>

        <div className="flex justify-between">
          <span>{calculation.totalMembers} peserta × {formatCurrency(calculation.basePrice)}:</span>
          <span>{formatCurrency(calculation.totalBase)}</span>
        </div>

        {calculation.jerseyAddOnTotal > 0 && (
          <div className="flex justify-between">
            <span>Jersey XXL/XXXL:</span>
            <span>+{formatCurrency(calculation.jerseyAddOnTotal)}</span>
          </div>
        )}

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span className="text-primary">{formatCurrency(calculation.totalPrice)}</span>
          </div>

          {calculation.savings > 0 && (
            <div className="text-green-600 text-sm mt-1">
              Hemat {formatCurrency(calculation.savings)} dibanding harga individual!
            </div>
          )}

          <div className="text-gray-500 text-xs mt-2">
            {formatCurrency(calculation.pricePerPerson)}/orang
          </div>
        </div>
      </div>
    </div>
  );
}
