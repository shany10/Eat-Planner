import { IngredientModel, SupplierModel } from "../src/models";
import { BusinessUnit, IngredientCategory } from "../src/types/business";
import { Types } from "mongoose";

type SupplierSeed = {
  name: string;
  productTypes: string[];
  deliveryLeadTimeDays: number;
  deliveryFee: number;
  minimumOrderAmount: number;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  active: boolean;
};

type IngredientSeed = {
  name: string;
  category: IngredientCategory;
  unit: BusinessUnit;
  orderUnit: BusinessUnit;
  purchasePrice: number;
  stockQuantity: number;
  minimumStock: number;
  averageDailyUsage: number;
  minimumOrderQuantity: number;
  supplierName: string;
  active: boolean;
};

const suppliers: SupplierSeed[] = [
  {
    name: "Metro Pro",
    productTypes: ["Epicerie seche", "Boissons", "Condiments"],
    deliveryLeadTimeDays: 2,
    deliveryFee: 19,
    minimumOrderAmount: 250,
    contactName: "Sophie Martin",
    email: "commandes@metro-pro.demo",
    phone: "01 44 20 10 10",
    address: "14 avenue des Artisans, 94120 Fontenay-sous-Bois",
    notes: "Catalogue large, franco de port possible selon volume.",
    active: true
  },
  {
    name: "TransGourmet",
    productTypes: ["Epicerie seche", "Surgeles", "Produits d entretien"],
    deliveryLeadTimeDays: 3,
    deliveryFee: 24,
    minimumOrderAmount: 300,
    contactName: "Karim Benali",
    email: "appro@transgourmet.demo",
    phone: "01 58 77 42 00",
    address: "8 rue du Froid, 93200 Saint-Denis",
    notes: "Bon suivi des ruptures et substitutions.",
    active: true
  },
  {
    name: "Pomona",
    productTypes: ["Fruits et legumes", "Produits laitiers", "Boulangerie"],
    deliveryLeadTimeDays: 2,
    deliveryFee: 18,
    minimumOrderAmount: 220,
    contactName: "Emma Leroy",
    email: "service.client@pomona.demo",
    phone: "01 49 39 90 00",
    address: "22 quai des Primeurs, 94550 Chevilly-Larue",
    notes: "Livraisons matinales pour produits frais.",
    active: true
  },
  {
    name: "Brake France",
    productTypes: ["Surgeles", "Boulangerie", "Epicerie seche"],
    deliveryLeadTimeDays: 4,
    deliveryFee: 29,
    minimumOrderAmount: 350,
    contactName: "Laura Petit",
    email: "orders@brake-france.demo",
    phone: "01 62 18 21 00",
    address: "5 route des Entrepots, 91220 Bretigny-sur-Orge",
    notes: "Commande a anticiper pour les produits surgeles.",
    active: true
  },
  {
    name: "PassionFroid",
    productTypes: ["Surgeles", "Poissons", "Viandes"],
    deliveryLeadTimeDays: 2,
    deliveryFee: 25,
    minimumOrderAmount: 280,
    contactName: "Nicolas Durand",
    email: "froid@passionfroid.demo",
    phone: "01 71 35 70 00",
    address: "3 allee des Glacieres, 95100 Argenteuil",
    notes: "Chaine du froid controlee, livraison avant 11h.",
    active: true
  },
  {
    name: "Frais & Local",
    productTypes: ["Fruits et legumes", "Produits laitiers"],
    deliveryLeadTimeDays: 1,
    deliveryFee: 12,
    minimumOrderAmount: 120,
    contactName: "Julie Moreau",
    email: "contact@frais-local.demo",
    phone: "01 86 90 15 22",
    address: "31 rue des Maraichers, 75020 Paris",
    notes: "Circuit court, disponibilites variables selon saison.",
    active: true
  },
  {
    name: "Boucherie Centrale Pro",
    productTypes: ["Viandes"],
    deliveryLeadTimeDays: 1,
    deliveryFee: 15,
    minimumOrderAmount: 180,
    contactName: "Antoine Caron",
    email: "pro@boucherie-centrale.demo",
    phone: "01 42 36 45 50",
    address: "11 rue du Marche, 75011 Paris",
    notes: "Pieces decoupees sur commande.",
    active: true
  },
  {
    name: "Maree Express",
    productTypes: ["Poissons"],
    deliveryLeadTimeDays: 1,
    deliveryFee: 22,
    minimumOrderAmount: 200,
    contactName: "Hugo Le Gall",
    email: "maree@express-demo.fr",
    phone: "01 53 70 25 80",
    address: "4 pavillon de la Mer, 94150 Rungis",
    notes: "Disponibilite dependante des arrivages du matin.",
    active: true
  },
  {
    name: "Primeur du Marche",
    productTypes: ["Fruits et legumes"],
    deliveryLeadTimeDays: 1,
    deliveryFee: 14,
    minimumOrderAmount: 140,
    contactName: "Nadia Rousseau",
    email: "commande@primeur-marche.demo",
    phone: "01 46 87 12 60",
    address: "18 allee des Halles, 94150 Rungis",
    notes: "Legumes de saison et calibres restauration.",
    active: true
  },
  {
    name: "Laiterie du Val",
    productTypes: ["Produits laitiers"],
    deliveryLeadTimeDays: 2,
    deliveryFee: 16,
    minimumOrderAmount: 160,
    contactName: "Manon Vidal",
    email: "commande@laiterie-val.demo",
    phone: "01 39 28 44 11",
    address: "19 chemin des Prairies, 78300 Poissy",
    notes: "Prix stables sur produits laitiers frais.",
    active: true
  },
  {
    name: "Fournil Distribution",
    productTypes: ["Boulangerie"],
    deliveryLeadTimeDays: 1,
    deliveryFee: 10,
    minimumOrderAmount: 90,
    contactName: "Romain Fabre",
    email: "livraison@fournil-distribution.demo",
    phone: "01 48 56 70 33",
    address: "7 rue du Four, 75018 Paris",
    notes: "Pain et viennoiserie livre avant le service du midi.",
    active: true
  },
  {
    name: "Epicerie Centrale",
    productTypes: ["Epicerie seche", "Condiments", "Boissons"],
    deliveryLeadTimeDays: 3,
    deliveryFee: 20,
    minimumOrderAmount: 240,
    contactName: "Claire Bernard",
    email: "achats@epicerie-centrale.demo",
    phone: "01 45 32 18 90",
    address: "26 boulevard des Stocks, 92110 Clichy",
    notes: "Bon rapport qualite prix sur produits secs.",
    active: true
  }
];

