import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { dataUploadService } from "../../../../utils/dataUploadService";

type Category = "exhibitors" | "sponsors" | "hosted-buyers" | "speakers";

interface CategoryValidation {
  requiredFields: string[];
  validateRow: (row: any) => string | null;
}

const categoryValidations: Record<Category, CategoryValidation> = {
  exhibitors: {
    requiredFields: [
      "company_name", "contact_person", "email", "phone",
      "booth_number", "company_description", "website", "logo_url"
    ],
    validateRow: (row: any) => {
      if (!row.email || !row.email.includes("@")) {
        return "Invalid email address";
      }
      if (!row.company_name || row.company_name.trim().length < 2) {
        return "Company name must be at least 2 characters";
      }
      return null;
    }
  },
  sponsors: {
    requiredFields: [
      "company_name", "contact_person", "email", "phone",
      "sponsorship_level", "company_description", "website", "logo_url"
    ],
    validateRow: (row: any) => {
      if (!row.email || !row.email.includes("@")) {
        return "Invalid email address";
      }
      if (!row.sponsorship_level) {
        return "Sponsorship level is required";
      }
      return null;
    }
  },
  "hosted-buyers": {
    requiredFields: [
      "full_name", "company", "job_title", "email", "phone",
      "country", "industry", "bio", "profile_image"
    ],
    validateRow: (row: any) => {
      if (!row.email || !row.email.includes("@")) {
        return "Invalid email address";
      }
      if (!row.full_name || row.full_name.trim().length < 2) {
        return "Full name must be at least 2 characters";
      }
      return null;
    }
  },
  speakers: {
    requiredFields: [
      "full_name", "job_title", "company", "email", "phone",
      "bio", "profile_image", "session_topic", "session_time"
    ],
    validateRow: (row: any) => {
      if (!row.email || !row.email.includes("@")) {
        return "Invalid email address";
      }
      if (!row.session_topic || row.session_topic.trim().length < 5) {
        return "Session topic must be at least 5 characters";
      }
      return null;
    }
  }
};

function validateExcelStructure(headers: string[], category: Category): string | null {
  const requiredFields = categoryValidations[category].requiredFields;
  const missingFields = requiredFields.filter(field =>
    !headers.some(header => header.toLowerCase().replace(/\s+/g, "_") === field.toLowerCase())
  );

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(", ")}`;
  }

  return null;
}

function processExcelData(file: ArrayBuffer, category: Category) {
  const workbook = XLSX.read(file, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (rawData.length < 2) {
    throw new Error("Excel file must contain at least a header row and one data row");
  }

  // First row is headers
  const headers = rawData[0].map((header: any) =>
    String(header).toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  );

  // Validate structure
  const structureError = validateExcelStructure(headers, category);
  if (structureError) {
    throw new Error(structureError);
  }

  // Process data rows
  const processedData = [];
  const errors = [];

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.every((cell: any) => !cell)) continue; // Skip empty rows

    const rowData: any = {};
    headers.forEach((header: string, index: number) => {
      rowData[header] = row[index] || "";
    });

    // Validate row data
    const validation = categoryValidations[category].validateRow(rowData);
    if (validation) {
      errors.push(`Row ${i + 1}: ${validation}`);
      continue;
    }

    // Add metadata
    rowData.id = `${category}_${Date.now()}_${i}`;
    rowData.category = category;
    rowData.created_at = new Date().toISOString();
    rowData.status = "active";

    processedData.push(rowData);
  }

  return { processedData, errors };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = formData.get("category") as Category;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!category || !categoryValidations[category]) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }

    // Check file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel" // .xls
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)" },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Process Excel data
    const { processedData, errors } = processExcelData(arrayBuffer, category);

    if (errors.length > 0) {
      return NextResponse.json({
        error: "Data validation failed",
        details: errors.slice(0, 10), // Return first 10 errors
        totalErrors: errors.length
      }, { status: 400 });
    }

    if (processedData.length === 0) {
      return NextResponse.json(
        { error: "No valid data rows found in the file" },
        { status: 400 }
      );
    }

    // Save processed data to database
    try {
      const savedCount = await dataUploadService.saveData(category, processedData);

      return NextResponse.json({
        success: true,
        count: savedCount,
        category: category,
        message: `Successfully uploaded and saved ${savedCount} ${category} records`
      });
    } catch (dbError) {
      console.error("Database save error:", dbError);
      return NextResponse.json({
        error: "Failed to save data to database",
        details: dbError instanceof Error ? dbError.message : "Unknown database error"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Excel processing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
