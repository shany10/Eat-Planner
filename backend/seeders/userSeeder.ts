import { UserModel } from "../src/models";

export const userSeeder = async () => {
  const adminFirstname = process.env.ADMIN_FIRSTNAME ?? "Admin";
  const adminLastname = process.env.ADMIN_LASTNAME ?? "System";
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@eatplanner.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";

  const users = [
    {
      firstname: adminFirstname,
      lastname: adminLastname,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
      active: true
    },
    {
      firstname: "Jean",
      lastname: "Manager",
      email: "jean.manager@eatplanner.local",
      password: "Manager123!",
      role: "manager",
      active: true
    },
    {
      firstname: "Camille",
      lastname: "Cuisine",
      email: "camille.manager@eatplanner.local",
      password: "Manager123!",
      role: "manager",
      active: true
    }
  ];

  console.log("Seeding users...");

  const createdUsers = [];
  for (const userData of users) {
    const user = await UserModel.create(userData);
    createdUsers.push(user);
  }

  console.log(`${createdUsers.length} users created`);

  return createdUsers;
};
