"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { callProcessingApi } from "@/lib/processing";

type Card = {
  id: string;
  word: string;
  translation: string;
  type: "word" | "phrase";
  created_at: string;
  transcription: string;
  examples: Array<{ english: string; russian: string }>;
};

type Book = {
  id: string;
  title: string;
  status: "pending" | "extracting" | "processing" | "done" | "error";
  type: "original" | "retelling";
  created_at: string;
  progress: number;
  source_path?: string | null;
};

function ChevronIcon({ up }: { up: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {up ? (
        <path d="M18 15l-6-6-6 6" />
      ) : (
        <path d="M6 9l6 6 6-6" />
      )}
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [booksLoading, setBooksLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [profile, setProfile] = useState<{ plan: string; subscription_cancel_at: string | null } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelState, setCancelState] = useState<"idle" | "cancelling">("idle");

  // Upload text section
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadLanguage, setUploadLanguage] = useState("en");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        router.push("/auth");
        return;
      }

      setUserEmail(data.session.user.email || null);
      setUserId(data.session.user.id);
      setLoading(false);

      // Load user profile (plan)
      const { data: profileData } = await supabase
        .from("profiles")
        .select("plan, subscription_cancel_at")
        .eq("id", data.session.user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }


      // Load user books
      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });

      if (!booksError && booksData) {
        setBooks(booksData);
      }
      setBooksLoading(false);

      // Load user cards
      const { data: cardsData, error } = await supabase
        .from("cards")
        .select("*")
        .eq("user_id", data.session.user.id)
        .order("created_at", { ascending: false });

      if (!error && cardsData) {
        setCards(cardsData);
      }
      setCardsLoading(false);
    }

    checkSession();

    const savedLearning = localStorage.getItem('balaka_learning_language');
    if (savedLearning) setUploadLanguage(savedLearning);
  }, [router]);

 
    useEffect(() => {
    const hasProcessing = books.some(b => b.status === 'processing' || b.status === 'extracting');
    if (!hasProcessing || !userId) return;

    const interval = setInterval(async () => {
       const { data } = await supabase
        .from('books')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setBooks(data);
    }, 10000);

    return () => clearInterval(interval);
  }, [books, userId]);

  const loadBooks = async () => {

    if (!userId) return;
    
    setBooksLoading(true);
    const { data: booksData, error: booksError } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!booksError && booksData) {
      setBooks(booksData);
    }
    setBooksLoading(false);
  };

  const handleCreateRetelling = async (bookId: string) => {
    if (!userId) return;

    // Update local status to processing
    setBooks(prevBooks => 
      prevBooks.map(book => 
        book.id === bookId ? { ...book, status: 'processing' as const } : book
      )
    );

    try {
      const response = await callProcessingApi('retell', bookId);

      if (!response.ok) {
        throw new Error('Failed to create retelling');
      }

      // Reload books after success
      await loadBooks();
    } catch (error) {
      console.error('Error creating retelling:', error);
      // Update status to error
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === bookId ? { ...book, status: 'error' as const } : book
        )
      );
      alert('Error, try again');
    }
  };

  const handleRetry = async (bookId: string) => {
    await handleCreateRetelling(bookId);
  };

  const handleRetryFormat = async (bookId: string) => {
    if (!userId) return;
    await supabase
      .from('books')
      .update({ status: 'processing', progress: 0 })
      .eq('id', bookId)
      .eq('user_id', userId);
    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: 'processing' as const, progress: 0 } : book
      )
    );
    callProcessingApi('format', bookId);
  };

  const handleRetryExtraction = async (bookId: string) => {
    if (!userId) return;

    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: 'extracting' as const } : book
      )
    );

    try {
      const response = await callProcessingApi('extract', bookId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to extract text');
      }

      if (result.grace) {
        alert('You have reached your monthly limit of 2,000,000 characters. Anyway, we will finish this task for you for free.');
      }

      await loadBooks();
    } catch (error) {
      console.error('Error extracting text:', error);
      setBooks(prevBooks =>
        prevBooks.map(book =>
          book.id === bookId ? { ...book, status: 'error' as const } : book
        )
      );
      alert('Error, try again');
    }
  };

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
    } else if (file.name.endsWith('.epub') || file.name.endsWith('.pdf')) {
      // Text isn't known yet — it gets extracted server-side after upload.
      setFileContent('binary');
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
    if (file && (file.name.endsWith('.txt') || file.name.endsWith('.epub') || file.name.endsWith('.pdf'))) {
      handleFileSelect(file);
    }
  };

  const resetUploadForm = () => {
    setUploadTitle("");
    setSelectedFile(null);
    setFileContent("");
    setCoverFile(null);
    setCoverPreview(null);
    setUploadMessage(null);
    setShowUploadForm(false);
  };

  const handleUploadText = async () => {
    // Click-protection: disable immediately, before any async work starts.
    if (isUploading) return;

    setUploadMessage(null);

    if (!userId) return;

    if (!uploadTitle.trim()) {
      setUploadMessage("Please enter a title");
      return;
    }

    if (!selectedFile) {
      setUploadMessage("Please select a file");
      return;
    }

    setIsUploading(true);

    const needsExtraction = selectedFile.name.endsWith('.epub') || selectedFile.name.endsWith('.pdf');

    if (needsExtraction && selectedFile.size > 20 * 1024 * 1024) {
      setUploadMessage('Files must be under 20MB.');
      setIsUploading(false);
      return;
    }

    if (!needsExtraction && fileContent.length > 2000000) {
      setUploadMessage('toolarge');
      setIsUploading(false);
      return;
    }

    if (!needsExtraction && process.env.NEXT_PUBLIC_PRO_REQUIRED === 'true') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('plan, chars_used, period_start')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        await supabase.from('profiles').insert({
          id: userId,
          plan: 'free',
          chars_used: 0,
          period_start: new Date().toISOString(),
        });
        setUploadMessage('upgrade');
        setIsUploading(false);
        return;
      }

      if (profileError) {
        setUploadMessage('Error checking subscription status.');
        setIsUploading(false);
        return;
      }

      if (profileData.plan !== 'pro') {
        setUploadMessage('upgrade');
        setIsUploading(false);
        return;
      }

      let currentCharsUsed = profileData.chars_used || 0;
      const periodStart = new Date(profileData.period_start);
      const now = new Date();
      const daysSincePeriodStart = (now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSincePeriodStart > 30) {
        currentCharsUsed = 0;
        await supabase
          .from('profiles')
          .update({ chars_used: 0, period_start: now.toISOString() })
          .eq('id', userId);
      }

      const newCharsUsed = currentCharsUsed + fileContent.length;
      let graceUpload = false;

      if (newCharsUsed > 2000000) {
        if (currentCharsUsed >= 2000000) {
          setUploadMessage('limit');
          setIsUploading(false);
          return;
        }
        graceUpload = true;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ chars_used: newCharsUsed })
        .eq('id', userId);

      if (updateError) {
        setUploadMessage('Error updating usage statistics.');
        setIsUploading(false);
        return;
      }

      if (graceUpload) {
        window.alert('You have reached your monthly limit of 2,000,000 characters. Anyway, we will finish this task for you for free.');
      }
    }

    // Upload cover image if selected
    let coverUrl = '';
    if (coverFile) {
      const fileExt = coverFile.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: coverUploadError } = await supabase.storage
        .from('covers')
        .upload(fileName, coverFile, { contentType: coverFile.type });
      if (!coverUploadError) {
        const { data: urlData } = supabase.storage.from('covers').getPublicUrl(fileName);
        coverUrl = urlData.publicUrl;
      }
    }

    if (needsExtraction) {
      const { data: bookData, error } = await supabase
        .from('books')
        .insert({
          user_id: userId,
          title: uploadTitle.trim(),
          original_text: '',
          text_hash: '',
          type: 'original',
          status: 'extracting',
          language: uploadLanguage,
          cover_url: coverUrl,
        })
        .select()
        .single();

      if (error || !bookData) {
        console.error('Error saving book:', error);
        setUploadMessage('Error uploading file.');
        setIsUploading(false);
        return;
      }

      const fileExtension = selectedFile.name.endsWith('.pdf') ? 'pdf' : 'epub';
      const contentType = fileExtension === 'pdf' ? 'application/pdf' : 'application/epub+zip';
      const sourcePath = `${userId}/${bookData.id}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from('book-sources')
        .upload(sourcePath, selectedFile, { contentType });

      if (uploadError) {
        console.error('Error uploading source file:', uploadError);
        await supabase.from('books').update({ status: 'error' }).eq('id', bookData.id);
        setUploadMessage('Error uploading file.');
        setIsUploading(false);
        return;
      }

      const { error: pathUpdateError } = await supabase
        .from('books')
        .update({ source_path: sourcePath })
        .eq('id', bookData.id);

      if (pathUpdateError) {
        console.error('Error saving source path:', pathUpdateError);
        setUploadMessage('Error uploading file.');
        setIsUploading(false);
        return;
      }

      // Fire-and-forget: don't wait for extraction to finish. The account page
      // already polls every 10s and shows "Extracting text..." for this status,
      // so there's no need to block the form on it — matches the same pattern
      // used for /api/retell and /api/format.
      callProcessingApi('extract', bookData.id);

      resetUploadForm();
      setIsUploading(false);
      await loadBooks();
      return;
    }

    // .txt: text is already known client-side, no extraction needed
    const textHash = btoa(encodeURIComponent(fileContent.slice(0, 200))).slice(0, 50) + fileContent.length;

    const { data: bookData, error } = await supabase
      .from('books')
      .insert({
        user_id: userId,
        title: uploadTitle.trim(),
        original_text: fileContent,
        text_hash: textHash,
        type: 'original',
        status: 'pending',
        language: uploadLanguage,
        cover_url: coverUrl,
      })
      .select()
      .single();

    if (error || !bookData) {
      console.error('Error saving book:', error);
      setUploadMessage('Error uploading file.');
      setIsUploading(false);
      return;
    }

    resetUploadForm();
    setIsUploading(false);
    await loadBooks();
  };

const handleReadOriginal = async (bookId: string) => {
    if (!userId) return;

    setBooks(prevBooks =>
      prevBooks.map(book =>
        book.id === bookId ? { ...book, status: 'processing' as const } : book
      )
    );

    try {
      const response = await callProcessingApi('format', bookId);

      if (!response.ok) {
        throw new Error('Failed to format book');
      }

      await loadBooks();
    } catch (error) {
      console.error('Error formatting book:', error);
      setBooks(prevBooks =>
        prevBooks.map(book =>
          book.id === bookId ? { ...book, status: 'error' as const } : book
        )
      );
      alert('Error, try again');
    }
  };


  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!userId) return;

    const confirmed = confirm(`Are you sure you want to delete "${bookTitle}"?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Reload books after deletion
      await loadBooks();
    } catch (error) {
      console.error('Error deleting book:', error);
      alert('Error deleting book');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const handleUpgrade = async () => {
    if (!userId) return;
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
          userId,
          email: userEmail,
        }),
      });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!userId) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel your Pro subscription? You'll keep Pro access until the end of your current billing period, and it won't renew after that."
    );
    if (!confirmed) return;

    setCancelState("cancelling");

    try {
      const response = await fetch('/api/stripe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("plan, subscription_cancel_at")
          .eq("id", userId)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
        window.alert("Your subscription will end at the close of your current billing period. You'll keep Pro access until then.");
      } else {
        window.alert("Something went wrong. Please try again or contact support.");
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      window.alert("Something went wrong. Please try again or contact support.");
    } finally {
      setCancelState("idle");
    }
  };

  const handleResumeSubscription = async () => {
    if (!userId) return;

    setCancelState("cancelling");

    try {
      const response = await fetch('/api/stripe/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setProfile((prev) => (prev ? { ...prev, subscription_cancel_at: null } : prev));
        window.alert("Your subscription has been resumed. It will continue as normal.");
      } else {
        window.alert("Something went wrong. Please try again or contact support.");
      }
    } catch (error) {
      console.error('Resume subscription error:', error);
      window.alert("Something went wrong. Please try again or contact support.");
    } finally {
      setCancelState("idle");
    }
  };

  const toggleCardExpansion = (cardId: string) => {

    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  if (loading) {

    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[#57534e]">Loading...</p>
      </div>
    );
  }

  const COVER_COLORS = [
    'bg-[#b5c9e2]',
    'bg-[#e2b5b5]',
    'bg-[#b5e2c9]',
    'bg-[#e2d5b5]',
    'bg-[#c9b5e2]',
    'bg-[#e2c9b5]',
    'bg-[#b5e2e2]',
    'bg-[#d5e2b5]',
  ];

  return (

    <>
          <h1 className="mb-6 text-2xl font-semibold text-[#1a1a1a]">
            My account
          </h1>

          <div className="mb-8 flex flex-col gap-4 rounded-lg border border-[#e7e5e4] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-[#78716c]">Email:</p>
              <p className="mt-1 text-base text-[#1a1a1a]">{userEmail}</p>
            </div>
            <div className="flex items-center gap-4">
              {profile?.plan === 'free' && (
                <button
                  onClick={handleUpgrade}
                  disabled={checkoutLoading}
                  className="rounded bg-[#2c2c2c] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {checkoutLoading ? 'Loading...' : 'Upgrade to read your texts'}
                </button>
              )}
              {profile?.plan === 'pro' && !profile.subscription_cancel_at && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={cancelState === 'cancelling'}
                  className="text-sm text-[#78716c] underline hover:text-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelState === 'cancelling' ? 'Cancelling...' : 'Cancel Pro account'}
                </button>
              )}
              {profile?.plan === 'pro' && profile.subscription_cancel_at && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[#78716c]">
                    Pro (cancels on{' '}
                    {new Date(profile.subscription_cancel_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    )
                  </span>
                  <button
                    onClick={handleResumeSubscription}
                    disabled={cancelState === 'cancelling'}
                    className="text-sm text-[#1a1a1a] underline hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cancelState === 'cancelling' ? 'Resuming...' : 'Resume subscription'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <section className="mb-8">
            <button
              onClick={() => setShowUploadForm((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2c2c2c] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <UploadIcon />
              Upload text
              <span className="ml-1">
                <ChevronIcon up={showUploadForm} />
              </span>
            </button>
            {showUploadForm && (
              <div className="mt-3 space-y-4 rounded-lg border border-[#e7e5e4] bg-white px-6 py-6">
                <div>
                  <label htmlFor="uploadTitle" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
                    Title
                  </label>
                  <input
                    id="uploadTitle"
                    type="text"
                    placeholder="Book title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full rounded-lg border border-[#e7e5e4] bg-white px-4 py-2 text-sm text-[#1a1a1a]"
                  />
                </div>

                <div>
                  <label htmlFor="uploadLanguage" className="mb-1 block text-sm font-medium text-[#1a1a1a]">
                    Language
                  </label>
                  <select
                    id="uploadLanguage"
                    value={uploadLanguage}
                    onChange={(e) => setUploadLanguage(e.target.value)}
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
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="tr">Turkish</option>
                    <option value="pl">Polish</option>
                    <option value="nl">Dutch</option>
                    <option value="vi">Vietnamese</option>
                    <option value="th">Thai</option>
                    <option value="id">Indonesian</option>
                    <option value="bn">Bengali</option>
                    <option value="fa">Persian</option>
                    <option value="he">Hebrew</option>
                    <option value="ur">Urdu</option>
                    <option value="ro">Romanian</option>
                    <option value="hu">Hungarian</option>
                    <option value="cs">Czech</option>
                    <option value="sk">Slovak</option>
                    <option value="bg">Bulgarian</option>
                    <option value="el">Greek</option>
                    <option value="sv">Swedish</option>
                    <option value="no">Norwegian</option>
                    <option value="da">Danish</option>
                    <option value="fi">Finnish</option>
                    <option value="sr">Serbian</option>
                    <option value="hr">Croatian</option>
                    <option value="ms">Malay</option>
                    <option value="sw">Swahili</option>
                    <option value="az">Azerbaijani</option>
                    <option value="ka">Georgian</option>
                    <option value="hy">Armenian</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">
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

                <div>
                  <label className="mb-1 block text-sm font-medium text-[#1a1a1a]">
                    File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.epub,.pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div
                    onClick={handleDropZoneClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed ${
                      isDragging ? 'border-[#2c2c2c] bg-[#f5f5f4]' : 'border-[#d6d3d1] bg-white'
                    } px-6 py-6 text-center transition-colors`}
                    role="button"
                    tabIndex={0}
                  >
                    {selectedFile ? (
                      <>
                        <p className="text-sm font-medium leading-relaxed text-[#1a1a1a]">
                          {selectedFile.name}
                        </p>
                        <p className="mt-2 text-xs text-[#a8a29e]">Ready to upload</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed text-[#57534e]">
                          Drop a file here or click to select
                        </p>
                        <p className="mt-2 text-xs text-[#a8a29e]">Supported formats: .txt, .epub, .pdf</p>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUploadText}
                  disabled={isUploading || !uploadTitle.trim() || !selectedFile}
                  className="rounded bg-[#2c2c2c] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>

                {uploadMessage && (
                  <div>
                    {uploadMessage === 'upgrade' && (
                      <p className="text-sm text-[#78716c]">
                        Upload is available on the Pro plan.{' '}
                        <a href="/pricing" className="text-[#1a1a1a] underline underline-offset-2">
                          Upgrade →
                        </a>
                      </p>
                    )}
                    {uploadMessage === 'limit' && (
                      <p className="text-sm text-[#dc2626]">
                        You have reached your monthly limit of 2,000,000 characters.
                      </p>
                    )}
                    {uploadMessage === 'toolarge' && (
                      <p className="text-sm text-[#dc2626]">
                        This file is too large (max 2,000,000 characters per upload). Please split it into smaller parts.
                      </p>
                    )}
                    {uploadMessage !== 'upgrade' && uploadMessage !== 'limit' && uploadMessage !== 'toolarge' && (
                      <p className="text-sm text-[#dc2626]">{uploadMessage}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              My books
            </h2>
            {booksLoading ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Loading...</p>
              </div>
            ) : books.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Nothing here yet</p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {books.map((book) => (
                  <div key={book.id} className="flex flex-col h-full">
                    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-lg flex flex-col items-center justify-center p-3 text-center ${COVER_COLORS[book.id.charCodeAt(0) % COVER_COLORS.length]} ${book.status === 'done' ? 'cursor-pointer' : ''}`}
                    onClick={() => book.status === 'done' && router.push(`/account/reader/${book.id}`)}>

                      <span className="text-xs font-medium text-[#78716c] leading-snug">{book.title}</span>
                      <span className="mt-2 rounded bg-black/10 px-1.5 py-0.5 text-[10px] text-[#78716c]">{book.type}</span>
                    </div>
                    <div className="mt-2 flex flex-col flex-1">
  <p className="text-sm font-medium leading-snug text-[#1a1a1a] line-clamp-2">{book.title}</p>
  <p className="mt-0.5 text-xs text-[#a8a29e]">{formatDate(book.created_at)}</p>
  <div className="mt-auto pt-2 flex flex-col gap-1">
                      {book.status === 'pending' && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleReadOriginal(book.id)}
                            className="rounded bg-[#2c2c2c] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full"
                          >
                            Read original
                          </button>
                          <button
                            onClick={() => handleCreateRetelling(book.id)}
                            className="rounded border border-[#2c2c2c] px-3 py-1.5 text-xs font-medium text-[#2c2c2c] transition-opacity hover:opacity-70 w-full"
                          >
                            Create retelling
                          </button>
                        </div>
                      )}

                      {book.status === 'extracting' && (
                        <>
                          <span className="text-xs text-[#78716c]">Extracting text...</span>
                          <span className="text-[10px] text-[#a8a29e] leading-snug">This only takes a moment.</span>
                        </>
                      )}

                      {book.status === 'processing' && (
                        <>
                          <span className="text-xs text-[#78716c]">{(book.progress ?? 0) > 0 ? `Processing... ${book.progress}%` : 'Processing...'}</span>
                          <span className="text-[10px] text-[#a8a29e] leading-snug">Large texts take time. Keep this tab open!</span>
                        </>
                      )}
                      {book.status === 'done' && (
                        <a href={`/account/reader/${book.id}`} className="rounded bg-[#2c2c2c] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full text-center">
                          Read
                        </a>
                      )}
                      {book.status === 'error' && (
  <div className="flex flex-col gap-1">
    <span className="text-xs font-medium text-[#dc2626]">Error</span>
    {book.source_path ? (
      <button onClick={() => handleRetryExtraction(book.id)} className="rounded bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full">Retry extraction</button>
    ) : book.type === 'original' ? (
      <button onClick={() => handleRetryFormat(book.id)} className="rounded bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full">Retry formatting</button>
    ) : (
      <button onClick={() => handleRetry(book.id)} className="rounded bg-[#dc2626] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 w-full">Retry</button>
    )}
  </div>
)}
                      <button onClick={() => handleDeleteBook(book.id, book.title)} className="text-[10px] text-[#dc2626] hover:text-[#b91c1c] transition-colors text-left mt-1">Delete</button>
                    </div>
                    </div>
                  </div>
                ))}
              </div>

            )}
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-[#1a1a1a]">
              My cards
            </h2>
            {cardsLoading ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Loading...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="rounded-lg border border-[#e7e5e4] bg-white p-8 text-center">
                <p className="text-sm text-[#78716c]">Nothing here yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => {
                  const isExpanded = expandedCards.has(card.id);
                  
                  return (
                    <div
                      key={card.id}
                      onClick={() => toggleCardExpansion(card.id)}
                      className={`cursor-pointer transition-all duration-200 ${
                        isExpanded
                          ? "rounded-lg border border-[#e0e0e0] bg-white px-6 py-5"
                          : "rounded-lg border border-[#e7e5e4] bg-white p-4"
                      }`}
                      style={isExpanded ? { boxShadow: "0 4px 20px rgba(0,0,0,0.15)" } : undefined}
                    >
                      {isExpanded ? (
                        // EXPANDED STATE
                        <>
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-base font-bold text-[#1a1a1a]">
                              {card.word}
                            </p>
                            <span className="shrink-0 text-[#a8a29e]">
                              <ChevronIcon up={true} />
                            </span>
                          </div>
                          <p className="mt-2 text-base text-[#1a1a1a]">
                            {card.translation}
                          </p>
                          {card.transcription && (
                            <p className="mt-1 text-sm italic text-[#8a8580]">
                              {card.transcription}
                            </p>
                          )}
                          {card.examples && card.examples.length > 0 && (
                            <div className="mt-3 border-t border-[#e8e6e1] pt-3">
                              {card.examples.slice(0, 2).map((example, idx) => (
                                <div key={idx} className={idx > 0 ? "mt-3" : ""}>
                                  <p className="text-sm leading-snug text-[#333]">
                                    {example.english}
                                  </p>
                                  <p className="mt-0.5 text-sm leading-snug text-[#8a8580]">
                                    {example.russian}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        // COLLAPSED STATE
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-[#1a1a1a]">
                                {card.word}
                              </p>
                              <span className="rounded bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#78716c]">
                                {card.type === "word" ? "слово" : "фраза"}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-[#57534e]">
                              {card.translation}
                            </p>
                          </div>
                          <span className="shrink-0 text-[#a8a29e]">
                            <ChevronIcon up={false} />
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
    </>
  );
}
