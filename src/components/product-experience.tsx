"use client";

import { useState } from "react";
import { ActionForm } from "@/components/action-form";
import { addToCart } from "@/app/shop-actions";
import { formatMoney } from "@/lib/utils";

type Variant = {
  id: string;
  name: string;
  priceCents: number;
  salePriceCents: number | null;
  stockQty: number;
};

export function ProductGallery({
  images,
  name,
}: {
  images: { url: string; alt: string }[];
  name: string;
}) {
  const [selected, setSelected] = useState(0);
  const current = images[selected];
  return (
    <div>
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-night/10 bg-white">
        {current ? (
          <img
            src={current.url}
            alt={current.alt || name}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-center text-night/50">
            Product photo coming soon
          </span>
        )}
      </div>
      {current?.url.startsWith("/images/demo/") && (
        <p className="mt-3 text-sm text-night/60">
          Sample photo for demonstration; not actual product packaging.{" "}
          <a href="/image-credits" className="underline">
            Photo credits
          </a>
        </p>
      )}
      {images.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-3" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              aria-label={`View photo ${index + 1} of ${name}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-white p-1 ${selected === index ? "border-burgundy" : "border-transparent hover:border-night/20"}`}
            >
              <img
                src={image.url}
                alt=""
                className="h-full w-full rounded-lg object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProductPurchase({ variants }: { variants: Variant[] }) {
  const available = variants.filter((v) => v.stockQty > 0);
  const [variantId, setVariantId] = useState(
    available[0]?.id ?? variants[0]?.id ?? "",
  );
  const [quantity, setQuantity] = useState(1);
  const selected = variants.find((v) => v.id === variantId);
  if (!selected)
    return (
      <p className="rounded-xl bg-cream p-5">
        This product is currently unavailable.
      </p>
    );
  const limit = Math.min(99, selected.stockQty);
  const price = selected.salePriceCents ?? selected.priceCents;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-3" aria-live="polite">
        <p className="text-4xl font-bold tracking-tight">
          {formatMoney(price)}
        </p>
        {price < selected.priceCents && (
          <del className="pb-1 text-lg text-night/45">
            {formatMoney(selected.priceCents)}
          </del>
        )}
        <span className="pb-1 text-sm text-night/50">AUD</span>
      </div>
      <ActionForm
        action={addToCart}
        label="Add to cart"
        className="form-purchase space-y-5"
        disabled={!available.length}
      >
        <label className="block text-sm font-bold">
          Choose your size / variant
          <select
            className="input mt-2 font-normal"
            name="variantId"
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQuantity(1);
            }}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id} disabled={v.stockQty < 1}>
                {v.name}
                {v.stockQty < 1 ? " — Out of stock" : ""}
              </option>
            ))}
          </select>
        </label>
        {available.length > 0 ? (
          <div className="flex items-end justify-between gap-4">
            <label className="block text-sm font-bold">
              Quantity
              <input
                className="input mt-2 w-24 font-normal"
                type="number"
                name="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
                max={limit}
                required
              />
            </label>
            <p className="pb-3 text-sm font-medium text-emerald-700">
              ● In stock
              {selected.stockQty < 6 ? ` · Only ${selected.stockQty} left` : ""}
            </p>
          </div>
        ) : (
          <p className="rounded-xl bg-cream p-4 text-sm">
            Out of stock. Please check back soon.
          </p>
        )}
      </ActionForm>
    </div>
  );
}
