"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Plus, Trash2 } from "lucide-react";

type ProductType = "roller" | "zebra";

type LineItem = {
  id: number;
  width: number;  // inches
  height: number; // inches
  productType: ProductType;
  motorized: boolean;
  quantity: number;
};

const MAX_ITEMS = 30;
const MOTOR_SURCHARGE = 215; // your motorized price per shade

// 👉 YOUR REAL FORMULA
function calculateLinePrice(item: LineItem): number {
  // 1) inches -> feet, round UP
  const widthFt = Math.ceil(item.width / 12);
  const heightFt = Math.ceil(item.height / 12);

  // 2) square footage
  const sqft = widthFt * heightFt;

  // 3) rate: roller vs zebra
  const rate = item.productType === "roller" ? 4.5 : 4.75;

  // 4) base price per shade
  let pricePerShade = sqft * rate;

  // 5) motorized surcharge
  if (item.motorized) {
    pricePerShade += MOTOR_SURCHARGE;
  }

  // 6) quantity
  return pricePerShade * item.quantity;
}

const currency = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

export default function EstimatePage() {
  const [items, setItems] = useState<LineItem[]>([]);
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [productType, setProductType] = useState<ProductType>("roller");
  const [motorized, setMotorized] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<string>("1");

  const totalEstimate = useMemo(
    () => items.reduce((sum, item) => sum + calculateLinePrice(item), 0),
    [items]
  );

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) return;

    const w = Number(width);
    const h = Number(height);
    const q = Number(quantity);

    if (!w || !h || !q || w <= 0 || h <= 0 || q <= 0) {
      alert("Please enter valid width, height, and quantity.");
      return;
    }

    const newItem: LineItem = {
      id: Date.now(),
      width: w,
      height: h,
      productType,
      motorized,
      quantity: q,
    };

    setItems((prev) => [...prev, newItem]);
    setWidth("");
    setHeight("");
    setQuantity("1");
    setMotorized(false);
  };

  const handleRemoveItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Header */}
      <header className="w-full border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  SM
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-wide">
                    ShadeMaster Blinds LTD.
                  </span>
                  <span className="text-xs text-neutral-600">
                    Vancouver • Pre-Quote Calculator
                  </span>
                </div>
              </div>
            </Link>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm" className="rounded-2xl border-neutral-200">
              Back to site
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <section className="w-full">
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-12 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                Pre-Quote Price Estimate
              </h1>
              <p className="mt-2 text-sm md:text-base text-neutral-600 max-w-xl">
                Enter your window sizes to get a rough idea of your project cost. 
                Final pricing will be confirmed after an in-home visit.
              </p>
            </div>
            <Badge className="bg-blue-100 text-sky-700 border border-blue-200">
              Up to {MAX_ITEMS} windows / shades
            </Badge>
          </div>

          {/* Input card */}
          <Card className="rounded-2xl border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                1. Add a window / shade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Width</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      placeholder="e.g. 78"
                    />
                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                      inches
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Height</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 57"
                    />
                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                      inches
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Product type</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setProductType("roller")}
                      className={`rounded-full border px-3 py-2 text-xs font-medium ${
                        productType === "roller"
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-neutral-200 bg-white text-neutral-700"
                      }`}
                    >
                      Roller
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductType("zebra")}
                      className={`rounded-full border px-3 py-2 text-xs font-medium ${
                        productType === "zebra"
                          ? "border-sky-500 bg-sky-50 text-sky-700"
                          : "border-neutral-200 bg-white text-neutral-700"
                      }`}
                    >
                      Zebra
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-dashed border-neutral-200 pt-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setMotorized((m) => !m)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      motorized
                        ? "border-sky-500 bg-sky-50 text-sky-700"
                        : "border-neutral-200 bg-white text-neutral-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        motorized ? "bg-sky-500" : "bg-neutral-300"
                      }`}
                    />
                    {motorized ? "Motorized (LL OneTouch™)" : "Manual control"}
                  </button>
                  <p className="text-xs text-neutral-500">
                    Motorization adds ${MOTOR_SURCHARGE} per shade.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddItem}
                    disabled={items.length >= MAX_ITEMS}
                    className="rounded-2xl inline-flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add to estimate
                  </Button>
                  {items.length >= MAX_ITEMS && (
                    <p className="text-xs text-red-500">
                      You’ve reached the maximum of {MAX_ITEMS} items.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items list */}
          <Card className="rounded-2xl border-neutral-200 bg-white">
            <CardHeader>
              <CardTitle className="text-base md:text-lg">
                2. Your estimate items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No items yet. Enter a window above and click{" "}
                  <span className="font-medium">“Add to estimate”.</span>
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="hidden md:grid grid-cols-[1.3fr_1fr_1.1fr_0.8fr_0.8fr] gap-3 text-xs font-medium text-neutral-500 pb-1 border-b border-neutral-100">
                    <span>Window</span>
                    <span>Type</span>
                    <span>Control</span>
                    <span className="text-right">Qty</span>
                    <span className="text-right">Est. line total</span>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => {
                      const linePrice = calculateLinePrice(item);
                      const label = `${item.width}" × ${item.height}"`;

                      return (
                        <div
                          key={item.id}
                          className="grid grid-cols-1 gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3 text-sm md:grid-cols-[1.3fr_1fr_1.1fr_0.8fr_0.8fr_auto]"
                        >
                          <div className="flex items-center justify-between md:block">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-neutral-500">
                                #{index + 1}
                              </span>
                              <span className="font-medium text-neutral-900">
                                {label}
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-neutral-500 md:hidden">
                              {item.productType === "roller" ? "Roller" : "Zebra"} •{" "}
                              {item.motorized ? "Motorized" : "Manual"}
                            </div>
                          </div>
                          <div className="hidden md:flex items-center">
                            <span className="text-sm capitalize">
                              {item.productType}
                            </span>
                          </div>
                          <div className="hidden md:flex items-center">
                            <span className="text-sm">
                              {item.motorized ? "Motorized" : "Manual"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-2">
                            <span className="text-xs text-neutral-500 md:hidden">
                              Qty
                            </span>
                            <span className="text-sm font-medium">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex items-center justify-between md:justify-end gap-2">
                            <span className="text-xs text-neutral-500 md:hidden">
                              Line total
                            </span>
                            <span className="text-sm font-semibold">
                              {currency.format(linePrice)}
                            </span>
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-500 hover:text-red-500 hover:border-red-300 transition"
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="rounded-2xl border-neutral-200 bg-white">
            <CardContent className="p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Estimated project total
                </p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {currency.format(totalEstimate)}
                </p>
                <p className="mt-2 text-xs text-neutral-500 max-w-sm">
                  This is a rough estimate only. Final pricing may change based on exact
                  measurements, fabric choice, hardware, installation conditions, and taxes.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link href="/#contact">
                  <Button className="rounded-2xl inline-flex items-center gap-2">
                    Send this estimate to ShadeMaster
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
                <p className="text-xs text-neutral-500">
                  Mention this total when you contact us and we’ll confirm everything on a free
                  in-home visit.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
