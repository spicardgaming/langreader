"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("en");
  const [type, setType] = useState<"original" | "retelling">("original");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const { data } = await supabase.auth.getSession();

      
      if (!data.session) {
        router.push("/auth");
        return;
      }

      const userEmail = data.session.user.email;
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

      if (userEmail !== adminEmail) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      setHasAccess(true);
      setLoading(false);
    }

    checkAccess();
  }, [router]);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    
    if (file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.txt')) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    setUploadMessage(null);

    if (!title.trim()) {
      setUploadMessage("Please enter a book title");

      return;
    }

    if (!selectedFile || !fileContent) {
      setUploadMessage("Please select a .txt file");
      return;
    }

    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }

      // Calculate text hash for duplicate detection
      const textHash = btoa(encodeURIComponent(fileContent.slice(0, 200))).slice(0, 50) + fileContent.length;

        // Upload cover image if selected
let coverUrl = '';
if (coverFile) {
  const fileExt = coverFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const { error: uploadError } = await supabase.storage
    .from('covers')
    .upload(fileName, coverFile, { contentType: coverFile.type });
  if (!uploadError) {
    const { data: urlData } = supabase.storage
      .from('covers')
      .getPublicUrl(fileName);
    coverUrl = urlData.publicUrl;
  }
}

      if (type === 'original') {
        // Save as original book with status 'done'
        const { error } = await supabase
          .from('books')
          .insert({
            user_id: session.user.id,
            title: title.trim(),
            original_text: fileContent,
            retelling_text: '',
            text_hash: textHash,
            type: 'original',
            status: 'done',
            language: language,
            cover_url: coverUrl
          });

        if (error) {
          console.error('Error saving book:', error);
          setUploadMessage('Error uploading book');
          setIsUploading(false);
          return;
        }

        setUploadMessage('Book uploaded successfully');
        setCoverFile(null);
        setCoverPreview(null);
        // Clear form
        setTitle('');
        setLanguage('en');
        setType('original');
        setSelectedFile(null);
        setFileContent('');
        setIsUploading(false);
      } else {
        // Save as retelling book with status 'pending'
        const { data: bookData, error: insertError } = await supabase
          .from('books')
          .insert({
            user_id: session.user.id,
            title: title.trim(),
            original_text: fileContent,
            retelling_text: '',
            text_hash: textHash,
            type: 'retelling',
            status: 'pending',
            language: language,
            cover_url: coverUrl
          })
          .select()
          .single();

        if (insertError || !bookData) {
          console.error('Error saving book:', insertError);
          setUploadMessage('Error uploading book');
          setIsUploading(false);
          return;
        }

        // Call /api/retell to generate retelling
        const response = await fetch('/api/retell', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bookId: bookData.id, userId: session.user.id }),
        });

        if (!response.ok) {
          setUploadMessage('Book uploaded but retelling generation failed');
          setIsUploading(false);
          return;
        }

        setUploadMessage('Book uploaded successfully and retelling is being generated');
        setCoverFile(null);
        setCoverPreview(null);
        
        // Clear form
        setTitle('');
        setLanguage('en');
        setType('original');
        setSelectedFile(null);
        setFileContent('');
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadMessage('Error uploading book');
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Loading...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-[700px] mx-auto py-12 px-4">
        <h1 className="text-2xl font-semibold text-[#1a1a1a]">Access denied</h1>
      </div>
    );
  }

  return (
    <div className="max-w-[700px] mx-auto py-12 px-4">
      <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">
        Admin — Upload book
      </h1>

      <div className="space-y-4">
        {/* Title input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[#1a1a1a] mb-1">
            Book title
          </label>
          <input
            id="title"
            type="text"
            placeholder="Book title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-2 text-sm text-[#1a1a1a]"
          />
        </div>

        {/* Language select */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-[#1a1a1a] mb-1">
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-2 text-sm text-[#1a1a1a]"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="uk">Ukrainian</option>
            <option value="ca">Catalan</option>
          </select>
        </div>

        {/* Type select */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-[#1a1a1a] mb-1">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as "original" | "retelling")}
            className="w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-2 text-sm text-[#1a1a1a]"
          >
            <option value="original">Original (read original)</option>
            <option value="retelling">Retelling (simplified retelling)</option>
          </select>
        </div>

        {/* Cover image */}
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
            Cover image (optional)
          </label>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleCoverSelect}
            className="hidden"
          />
          <div
            onClick={() => coverInputRef.current?.click()}
            className="flex cursor-pointer items-center gap-4 rounded-lg border border-[#e7e5e4] bg-white p-4 hover:bg-[#f9f9f9] transition-colors"
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" className="h-24 w-16 rounded object-cover" />
            ) : (
              <div className="flex h-24 w-16 items-center justify-center rounded bg-[#f5f5f5]">
                <span className="text-xs text-[#a8a29e]">2:3</span>
              </div>
            )}
            <div>
              <p className="text-sm text-[#57534e]">
                {coverFile ? coverFile.name : 'Click to select image'}
              </p>
              <p className="mt-1 text-xs text-[#a8a29e]">JPG, PNG or WebP. Recommended: 400×600px</p>
            </div>
          </div>
        </div>

        {/* File upload zone */}
        <div>
          <label className="block text-sm font-medium text-[#1a1a1a] mb-1">
            Upload file
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div
            onClick={handleDropZoneClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
              isDragging ? 'border-[#2c2c2c] bg-[#f5f5f4]' : 'border-[#d6d3d1] bg-white'
            } px-6 py-8 text-center transition-colors`}
            role="button"
            tabIndex={0}
          >
            {selectedFile ? (
              <>
                <p className="text-sm leading-relaxed text-[#1a1a1a] sm:text-base font-medium">
                  {selectedFile.name}
                </p>
                <p className="mt-2 text-xs text-[#a8a29e]">
                  Ready to upload
                </p>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-[#57534e] sm:text-base">
                  Drop a .txt file here or click to select
                </p>
                <p className="mt-2 text-xs text-[#a8a29e]">
                  Supported format: .txt
                </p>
              </>
            )}
          </div>
        </div>

        {/* Upload button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !title.trim() || !selectedFile}
          className="rounded bg-[#2c2c2c] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>

        {/* Success/Error message */}
        {uploadMessage && (
          <p className={`text-sm mt-4 ${
            uploadMessage.includes('successfully') ? 'text-[#047857]' : 'text-[#dc2626]'
          }`}>
            {uploadMessage}
          </p>
        )}
      </div>
    </div>
  );
}
