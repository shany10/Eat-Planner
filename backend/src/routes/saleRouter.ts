import { Router } from "express";
import { authMiddleware, roleMiddleware, validateMiddleware } from "../middlewares";
import { createSaleBody, CreateSaleInput, importSalesCsvBody, ImportSalesCsvInput } from "../schemas";
import { DishModel, SaleModel } from "../models";
import { listDishProfitability } from "../services/profitabilityService";
import { buildAccountScope, loadRequestUser } from "../services/accountScopeService";
import { startOfDay } from "../services/serviceUtils";

const saleRouter = Router();

type CsvSaleRow = {
  rowNumber: number;
  serviceDate: Date;
  dishName: string;
  quantity: number;
  unitPrice?: number;
};

function normalizeCsvHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeDishName(value: string) {
  return value.trim().toLowerCase();
}

function splitCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }

    if (character === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

function detectDelimiter(headerLine: string) {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function parseCsvNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseCsvDate(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const frenchDate = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);

  if (frenchDate) {
    const [, day, month, year] = frenchDate;
    return startOfDay(new Date(Number(year), Number(month) - 1, Number(day)));
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function getCsvValue(row: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[alias];
    if (value) return value;
  }

  return "";
}

function parseSalesCsv(csv: string) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [] as CsvSaleRow[], errors: ["Le fichier CSV doit contenir un header et au moins une ligne."] };
  }

  const headerLine = lines[0] ?? "";
  const delimiter = detectDelimiter(headerLine);
  const headers = splitCsvLine(headerLine, delimiter).map(normalizeCsvHeader);
  const rows: CsvSaleRow[] = [];
  const errors: string[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const values = splitCsvLine(line, delimiter);
    const row = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
      acc[header] = values[headerIndex] ?? "";
      return acc;
    }, {});

    const serviceDate = parseCsvDate(getCsvValue(row, ["date", "servicedate", "datedevente", "datevente"]));
    const dishName = getCsvValue(row, ["plat", "dish", "dishname", "platvendu", "nomduplat"]);
    const quantity = parseCsvNumber(getCsvValue(row, ["quantite", "quantity", "qte", "nombre"]));
    const unitPrice = parseCsvNumber(getCsvValue(row, ["prix", "unitprice", "prixvente", "prixdevente", "prixttc"]));

    if (!serviceDate) {
      errors.push(`Ligne ${rowNumber}: date invalide.`);
      return;
    }

    if (!dishName) {
      errors.push(`Ligne ${rowNumber}: plat manquant.`);
      return;
    }

    if (!quantity || quantity <= 0) {
      errors.push(`Ligne ${rowNumber}: quantite invalide.`);
      return;
    }

    const parsedRow: CsvSaleRow = {
      rowNumber,
      serviceDate,
      dishName,
      quantity: Math.round(quantity)
    };

    if (unitPrice !== undefined) {
      parsedRow.unitPrice = unitPrice;
    }

    rows.push(parsedRow);
  });

  return { rows, errors };
}

saleRouter.get("/", authMiddleware, async (req, res): Promise<void> => {
  const user = await loadRequestUser(req);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const sales = await SaleModel.find(buildAccountScope(user))
    .populate("items.dish", "name category")
    .sort({ serviceDate: -1, created_at: -1 })
    .exec();

  res.json(sales);
});

saleRouter.post(
  "/",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: createSaleBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const payload = req.body as CreateSaleInput;
    const dishIds = [...new Set(payload.items.map((item) => item.dish))];
    const dishes = await DishModel.find(
      buildAccountScope(user, { _id: { $in: dishIds } })
    ).exec();

    if (dishes.length !== dishIds.length) {
      res.status(404).json({ error: "One or more dishes were not found" });
      return;
    }

    const profitability = await listDishProfitability(dishes, user);
    const priceMap = new Map(profitability.map((item) => [
      item.dishId,
      item.actualPriceIncludingTax > 0 ? item.actualPriceIncludingTax : item.suggestedPriceIncludingTax
    ]));

    const items = payload.items.map((item) => ({
      dish: item.dish,
      quantity: item.quantity,
      unitPrice: item.unitPrice ?? priceMap.get(item.dish) ?? 0
    }));

    const totalAmount = Math.round(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 100) / 100;

    const sale = await SaleModel.create({
      serviceDate: new Date(payload.serviceDate),
      notes: payload.notes,
      items,
      totalAmount,
      owner: user._id,
      createdBy: req.user?.id ?? null
    });

    const created = await SaleModel.findById(sale._id).populate("items.dish", "name category").exec();
    res.status(201).json(created);
  }
);

saleRouter.post(
  "/import-csv",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  validateMiddleware({ body: importSalesCsvBody }),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { csv } = req.body as ImportSalesCsvInput;
    const parsed = parseSalesCsv(csv);
    const dishes = await DishModel.find(buildAccountScope(user)).exec();
    const dishByName = new Map(dishes.map((dish) => [normalizeDishName(dish.name), dish]));
    const validRows: Array<CsvSaleRow & { dishId: string }> = [];
    const errors = [...parsed.errors];

    for (const row of parsed.rows) {
      const dish = dishByName.get(normalizeDishName(row.dishName));
      if (!dish) {
        errors.push(`Ligne ${row.rowNumber}: plat "${row.dishName}" introuvable.`);
        continue;
      }

      validRows.push({
        ...row,
        dishId: String(dish._id)
      });
    }

    const usedDishIds = [...new Set(validRows.map((row) => row.dishId))];
    const usedDishes = dishes.filter((dish) => usedDishIds.includes(String(dish._id)));
    const profitability = await listDishProfitability(usedDishes, user);
    const priceMap = new Map(profitability.map((item) => [
      item.dishId,
      item.actualPriceIncludingTax > 0 ? item.actualPriceIncludingTax : item.suggestedPriceIncludingTax
    ]));

    const groupedRows = new Map<string, typeof validRows>();
    for (const row of validRows) {
      const dateKey = row.serviceDate.toISOString().slice(0, 10);
      groupedRows.set(dateKey, [...(groupedRows.get(dateKey) ?? []), row]);
    }

    let createdSales = 0;
    let importedRows = 0;

    for (const [dateKey, rows] of groupedRows) {
      const items = rows.map((row) => ({
        dish: row.dishId,
        quantity: row.quantity,
        unitPrice: row.unitPrice ?? priceMap.get(row.dishId) ?? 0
      }));
      const totalAmount = Math.round(items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) * 100) / 100;

      await SaleModel.create({
        serviceDate: new Date(`${dateKey}T00:00:00.000Z`),
        notes: "Import CSV",
        items,
        totalAmount,
        owner: user._id,
        createdBy: req.user?.id ?? null
      });

      createdSales += 1;
      importedRows += rows.length;
    }

    res.status(201).json({
      importedRows,
      createdSales,
      skippedRows: errors.length,
      errors: errors.slice(0, 20)
    });
  }
);

saleRouter.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  async (req, res): Promise<void> => {
    const user = await loadRequestUser(req);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const deleted = await SaleModel.findOneAndDelete(
      buildAccountScope(user, { _id: req.params.id })
    ).exec();
    if (!deleted) {
      res.status(404).json({ error: "Sale not found" });
      return;
    }

    res.status(204).send();
  }
);

export { saleRouter };
