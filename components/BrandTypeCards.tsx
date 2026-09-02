"use client";

import { Scissors, Flower2 } from "lucide-react";
import type { BusinessType } from "@/lib/theme";

function Card({
  variant,
  active,
  onSelect,
}: {
  variant: BusinessType;
  active: boolean;
  onSelect: () => void;
}) {
  const isBarber = variant === "barber";
  const stripe = isBarber
    ? "repeating-linear-gradient(-45deg, #C0293A 0px, #C0293A 8px, #EDEAE1 8px, #EDEAE1 16px, #2C4A87 16px, #2C4A87 24px, #EDEAE1 24px, #EDEAE1 32px)"
    : "linear-gradient(90deg, #D9A3B0 0%, #C98FAE 30%, #A9799E 60%, #E7C9CE 100%)";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="rounded-2xl p-5 flex-1 text-left transition"
      style={{
        background: "#12100c",
        border: active ? "1px solid #d8c9a3" : "1px solid #29231a",
        opacity: active ? 1 : 0.55,
      }}
    >
      <div className="h-1.5 w-full rounded-full mb-5" style={{ background: stripe }} />
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isBarber
              ? "linear-gradient(135deg, #C0293A 0%, #2C4A87 100%)"
              : "linear-gradient(135deg, #E5AEC0 0%, #9B6B90 100%)",
          }}
        >
          {isBarber ? (
            <Scissors className="w-5 h-5" style={{ color: "#F3EBDA" }} strokeWidth={2.5} />
          ) : (
            <Flower2 className="w-5 h-5" style={{ color: "#2c1f28" }} strokeWidth={2.5} />
          )}
        </div>
        <h3 className="font-display text-base leading-tight" style={{ color: "#F3EBDA" }}>
          {isBarber ? "Barbería" : "Salón de belleza"}
        </h3>
      </div>
    </button>
  );
}

export default function BrandTypeCards({
  value,
  onChange,
}: {
  value: BusinessType;
  onChange: (t: BusinessType) => void;
}) {
  return (
    <div className="flex gap-3 mb-6">
      <Card variant="barber" active={value === "barber"} onSelect={() => onChange("barber")} />
      <Card variant="salon" active={value === "salon"} onSelect={() => onChange("salon")} />
    </div>
  );
}
