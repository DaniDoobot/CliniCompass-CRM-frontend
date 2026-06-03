const XLSX = require("xlsx");
const fs = require("fs");

// Create a workbook with a time value
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ["Phone", "Name", "Time"],
  ["123", "Javi", 0.5] // 0.5 = 12:00 in Excel
]);
// Set the cell format to time
ws["C2"].z = "hh:mm";
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
fs.writeFileSync("test.xlsx", buf);

// Read it back
const data = fs.readFileSync("test.xlsx");

const wb1 = XLSX.read(data, { type: "buffer" });
console.log("Default:", XLSX.utils.sheet_to_json(wb1.Sheets.Sheet1, { header: 1 }));

const wb2 = XLSX.read(data, { type: "buffer" });
console.log("Raw false:", XLSX.utils.sheet_to_json(wb2.Sheets.Sheet1, { header: 1, raw: false }));

const wb3 = XLSX.read(data, { type: "buffer", cellDates: true });
console.log("Cell dates:", XLSX.utils.sheet_to_json(wb3.Sheets.Sheet1, { header: 1 }));
