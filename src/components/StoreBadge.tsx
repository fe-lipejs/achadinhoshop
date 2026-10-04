import type { Store } from '../types';
import { STORE_LABEL } from '../lib/utils';

export function StoreBadge({ store }: { store: Store }) {
  const baseClasses = "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] text-[11px] font-bold tracking-wider uppercase";
  const storeClasses = store === 'shopee' 
    ? "bg-[#ee4d2d] text-white" 
    : "bg-[#ffe600] text-[#2d3277]";

  return (
    <span className={`${baseClasses} ${storeClasses}`}>
      {STORE_LABEL[store]}
    </span>
  );
}
