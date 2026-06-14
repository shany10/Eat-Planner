import "dotenv/config";
import { connectMongoose, closeMongoose } from "../src/db/mangoose";
import { businessSeeder } from "./businessSeeder";
import { userSeeder } from "./userSeeder";
import { IngredientModel, PurchaseOrderModel, SupplierModel, UserModel } from "../src/models";

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment variables.");
  process.exit(1);
}

const MONGO_URI = process.env.MONGODB_URI;

async function clearDatabase() {
  console.log("\nClearing existing data...");

  await PurchaseOrderModel.deleteMany({});
  await IngredientModel.deleteMany({});
  await SupplierModel.deleteMany({});
  await UserModel.deleteMany({});

  console.log("Database cleared\n");
}

async function seedDatabase() {
  try {
    console.log("Starting database seeding...\n");
    console.log(`Connecting to MongoDB: ${MONGO_URI}`);

    await connectMongoose(MONGO_URI);
    console.log("Connected to MongoDB\n");

    await clearDatabase();

    const users = await userSeeder();
    const business = await businessSeeder();

    console.log("\nDatabase seeding completed successfully!");
    console.log("\nSummary:");
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Suppliers: ${business.suppliers.length}`);
    console.log(`   - Ingredients: ${business.ingredients.length}`);
    console.log("\nDemo accounts:");
    console.log(`   Admin: ${process.env.ADMIN_EMAIL ?? "admin@eatplanner.local"} / ${process.env.ADMIN_PASSWORD ?? "Admin123!"}`);
    console.log("   Manager: jean.manager@eatplanner.local / Manager123!");
    console.log("   Manager: camille.manager@eatplanner.local / Manager123!");
  } catch (error) {
    console.error("\nError seeding database:", error);
    process.exit(1);
  } finally {
    await closeMongoose();
    console.log("\nDisconnected from MongoDB");
    process.exit(0);
  }
}

seedDatabase();
