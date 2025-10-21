"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../../firebaseConfig";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";
import * as XLSX from "xlsx";

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

  const downloadSampleTemplate = async (category: Category) => {
    try {
      const categoryInfo = categories[category];
      const sampleData = generateSampleData(category);

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([categoryInfo.requiredFields, ...sampleData]);

      // Set column widths
      const colWidths = categoryInfo.requiredFields.map(field => ({
        wch: Math.max(field.length, 15)
      }));
      ws['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, categoryInfo.name);

      // Generate filename
      const filename = `${category}_sample_template.xlsx`;

      // Write and download file
      XLSX.writeFile(wb, filename);

      setUploadMessage(`✅ Sample template downloaded: ${filename}`);
    } catch (error) {
      setUploadMessage("❌ Failed to generate sample template");
      console.error("Template generation error:", error);
    }
  };

  const generateSampleData = (category: Category): string[][] => {
    const sampleRows = [];

    // Generate 3 sample rows for each category
    for (let i = 0; i < 3; i++) {
      const row: string[] = [];

      categories[category].requiredFields.forEach(field => {
        switch (field) {
          case 'company_name':
            row.push(`Sample Company ${i + 1}`);
            break;
          case 'contact_person':
            row.push(`John Doe ${i + 1}`);
            break;
          case 'email':
            row.push(`contact${i + 1}@samplecompany.com`);
            break;
          case 'phone':
            row.push(`+1-555-012${i}`);
            break;
          case 'booth_number':
            row.push(`B${String(i + 1).padStart(3, '0')}`);
            break;
          case 'company_description':
            row.push(`This is a sample description for company ${i + 1}. We provide excellent services and products.`);
            break;
          case 'website':
            row.push(`https://www.samplecompany${i + 1}.com`);
            break;
          case 'logo_url':
            row.push(`https://via.placeholder.com/200x100?text=Logo${i + 1}`);
            break;
          case 'sponsorship_level':
            row.push(i < 3 ? ['Gold', 'Silver', 'Bronze'][i] : 'Silver');
            break;
          case 'full_name':
            row.push(`Jane Smith ${i + 1}`);
            break;
          case 'company':
            row.push(`Sample Corp ${i + 1}`);
            break;
          case 'job_title':
            row.push(i < 3 ? ['CEO', 'Marketing Manager', 'Sales Director'][i] : 'Manager');
            break;
          case 'country':
            row.push(i < 3 ? ['USA', 'Canada', 'UK'][i] : 'USA');
            break;
          case 'industry':
            row.push(i < 3 ? ['Technology', 'Healthcare', 'Finance'][i] : 'Technology');
            break;
          case 'bio':
            row.push(`Experienced professional with ${i + 5} years in the industry. Passionate about innovation and excellence.`);
            break;
          case 'profile_image':
            row.push(`https://via.placeholder.com/150x150?text=Profile${i + 1}`);
            break;
          case 'session_topic':
            row.push(`Future of Technology - Part ${i + 1}`);
            break;
          case 'session_time':
            row.push(`2024-01-${String(i + 15).padStart(2, '0')} 14:00:00`);
            break;
          default:
            row.push(`Sample ${field.replace(/_/g, ' ')}`);
        }
      });

      sampleRows.push(row);
    }

    return sampleRows;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>

      {/* Header */}
      <header className="relative bg-gradient-to-r from-blue-900/90 via-purple-900/90 to-blue-900/90 backdrop-blur-xl border-b border-blue-500/30 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="text-blue-400 text-3xl animate-pulse">📊</div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Data Upload Center
              </h1>
              <p className="text-blue-200/80 text-sm mt-1">Upload and manage Excel data for all event categories</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="group relative px-4 py-2 text-gray-300 hover:text-white transition-all duration-300"
            >
              <span className="relative z-10">Back to Dashboard</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <button
              onClick={() => auth.signOut()}
              className="relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2.5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 hover:scale-105"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 relative">
        {/* Toast Notifications */}
        {uploadMessage && (
          <div className={`mb-6 p-4 rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300 transform animate-in slide-in-from-top-2 ${
            uploadMessage.includes("✅")
              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 shadow-emerald-500/20"
              : "bg-red-500/20 text-red-300 border-red-500/30 shadow-red-500/20"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`text-2xl ${uploadMessage.includes("✅") ? "text-emerald-400" : "text-red-400"}`}>
                {uploadMessage.includes("✅") ? "✅" : "❌"}
              </div>
              <p className="font-medium">{uploadMessage}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <div className="text-blue-400 text-xl">📂</div>
                </div>
                <h2 className="text-xl font-bold text-white">Select Category</h2>
              </div>
              <div className="space-y-3">
                {Object.entries(categories).map(([key, category]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key as Category)}
                    className={`group w-full p-4 rounded-xl border text-left transition-all duration-300 hover:scale-[1.02] ${
                      selectedCategory === key
                        ? "border-blue-400 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white shadow-lg shadow-blue-500/20"
                        : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-white transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 group-hover:text-gray-300 transition-colors">
                          {category.description}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 bg-white/10 text-xs rounded-full border border-white/20 text-gray-400">
                            {category.requiredFields.length} fields
                          </span>
                        </div>
                      </div>
                      <div className={`text-2xl transition-all duration-300 ${
                        selectedCategory === key ? "text-blue-400 scale-110" : "text-gray-500 group-hover:text-gray-400"
                      }`}>
                        {key === "exhibitors" && "🏢"}
                        {key === "sponsors" && "🏆"}
                        {key === "hosted-buyers" && "👥"}
                        {key === "speakers" && "🎤"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="lg:col-span-2">
            {selectedCategory ? (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <div className="text-purple-400 text-xl">
                        {selectedCategory === "exhibitors" && "🏢"}
                        {selectedCategory === "sponsors" && "🏆"}
                        {selectedCategory === "hosted-buyers" && "👥"}
                        {selectedCategory === "speakers" && "🎤"}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        Upload {categories[selectedCategory].name} Data
                      </h3>
                      <p className="text-gray-400 mt-1">
                        Upload an Excel file with {categories[selectedCategory].name.toLowerCase()} data
                      </p>
                    </div>
                  </div>
                </div>

                {/* Required Fields */}
                <div className="mb-8 p-6 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/10">
                  <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="text-blue-400">📋</div>
                    Required Fields:
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedCategory && categories[selectedCategory]!.requiredFields.map((field: string, index: number) => (
                      <div
                        key={field}
                        className="group flex items-center gap-2 bg-white/10 px-3 py-2 text-sm rounded-lg border border-white/20 text-gray-300 hover:bg-white/20 transition-colors"
                      >
                        <span className="w-5 h-5 bg-blue-500/20 text-blue-400 rounded-full text-xs flex items-center justify-center font-mono">
                          {index + 1}
                        </span>
                        <span className="font-medium">{field.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload Zone */}
                <div
                  className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 group ${
                    dragActive
                      ? "border-blue-400 bg-gradient-to-br from-blue-500/20 to-purple-500/20 scale-[1.02]"
                      : "border-white/20 hover:border-white/30 hover:bg-white/5"
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

                  <div className="space-y-6">
                    <div className={`text-8xl transition-transform duration-300 ${dragActive ? "scale-110" : "group-hover:scale-105"}`}>
                      {isUploading ? "⏳" : "📊"}
                    </div>
                    <div>
                      <p className="text-2xl font-medium text-white mb-2">
                        {isUploading ? "Uploading your data..." : "Drag and drop your Excel file here"}
                      </p>
                      <p className="text-gray-400 text-lg">
                        {isUploading ? "Please wait while we process your file" : "or click to browse files"}
                      </p>
                    </div>

                    {isUploading && (
                      <div className="flex items-center justify-center space-x-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="text-lg text-gray-300">Processing file...</span>
                      </div>
                    )}

                    {!isUploading && (
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          .xlsx files
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          .xls files
                        </span>
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          Max 10MB
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => selectedCategory && downloadSampleTemplate(selectedCategory)}
                    className="group relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/25 hover:scale-105 flex items-center gap-3"
                  >
                    <FontAwesomeIcon icon={faDownload} className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
                    Download Sample Template
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center shadow-2xl backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="text-8xl animate-bounce">📋</div>
                  <div>
                    <h3 className="text-2xl font-semibold text-white mb-3">Select a Category</h3>
                    <p className="text-gray-400 text-lg max-w-md mx-auto">
                      Choose a category from the left panel to start uploading your data
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                      <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: "0.2s"}}></div>
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: "0.4s"}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        {selectedCategory && (
          <div className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <div className="text-blue-400 text-xl">💡</div>
              </div>
              <div>
                <h3 className="font-semibold text-blue-300 mb-3 text-lg">Instructions:</h3>
                <ul className="text-blue-200 space-y-2">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Select the category you want to upload data for</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Prepare your Excel file with the required fields listed above</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Use the first row as headers matching the required field names</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Ensure all required fields are filled for each record</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Maximum file size: 10MB • Supported formats: .xlsx, .xls</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
