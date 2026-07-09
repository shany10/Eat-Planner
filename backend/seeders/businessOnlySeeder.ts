import "dotenv/config";
import { connectMongoose, closeMongoose } from "../src/db/mangoose";
import { DishModel, IngredientModel, PurchaseOrderModel, SupplierModel, UserModel } from "../src/models";
import { businessSeeder } from "./businessSeeder";
import { ensureUserAccessBootstrap } from "../src/services/userAccessBootstrap";

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

async function seedBusinessData() {
  try {
    console.log("Starting business data seeding...");
    await connectMongoose(process.env.MONGODB_URI);

    await PurchaseOrderModel.deleteMany({});
    await DishModel.deleteMany({});
    await IngredientModel.deleteMany({});
    await SupplierModel.deleteMany({});

    const users = await UserModel.find({ active: true }).exec();
    const businessResults = [];

    if (users.length === 0) {
      businessResults.push(await businessSeeder());
    } else {
      for (const user of users) {
        businessResults.push(await businessSeeder(user._id));
      }
    }

    const business = {
      suppliers: businessResults.flatMap(result => result.suppliers),
      ingredients: businessResults.flatMap(result => result.ingredients),
      dishes: businessResults.flatMap(result => result.dishes),
      orders: businessResults.flatMap(result => result.orders)
    };

    // Seeding wipes the Supplier collection, which also removes the demo
    // supplier-portal entry. Re-run the access bootstrap so the supplier
    // account (login + linked Supplier) is restored after every seed.
    await ensureUserAccessBootstrap();

    console.log("\nBusiness demo data ready:");
    console.log(`   - Suppliers: ${business.suppliers.length}`);
    console.log(`   - Ingredients: ${business.ingredients.length}`);
    console.log(`   - Dishes: ${business.dishes.length}`);
    console.log(`   - Purchase orders: ${business.orders.length}`);
    console.log(`   - Supplier portal: ${process.env.SUPPLIER_PORTAL_EMAIL ?? "tovincentngo@gmail.com"} / ${process.env.SUPPLIER_PORTAL_PASSWORD ?? "Fournisseur123!"}`);
  } catch (error) {
    console.error("\nError seeding business data:", error);
    process.exit(1);
  } finally {
    await closeMongoose();
    process.exit(0);
  }
}

void seedBusinessData();
