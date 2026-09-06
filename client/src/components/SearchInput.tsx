// src/components/SearchInput.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  delay = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync localValue when parent value changes (e.g., after clear)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce the change to parent
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [localValue, delay, onChange, value]);

  // Focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div className="relative flex-1 min-w-[150px]">
      <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        placeholder={placeholder || "Search..."}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}
