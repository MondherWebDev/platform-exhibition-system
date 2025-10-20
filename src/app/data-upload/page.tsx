"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = "exhibitors" | "sponsors" | "hosted-buyers" | "speakers";

interface CategoryInfo {
  name: string;
  description: string;
  requiredFields: string[];
  sampleFile?: string;
}

const categories: Record<Category, CategoryInfo> = {
  exhibitors: {
    name: "Exhibitors",
    description: "Upload exhibitor company information and details",
    requiredFields: [
      "company_name", "contact_person", "email", "phone",
      "booth_number", "company_description", "website", "logo_url"
    ]
  },
  sponsors: {
    name: "Sponsors",
    description: "Upload sponsor company information and sponsorship details",
    requiredFields: [
      "company_name", "contact_person", "email", "phone",
      "sponsorship_level", "company_description", "website", "logo_url"
    ]
  },
  "hosted-buyers": {
    name: "Hosted Buyers",
    description: "Upload hosted buyer profiles and contact information",
    requiredFields: [
      "full_name", "company", "job_title", "email", "phone",
      "country", "industry", "bio", "profile_image"
    ]
  },
  speakers: {
    name: "Speakers",
    description: "Upload speaker profiles and session information",
    requiredFields: [
      "full_name", "job_title", "company", "email", "phone",
      "bio", "profile_image", "session_topic", "session_time"
    ]
  }
};

export default function DataUpload() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  const handleFileUpload = async (file: File) => {
    if (!selectedCategory) {
      setUploadMessage("Please select a category first");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", selectedCategory);

      const response = await fetch("/api/data-upload/excel", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadMessage(`✅ Successfully uploaded ${result.count} ${selectedCategory} records`);
      } else {
        setUploadMessage(`❌ Upload failed: ${result.error}`);
      }
    } catch (error) {
      setUploadMessage("❌ Upload failed: Network error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-600 py-4">
        <div className="container mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/events")}
              className="text-white hover:text-gray-200 transition-colors mr-4"
            >
              ← Back to Events
            </button>
            <h1 className="text-white text-xl font-bold">Data Upload Center</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Category Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Select Category to Upload</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(categories).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as Category)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedCategory === key
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <h3 className="font-semibold text-lg text-gray-800">{category.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{category.description}</p>
                  <div className="mt-2 text-xs text-gray-500">
                    Required fields: {category.requiredFields.length}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
          {selectedCategory && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  Upload {categories[selectedCategory].name} Data
                </h3>
                <p className="text-gray-600 mt-1">
                  Upload an Excel file (.xlsx, .xls) with {categories[selectedCategory].name.toLowerCase()} data
                </p>
              </div>

              {/* Required Fields */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Required Fields:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {categories[selectedCategory].requiredFields.map((field) => (
                    <span
                      key={field}
                      className="inline-block bg-white px-2 py-1 text-xs rounded border"
                    >
                      {field.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Upload Zone */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />

                <div className="space-y-4">
                  <div className="text-6xl">📊</div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      {isUploading ? "Uploading..." : "Drag and drop your Excel file here"}
                    </p>
                    <p className="text-gray-500">
                      or click to browse files
                    </p>
                  </div>

                  {isUploading && (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
                      <span className="text-sm text-gray-600">Processing file...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Message */}
              {uploadMessage && (
                <div className={`mt-4 p-4 rounded-lg ${
                  uploadMessage.includes("✅")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {uploadMessage}
                </div>
              )}

              {/* Sample Data Button */}
              <div className="mt-6 text-center">
                <button className="text-teal-600 hover:text-teal-800 text-sm underline">
                  Download sample Excel template for {categories[selectedCategory].name}
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Select the category you want to upload data for</li>
              <li>• Prepare your Excel file with the required fields listed above</li>
              <li>• Use the first row as headers matching the required field names</li>
              <li>• Ensure all required fields are filled for each record</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Supported formats: .xlsx, .xls</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
