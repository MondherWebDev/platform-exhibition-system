"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../firebaseConfig";

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
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        router.replace("/signin");
        return;
      }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

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

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1419] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] text-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push("/events")}
              className="text-gray-400 hover:text-white transition-colors mr-4"
            >
              ← Back to Events
            </button>
            <h1 className="text-2xl font-bold">Data Upload Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Logged in as:</span>
            <span className="px-3 py-1 rounded bg-white/10 text-white/90 text-sm">
              {user.email}
            </span>
            <button
              onClick={() => auth.signOut()}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>

        {uploadMessage && (
          <div className={`mb-4 p-3 rounded-lg ${
            uploadMessage.includes("✅")
              ? "bg-green-500/20 text-green-300 border border-green-500/30"
              : "bg-red-500/20 text-red-300 border border-red-500/30"
          }`}>
            {uploadMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h2 className="text-xl font-bold mb-4">Select Category</h2>
              <div className="space-y-3">
                {Object.entries(categories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as Category)}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      selectedCategory === key
                        ? "border-teal-500 bg-teal-500/20 text-teal-300"
                        : "border-white/10 bg-white/5 hover:bg-white/10 text-gray-300"
                    }`}
                  >
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{category.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {category.requiredFields.length} required fields
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="mb-4">
                  <h3 className="text-xl font-semibold">
                    Upload {categories[selectedCategory].name} Data
                  </h3>
                  <p className="text-gray-400 mt-1">
                    Upload an Excel file with {categories[selectedCategory].name.toLowerCase()} data
                  </p>
                </div>

                {/* Required Fields */}
                <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-semibold mb-3">Required Fields:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {categories[selectedCategory].requiredFields.map((field) => (
                      <span
                        key={field}
                        className="inline-block bg-white/10 px-2 py-1 text-xs rounded border border-white/20"
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
                      ? "border-teal-500 bg-teal-500/20"
                      : "border-white/20 hover:border-white/30"
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
                      <p className="text-lg font-medium">
                        {isUploading ? "Uploading..." : "Drag and drop your Excel file here"}
                      </p>
                      <p className="text-gray-400">
                        or click to browse files
                      </p>
                    </div>

                    {isUploading && (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-500"></div>
                        <span className="text-sm text-gray-400">Processing file...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sample Data Button */}
                <div className="mt-6 text-center">
                  <button className="text-teal-400 hover:text-teal-300 text-sm underline">
                    Download sample Excel template for {categories[selectedCategory].name}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-lg p-8 border border-white/10 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold mb-2">Select a Category</h3>
                <p className="text-gray-400">
                  Choose a category from the left panel to start uploading data
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {selectedCategory && (
          <div className="mt-6 bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
            <h3 className="font-semibold text-blue-300 mb-2">Instructions:</h3>
            <ul className="text-blue-200 text-sm space-y-1">
              <li>• Select the category you want to upload data for</li>
              <li>• Prepare your Excel file with the required fields listed above</li>
              <li>• Use the first row as headers matching the required field names</li>
              <li>• Ensure all required fields are filled for each record</li>
              <li>• Maximum file size: 10MB</li>
              <li>• Supported formats: .xlsx, .xls</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