const ingredients: IngredientSeed[] = [
  { name: "Farine T55", category: "Epicerie seche", unit: "kg", orderUnit: "sac", purchasePrice: 1.25, stockQuantity: 18, minimumStock: 20, averageDailyUsage: 5, minimumOrderQuantity: 25, supplierName: "Fournil Distribution", active: true },
  { name: "Sucre de canne", category: "Epicerie seche", unit: "kg", orderUnit: "sac", purchasePrice: 2.1, stockQuantity: 12, minimumStock: 8, averageDailyUsage: 1.2, minimumOrderQuantity: 10, supplierName: "Epicerie Centrale", active: true },
  { name: "Beurre doux", category: "Produits laitiers", unit: "kg", orderUnit: "carton", purchasePrice: 8.9, stockQuantity: 6, minimumStock: 8, averageDailyUsage: 1.8, minimumOrderQuantity: 5, supplierName: "Laiterie du Val", active: true },
  { name: "Oeufs frais", category: "Produits laitiers", unit: "piece", orderUnit: "carton", purchasePrice: 0.28, stockQuantity: 80, minimumStock: 120, averageDailyUsage: 30, minimumOrderQuantity: 180, supplierName: "Frais & Local", active: true },
  { name: "Lait entier", category: "Produits laitiers", unit: "l", orderUnit: "carton", purchasePrice: 1.15, stockQuantity: 24, minimumStock: 18, averageDailyUsage: 3, minimumOrderQuantity: 12, supplierName: "Laiterie du Val", active: true },
  { name: "Creme liquide", category: "Produits laitiers", unit: "l", orderUnit: "carton", purchasePrice: 3.6, stockQuantity: 8, minimumStock: 10, averageDailyUsage: 2.5, minimumOrderQuantity: 12, supplierName: "Laiterie du Val", active: true },
  { name: "Riz basmati", category: "Epicerie seche", unit: "kg", orderUnit: "sac", purchasePrice: 2.75, stockQuantity: 15, minimumStock: 12, averageDailyUsage: 2.2, minimumOrderQuantity: 10, supplierName: "Metro Pro", active: true },
  { name: "Pates penne", category: "Epicerie seche", unit: "kg", orderUnit: "carton", purchasePrice: 1.9, stockQuantity: 10, minimumStock: 14, averageDailyUsage: 2.6, minimumOrderQuantity: 12, supplierName: "Epicerie Centrale", active: true },
  { name: "Tomates concassees", category: "Epicerie seche", unit: "kg", orderUnit: "boite", purchasePrice: 1.65, stockQuantity: 22, minimumStock: 18, averageDailyUsage: 3.5, minimumOrderQuantity: 12, supplierName: "Metro Pro", active: true },
  { name: "Huile d olive", category: "Condiments", unit: "l", orderUnit: "bouteille", purchasePrice: 7.8, stockQuantity: 9, minimumStock: 8, averageDailyUsage: 1.1, minimumOrderQuantity: 6, supplierName: "Epicerie Centrale", active: true },
  { name: "Sel fin", category: "Condiments", unit: "kg", orderUnit: "sac", purchasePrice: 0.75, stockQuantity: 7, minimumStock: 5, averageDailyUsage: 0.4, minimumOrderQuantity: 5, supplierName: "Metro Pro", active: true },
  { name: "Poivre noir", category: "Condiments", unit: "kg", orderUnit: "boite", purchasePrice: 16.5, stockQuantity: 1.4, minimumStock: 1, averageDailyUsage: 0.08, minimumOrderQuantity: 1, supplierName: "Epicerie Centrale", active: true },
  { name: "Chocolat noir 70 %", category: "Epicerie seche", unit: "kg", orderUnit: "carton", purchasePrice: 10.8, stockQuantity: 5, minimumStock: 6, averageDailyUsage: 0.9, minimumOrderQuantity: 5, supplierName: "TransGourmet", active: true },
  { name: "Levure boulangere", category: "Boulangerie", unit: "kg", orderUnit: "boite", purchasePrice: 5.4, stockQuantity: 2, minimumStock: 2, averageDailyUsage: 0.3, minimumOrderQuantity: 1, supplierName: "Fournil Distribution", active: true },
  { name: "Poulet fermier", category: "Viandes", unit: "kg", orderUnit: "carton", purchasePrice: 7.9, stockQuantity: 14, minimumStock: 12, averageDailyUsage: 3.8, minimumOrderQuantity: 10, supplierName: "Boucherie Centrale Pro", active: true },
  { name: "Boeuf hache", category: "Viandes", unit: "kg", orderUnit: "barquette", purchasePrice: 9.6, stockQuantity: 7, minimumStock: 10, averageDailyUsage: 3.2, minimumOrderQuantity: 8, supplierName: "Boucherie Centrale Pro", active: true },
  { name: "Saumon frais", category: "Poissons", unit: "kg", orderUnit: "barquette", purchasePrice: 18.5, stockQuantity: 5, minimumStock: 6, averageDailyUsage: 1.5, minimumOrderQuantity: 5, supplierName: "Maree Express", active: true },
  { name: "Cabillaud", category: "Poissons", unit: "kg", orderUnit: "barquette", purchasePrice: 15.8, stockQuantity: 3, minimumStock: 5, averageDailyUsage: 1.4, minimumOrderQuantity: 5, supplierName: "Maree Express", active: true },
  { name: "Pommes de terre", category: "Fruits et legumes", unit: "kg", orderUnit: "sac", purchasePrice: 1.05, stockQuantity: 35, minimumStock: 30, averageDailyUsage: 6, minimumOrderQuantity: 25, supplierName: "Primeur du Marche", active: true },
  { name: "Carottes", category: "Fruits et legumes", unit: "kg", orderUnit: "sac", purchasePrice: 1.2, stockQuantity: 16, minimumStock: 18, averageDailyUsage: 3.5, minimumOrderQuantity: 10, supplierName: "Frais & Local", active: true },
  { name: "Oignons jaunes", category: "Fruits et legumes", unit: "kg", orderUnit: "sac", purchasePrice: 0.95, stockQuantity: 20, minimumStock: 15, averageDailyUsage: 2.5, minimumOrderQuantity: 10, supplierName: "Frais & Local", active: true },
  { name: "Salade verte", category: "Fruits et legumes", unit: "piece", orderUnit: "barquette", purchasePrice: 0.85, stockQuantity: 24, minimumStock: 30, averageDailyUsage: 8, minimumOrderQuantity: 24, supplierName: "Frais & Local", active: true },
  { name: "Fromage rape", category: "Produits laitiers", unit: "kg", orderUnit: "carton", purchasePrice: 6.8, stockQuantity: 8, minimumStock: 7, averageDailyUsage: 1.6, minimumOrderQuantity: 5, supplierName: "Laiterie du Val", active: true },
  { name: "Mozzarella", category: "Produits laitiers", unit: "kg", orderUnit: "carton", purchasePrice: 7.2, stockQuantity: 6, minimumStock: 8, averageDailyUsage: 1.8, minimumOrderQuantity: 5, supplierName: "Laiterie du Val", active: true },
  { name: "Jambon blanc", category: "Viandes", unit: "kg", orderUnit: "barquette", purchasePrice: 8.4, stockQuantity: 5, minimumStock: 6, averageDailyUsage: 1.2, minimumOrderQuantity: 5, supplierName: "Boucherie Centrale Pro", active: true },
  { name: "Pain burger", category: "Boulangerie", unit: "piece", orderUnit: "carton", purchasePrice: 0.42, stockQuantity: 90, minimumStock: 80, averageDailyUsage: 35, minimumOrderQuantity: 60, supplierName: "Fournil Distribution", active: true },
  { name: "Sauce tomate", category: "Condiments", unit: "kg", orderUnit: "boite", purchasePrice: 2.35, stockQuantity: 12, minimumStock: 10, averageDailyUsage: 2, minimumOrderQuantity: 6, supplierName: "Metro Pro", active: true },
  { name: "Vinaigre balsamique", category: "Condiments", unit: "l", orderUnit: "bouteille", purchasePrice: 4.5, stockQuantity: 4, minimumStock: 3, averageDailyUsage: 0.35, minimumOrderQuantity: 6, supplierName: "Epicerie Centrale", active: true },
  { name: "Eau minerale", category: "Boissons", unit: "bouteille", orderUnit: "carton", purchasePrice: 0.38, stockQuantity: 180, minimumStock: 120, averageDailyUsage: 45, minimumOrderQuantity: 96, supplierName: "Metro Pro", active: true },
  { name: "Cafe en grains", category: "Boissons", unit: "kg", orderUnit: "sac", purchasePrice: 12.4, stockQuantity: 9, minimumStock: 6, averageDailyUsage: 0.7, minimumOrderQuantity: 5, supplierName: "Epicerie Centrale", active: true },
  { name: "Frites surgelees", category: "Surgeles", unit: "kg", orderUnit: "carton", purchasePrice: 2.2, stockQuantity: 18, minimumStock: 25, averageDailyUsage: 7, minimumOrderQuantity: 20, supplierName: "PassionFroid", active: true },
  { name: "Gants nitrile", category: "Produits d entretien", unit: "boite", orderUnit: "carton", purchasePrice: 6.5, stockQuantity: 6, minimumStock: 4, averageDailyUsage: 0.4, minimumOrderQuantity: 4, supplierName: "TransGourmet", active: true },
  { name: "Liquide vaisselle pro", category: "Produits d entretien", unit: "l", orderUnit: "carton", purchasePrice: 3.2, stockQuantity: 10, minimumStock: 8, averageDailyUsage: 0.8, minimumOrderQuantity: 6, supplierName: "TransGourmet", active: true }
];

