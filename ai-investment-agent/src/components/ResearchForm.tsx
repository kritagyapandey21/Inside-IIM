"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";

interface ResearchFormProps {
  onSubmit: (companyName: string) => void;
  isLoading: boolean;
}

const EXAMPLE_COMPANIES = [
  "NVIDIA",
  "Apple",
  "Tesla",
  "Microsoft",
  "Amazon",
  "Google",
  "Meta",
  "Netflix",
];

const ResearchForm = forwardRef<HTMLInputElement, ResearchFormProps>(
  function ResearchForm({ onSubmit, isLoading }, externalRef) {
  const [companyName, setCompanyName] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Merge the internal ref with the forwarded one so the parent can focus it.
  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof externalRef === "function") externalRef(node);
    else if (externalRef) externalRef.current = node;
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim() && !isLoading) {
      onSubmit(companyName.trim());
    }
  };

  return (
    <div className="research-form-wrapper">
      <form onSubmit={handleSubmit} className="research-form">
        <div className={`input-container ${isFocused ? "focused" : ""}`}>
          <Search className="search-icon" size={20} />
          <input
            ref={setRefs}
            id="company-input"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter a company name (e.g., NVIDIA, Apple, Tesla)"
            disabled={isLoading}
            className="search-input"
            autoComplete="off"
          />
          <button
            id="submit-button"
            type="submit"
            disabled={!companyName.trim() || isLoading}
            className="submit-button"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="example-chips">
        <span className="chips-label">Try:</span>
        {EXAMPLE_COMPANIES.map((company) => (
          <button
            key={company}
            onClick={() => {
              setCompanyName(company);
              if (!isLoading) {
                onSubmit(company);
              }
            }}
            disabled={isLoading}
            className="chip"
          >
            {company}
          </button>
        ))}
      </div>
    </div>
  );
  }
);

export default ResearchForm;
