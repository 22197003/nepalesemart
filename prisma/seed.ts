import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const img = (seed: string) =>
  `https://placehold.co/800x800/F5EBDD/7A1F2B?text=${encodeURIComponent(seed)}`;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");

const categories: { name: string; subs?: string[]; featured?: boolean }[] = [
  {
    name: "Groceries",
    subs: ["Rice", "Lentils", "Flour", "Noodles", "Cooking Essentials"],
    featured: true,
  },
  { name: "Spices & Masala", featured: true },
  { name: "Pickles & Chutneys", featured: true },
  { name: "Snacks", featured: true },
  { name: "Sweets", featured: true },
  { name: "Beverages", featured: true },
  { name: "Ready-to-Eat", featured: true },
  { name: "Frozen Foods", featured: true },
  { name: "Fresh Foods" },
  { name: "Festival & Puja", featured: true },
  { name: "Clothing & Accessories" },
  { name: "Gifts", featured: true },
  { name: "Household" },
  { name: "Personal Care" },
];

type P = {
  name: string;
  cat: string;
  sub?: string;
  brand?: string;
  short: string;
  price: number;
  sale?: number;
  variants: [name: string, price: number, stock: number, grams: number][];
  tags: string[];
  storage?: "AMBIENT" | "REFRIGERATED" | "FROZEN";
  veg?: boolean;
  vegan?: boolean;
  gf?: boolean;
  halal?: boolean;
  spice?: number;
  allergens?: string[];
  ingredients?: string;
  flags?: ("featured" | "best" | "new")[];
  origin?: string;
};
const products: P[] = [
  {
    name: "Wai Wai Instant Noodles (Chicken)",
    cat: "Groceries",
    sub: "Noodles",
    brand: "Wai Wai",
    short: "Nepal's favourite instant noodles – eat as soup or sukha.",
    price: 1.5,
    variants: [
      ["Single pack", 1.5, 200, 75],
      ["Pack of 5", 6.9, 120, 375],
      ["Carton of 30", 38, 30, 2250],
    ],
    tags: ["noodles", "wai wai", "instant", "chiura"],
    spice: 2,
    allergens: ["Wheat", "Soy"],
    flags: ["best", "featured"],
    origin: "Nepal",
  },
  {
    name: "Gundruk (Fermented Leafy Greens)",
    cat: "Groceries",
    sub: "Cooking Essentials",
    brand: "Himalayan Pantry",
    short: "Tangy dried fermented greens for soups and achar.",
    price: 7.9,
    variants: [
      ["100g", 7.9, 60, 100],
      ["250g", 17.5, 40, 250],
    ],
    tags: ["gundruk", "fermented", "soup"],
    veg: true,
    vegan: true,
    gf: true,
    flags: ["best"],
    origin: "Nepal",
  },
  {
    name: "Timur (Sichuan Pepper)",
    cat: "Spices & Masala",
    brand: "Himalayan Pantry",
    short: "Citrusy, numbing Himalayan pepper – essential for achar and momo.",
    price: 6.5,
    variants: [
      ["25g", 6.5, 80, 25],
      ["50g", 11.9, 50, 50],
      ["100g", 21, 25, 100],
    ],
    tags: ["timur", "pepper", "spice", "masala"],
    veg: true,
    vegan: true,
    gf: true,
    flags: ["featured", "best"],
    origin: "Nepal",
  },
  {
    name: "Everest Meat Masala",
    cat: "Spices & Masala",
    brand: "Everest",
    short: "Classic blend for curries and sekuwa.",
    price: 4.5,
    variants: [
      ["100g", 4.5, 90, 100],
      ["500g", 17, 30, 500],
    ],
    tags: ["masala", "meat", "curry"],
    veg: true,
    vegan: true,
    spice: 3,
    flags: ["featured"],
  },
  {
    name: "Nepali Black Tea (Ilam)",
    cat: "Beverages",
    brand: "Ilam Tea Co.",
    short: "Hand-picked orthodox black tea from the hills of Ilam.",
    price: 12.9,
    variants: [
      ["100g loose leaf", 12.9, 55, 100],
      ["250g loose leaf", 27, 30, 250],
    ],
    tags: ["tea", "ilam", "chiya"],
    veg: true,
    vegan: true,
    gf: true,
    flags: ["new", "featured"],
    origin: "Nepal",
  },
  {
    name: "Chiura (Beaten Rice)",
    cat: "Groceries",
    sub: "Rice",
    brand: "Himalayan Pantry",
    short: "Flattened rice – perfect with achar, curry or yoghurt.",
    price: 4.9,
    variants: [
      ["500g", 4.9, 100, 500],
      ["1kg", 8.9, 60, 1000],
    ],
    tags: ["chiura", "beaten rice", "chiwda"],
    veg: true,
    vegan: true,
    gf: true,
    flags: ["best"],
  },
  {
    name: "Sel Roti Mix",
    cat: "Sweets",
    brand: "Gharelu",
    short:
      "Ready mix for traditional ring-shaped rice bread, a festival favourite.",
    price: 8.5,
    variants: [["400g", 8.5, 45, 400]],
    tags: ["sel roti", "festival", "tihar", "dashain"],
    veg: true,
    flags: ["new", "featured"],
    allergens: ["May contain nuts"],
  },
  {
    name: "Frozen Chicken Momo (24 pcs)",
    cat: "Frozen Foods",
    brand: "Momo Ghar",
    short: "Hand-folded chicken dumplings, steam or fry in minutes.",
    price: 16.9,
    sale: 14.9,
    variants: [
      ["24 pieces", 16.9, 70, 720],
      ["48 pieces", 31.9, 35, 1440],
    ],
    tags: ["momo", "dumplings", "frozen", "chicken"],
    storage: "FROZEN",
    halal: true,
    spice: 1,
    allergens: ["Wheat", "Soy"],
    flags: ["best", "featured"],
  },
  {
    name: "Frozen Veg Momo (24 pcs)",
    cat: "Frozen Foods",
    brand: "Momo Ghar",
    short: "Cabbage, paneer and coriander filling.",
    price: 15.9,
    variants: [["24 pieces", 15.9, 50, 720]],
    tags: ["momo", "veg", "frozen"],
    storage: "FROZEN",
    veg: true,
    allergens: ["Wheat", "Milk"],
    flags: ["new"],
  },
  {
    name: "Mustard Oil Achar (Mixed Pickle)",
    cat: "Pickles & Chutneys",
    brand: "Gharelu",
    short: "Tangy-spicy mixed vegetable pickle in mustard oil.",
    price: 9.9,
    variants: [
      ["250g", 9.9, 60, 250],
      ["500g", 17.9, 30, 500],
    ],
    tags: ["achar", "pickle", "chutney"],
    veg: true,
    vegan: true,
    spice: 4,
    flags: ["featured", "best"],
  },
  {
    name: "Masoor Dal (Red Lentils)",
    cat: "Groceries",
    sub: "Lentils",
    brand: "Himalayan Pantry",
    short: "Everyday dal bhat staple.",
    price: 5.5,
    variants: [
      ["1kg", 5.5, 100, 1000],
      ["5kg", 24, 25, 5000],
    ],
    tags: ["dal", "lentils", "masoor"],
    veg: true,
    vegan: true,
    gf: true,
  },
  {
    name: "Aged Basmati Rice",
    cat: "Groceries",
    sub: "Rice",
    brand: "Himalayan Pantry",
    short: "Long-grain, fragrant, perfect for dal bhat.",
    price: 14.9,
    variants: [
      ["1kg", 6.9, 120, 1000],
      ["5kg", 29, 40, 5000],
      ["10kg", 54, 20, 10000],
    ],
    tags: ["rice", "basmati", "bhat"],
    veg: true,
    vegan: true,
    gf: true,
    flags: ["best"],
  },
  {
    name: "Chhurpi (Dried Yak Cheese Chew)",
    cat: "Snacks",
    brand: "Himalayan Pantry",
    short: "Hard, long-lasting traditional cheese snack.",
    price: 9.5,
    variants: [["100g", 9.5, 40, 100]],
    tags: ["chhurpi", "cheese", "snack", "dog chew"],
    veg: true,
    gf: true,
    allergens: ["Milk"],
    flags: ["new"],
  },
  {
    name: "Lalmohan & Barfi Sweet Box",
    cat: "Sweets",
    brand: "Mithai Ghar",
    short: "Assorted Nepali sweets – ideal for gifting at Tihar and Dashain.",
    price: 24.9,
    variants: [
      ["Small box (12)", 24.9, 25, 500],
      ["Large box (24)", 44.9, 15, 1000],
    ],
    tags: ["sweets", "mithai", "gift", "tihar"],
    storage: "REFRIGERATED",
    veg: true,
    allergens: ["Milk", "Nuts", "Wheat"],
    flags: ["featured", "new"],
  },
  {
    name: "Puja Thali Set",
    cat: "Festival & Puja",
    short: "Brass-finish thali with diyo and incense for puja.",
    price: 34.9,
    variants: [["Standard", 34.9, 18, 700]],
    tags: ["puja", "thali", "festival"],
    flags: ["featured"],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "true")
    throw new Error(
      "Demo seed is disabled in production. Use npm run db:admin to create an owner without demo data.",
    );
  console.info("Seeding…");
  // Site settings
  const settings: Record<string, object> = {
    brand: { name: "Nepali Ghar Australia" },
    tax: {
      enabled: true,
      ratePercent: 10,
      pricesIncludeTax: true,
      label: "GST",
    },
    announcement: {
      text: "Authentic Nepali products delivered across Australia",
      active: true,
    },
  };
  for (const [key, value] of Object.entries(settings))
    await db.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

  // Staff users
  const adminHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!12345",
    12,
  );
  const owner = await db.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL ?? "owner@example.com" },
    update: {},
    create: {
      email: process.env.SEED_ADMIN_EMAIL ?? "owner@example.com",
      passwordHash: adminHash,
      firstName: "Store",
      lastName: "Owner",
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
    },
  });
  await db.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      email: "staff@example.com",
      passwordHash: adminHash,
      firstName: "Sita",
      lastName: "Staff",
      role: "STAFF",
      emailVerified: new Date(),
    },
  });

  // Customers (demo)
  const custHash = await bcrypt.hash("Customer!12345", 12);
  const customers = [];
  for (const [f, l, e] of [
    ["Aarav", "Sharma", "aarav@example.com"],
    ["Priya", "Thapa", "priya@example.com"],
    ["Bikash", "Rai", "bikash@example.com"],
  ]) {
    customers.push(
      await db.user.upsert({
        where: { email: e! },
        update: {},
        create: {
          email: e!,
          passwordHash: custHash,
          firstName: f!,
          lastName: l!,
          emailVerified: new Date(),
        },
      }),
    );
  }

  // Categories
  const catIds: Record<string, string> = {};
  for (const [i, c] of categories.entries()) {
    const parent = await db.category.upsert({
      where: { slug: slug(c.name) },
      update: {},
      create: {
        name: c.name,
        slug: slug(c.name),
        sortOrder: i,
        isFeatured: !!c.featured,
        imageUrl: img(c.name),
      },
    });
    catIds[c.name] = parent.id;
    for (const [j, s] of (c.subs ?? []).entries()) {
      const sub = await db.category.upsert({
        where: { slug: slug(s) },
        update: {},
        create: { name: s, slug: slug(s), parentId: parent.id, sortOrder: j },
      });
      catIds[s] = sub.id;
    }
  }

  // Brands
  const brandIds: Record<string, string> = {};
  for (const b of new Set(
    products.map((p) => p.brand).filter(Boolean) as string[],
  )) {
    brandIds[b] = (
      await db.brand.upsert({
        where: { slug: slug(b) },
        update: {},
        create: { name: b, slug: slug(b) },
      })
    ).id;
  }

  // Products + variants
  const cents = (n: number) => Math.round(n * 100);
  const variantIds: {
    productId: string;
    variantId: string;
    name: string;
    price: number;
    sku: string;
  }[] = [];
  for (const p of products) {
    const s = slug(p.name);
    const prod = await db.product.upsert({
      where: { slug: s },
      update: {},
      create: {
        sku: `NG-${s.toUpperCase().slice(0, 14)}`,
        name: p.name,
        slug: s,
        shortDescription: p.short,
        description: p.short,
        status: "ACTIVE",
        categoryId: catIds[p.cat]!,
        subcategoryId: p.sub ? catIds[p.sub] : null,
        brandId: p.brand ? brandIds[p.brand] : null,
        tags: p.tags,
        productType:
          p.cat.includes("Festival") || p.cat === "Gifts" ? "cultural" : "food",
        priceCents: cents(p.price),
        salePriceCents: p.sale ? cents(p.sale) : null,
        costPriceCents: cents(p.price * 0.55),
        isTaxable: true,
        weightGrams: p.variants[0]![3],
        storageType: p.storage ?? "AMBIENT",
        allergens: p.allergens ?? [],
        ingredients: p.ingredients,
        isVegetarian: p.veg ?? null,
        isVegan: p.vegan ?? null,
        isGlutenFree: p.gf ?? null,
        isHalal: p.halal ?? null,
        spiceLevel: p.spice ?? null,
        countryOfOrigin: p.origin ?? null,
        isFeatured: !!p.flags?.includes("featured"),
        isBestseller: !!p.flags?.includes("best"),
        isNewArrival: !!p.flags?.includes("new"),
        soldCount: Math.floor(Math.random() * 200),
        images: {
          create: [
            { url: img(p.name), alt: p.name, isThumbnail: true, sortOrder: 0 },
            {
              url: img(`${p.name} 2`),
              alt: `${p.name} – pack view`,
              sortOrder: 1,
            },
          ],
        },
        variants: {
          create: p.variants.map(([name, price, stock, grams], i) => ({
            sku: `NG-${s.toUpperCase().slice(0, 10)}-${i + 1}`,
            name,
            priceCents: cents(price),
            salePriceCents: p.sale && i === 0 ? cents(p.sale) : null,
            stockQty: stock,
            weightGrams: grams,
            sortOrder: i,
          })),
        },
      },
      include: { variants: true },
    });
    for (const v of prod.variants) {
      variantIds.push({
        productId: prod.id,
        variantId: v.id,
        name: v.name,
        price: v.salePriceCents ?? v.priceCents,
        sku: v.sku,
      });
      const has = await db.inventoryTransaction.count({
        where: { variantId: v.id },
      });
      if (!has)
        await db.inventoryTransaction.create({
          data: {
            variantId: v.id,
            delta: v.stockQty,
            balanceAfter: v.stockQty,
            reason: "INITIAL",
            createdById: owner.id,
          },
        });
    }
  }

  // Delivery
  const std = await db.shippingMethod.upsert({
    where: { code: "standard" },
    update: {},
    create: {
      code: "standard",
      name: "Standard Delivery",
      minDays: 3,
      maxDays: 7,
      sortOrder: 0,
    },
  });
  const exp = await db.shippingMethod.upsert({
    where: { code: "express" },
    update: {},
    create: {
      code: "express",
      name: "Express Delivery",
      minDays: 1,
      maxDays: 3,
      sortOrder: 1,
    },
  });
  await db.shippingMethod.upsert({
    where: { code: "pickup" },
    update: {},
    create: {
      code: "pickup",
      name: "Local Pickup (Melbourne)",
      type: "PICKUP",
      description: "Collect from our store – address sent after confirmation.",
      sortOrder: 2,
      isActive: false,
    },
  });
  const zones: [string, string[], number, number][] = [
    ["Melbourne Metro", ["3000-3207", "3800-3999"], 800, 1500],
    ["Victoria (Regional)", ["VIC"], 1000, 1800],
    ["East Coast (NSW, QLD, ACT)", ["NSW", "QLD", "ACT"], 1200, 2000],
    ["Rest of Australia", ["SA", "WA", "TAS", "NT"], 1500, 2500],
  ];
  if ((await db.shippingZone.count()) === 0) {
    for (const [i, [name, areas, stdP, expP]] of zones.entries()) {
      const z = await db.shippingZone.create({
        data: {
          name,
          sortOrder: i,
          states: areas.filter((a) => /^[A-Z]{2,3}$/.test(a)),
          postcodes: areas.filter((a) => /^\d/.test(a)),
        },
      });
      await db.shippingRate.createMany({
        data: [
          {
            zoneId: z.id,
            methodId: std.id,
            priceCents: stdP,
            freeThresholdCents: 10000,
          }, // free over $100 – editable in admin
          { zoneId: z.id, methodId: exp.id, priceCents: expP },
        ],
      });
    }
  }

  // Coupons
  for (const c of [
    {
      code: "WELCOME10",
      type: "PERCENTAGE" as const,
      value: 10,
      perCustomerLimit: 1,
      description: "10% off your first order",
    },
    {
      code: "NEPAL20",
      type: "FIXED_AMOUNT" as const,
      value: 2000,
      minOrderCents: 12000,
      description: "$20 off orders over $120",
    },
    {
      code: "FREESHIP",
      type: "FIXED_AMOUNT" as const,
      value: 0,
      freeShipping: true,
      minOrderCents: 5000,
      description: "Free shipping over $50",
    },
  ])
    await db.coupon.upsert({ where: { code: c.code }, update: {}, create: c });

  // Homepage CMS
  if ((await db.homepageSection.count()) === 0) {
    const sections = [
      "FEATURED_CATEGORIES",
      "BEST_SELLERS",
      "NEW_ARRIVALS",
      "READY_TO_EAT",
      "WHY_US",
      "PROMO",
      "TESTIMONIALS",
      "NEWSLETTER",
    ];
    await db.homepageSection.createMany({
      data: sections.map((type, i) => ({
        type,
        sortOrder: i,
        title: type.replace(/_/g, " ").toLowerCase(),
      })),
    });
    await db.banner.create({
      data: {
        placement: "HERO",
        title: "Authentic Nepal, Delivered to Your Door",
        subtitle:
          "Shop your favourite Nepali foods, groceries, snacks and cultural products across Australia.",
        ctaLabel: "Shop Now",
        ctaHref: "/shop",
        imageUrl: img("Hero"),
      },
    });
  }

  // Demo orders + reviews
  if ((await db.order.count()) === 0) {
    for (const [i, c] of customers.entries()) {
      const picks = variantIds.slice(i * 3, i * 3 + 3);
      const subtotal = picks.reduce((s, v) => s + v.price, 0);
      const order = await db.order.create({
        data: {
          orderNumber: `NG-10000${i + 1}`,
          userId: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          status: "DELIVERED",
          paymentStatus: "PAID",
          shipLine1: "1 Example St",
          shipSuburb: "Melbourne",
          shipState: "VIC",
          shipPostcode: "3000",
          subtotalCents: subtotal,
          shippingCents: 0,
          taxCents: Math.round(subtotal / 11),
          totalCents: subtotal,
          shippingMethodName: "Standard Delivery",
          items: {
            create: picks.map((v) => ({
              productId: v.productId,
              variantId: v.variantId,
              name: v.sku,
              variantName: v.name,
              sku: v.sku,
              unitPriceCents: v.price,
              quantity: 1,
              lineTotalCents: v.price,
            })),
          },
          events: {
            create: [
              "Order placed",
              "Payment confirmed",
              "Order confirmed",
              "Order packed",
              "Order shipped",
              "Out for delivery",
              "Delivered",
            ].map((title) => ({ title })),
          },
          payments: {
            create: {
              provider: "stripe",
              providerPaymentId: `pi_demo_${i}`,
              amountCents: subtotal,
              status: "PAID",
            },
          },
        },
      });
      const first = picks[0]!;
      await db.review.create({
        data: {
          productId: first.productId,
          userId: c.id,
          orderId: order.id,
          rating: 5 - (i % 2),
          title: "Tastes like home",
          body: "Authentic flavour and arrived well packed. Will order again!",
          status: "APPROVED",
          isFeatured: i === 0,
        },
      });
    }
    // refresh rating aggregates
    for (const r of await db.review.groupBy({
      by: ["productId"],
      _avg: { rating: true },
      _count: true,
      where: { status: "APPROVED" },
    }))
      await db.product.update({
        where: { id: r.productId },
        data: { ratingAvg: r._avg.rating ?? 0, ratingCount: r._count },
      });
  }
  console.info("Done. Admin:", owner.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