export const businessSeeder = async (owner?: unknown) => {
  const ownerId = owner ? new Types.ObjectId(String(owner)) : null;
  console.log(`Seeding suppliers and ingredients${ownerId ? ` for user ${ownerId}` : ""}...`);

  const createdSuppliers = await SupplierModel.insertMany(suppliers.map(supplier => ({
    ...supplier,
    owner: ownerId
  })));
  const supplierByName = new Map(createdSuppliers.map(supplier => [supplier.name, supplier._id]));

  const missingSupplierNames = ingredients
    .map(ingredient => ingredient.supplierName)
    .filter(name => !supplierByName.has(name));

  if (missingSupplierNames.length > 0) {
    throw new Error(`Missing suppliers in seed: ${[...new Set(missingSupplierNames)].join(", ")}`);
  }

  const createdIngredients = await IngredientModel.insertMany(ingredients.map((ingredient) => {
    const supplier = supplierByName.get(ingredient.supplierName);

    return {
      name: ingredient.name,
      category: ingredient.category,
      unit: ingredient.unit,
      orderUnit: ingredient.orderUnit,
      purchasePrice: ingredient.purchasePrice,
      stockQuantity: ingredient.stockQuantity,
      minimumStock: ingredient.minimumStock,
      averageDailyUsage: ingredient.averageDailyUsage,
      minimumOrderQuantity: ingredient.minimumOrderQuantity,
      supplier,
      owner: ownerId,
      active: ingredient.active
    };
  }));

  console.log(`${createdSuppliers.length} suppliers created`);
  console.log(`${createdIngredients.length} ingredients created`);

  return {
    suppliers: createdSuppliers,
    ingredients: createdIngredients
  };
};
