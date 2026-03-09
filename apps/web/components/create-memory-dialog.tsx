"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateMemoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreateMemoryDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMemoryDialogProps) {
  const [text, setText] = useState("");
  const [memoryType, setMemoryType] = useState("episodic");
  const [tagsInput, setTagsInput] = useState("");
  const [source, setSource] = useState("local");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          memoryType,
          tags: tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          source,
        }),
      });

      if (res.ok) {
        toast.success("Memory created");
        setText("");
        setTagsInput("");
        onOpenChange(false);
        onCreated();
      } else {
        toast.error("Failed to create memory");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Memory</DialogTitle>
          <DialogDescription>
            Add a new memory to your knowledge base.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="text" className="text-[12px] text-muted-foreground">
              Memory text
            </Label>
            <Textarea
              id="text"
              placeholder="What do you want to remember?"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-[12px] text-muted-foreground">Type</Label>
              <Select value={memoryType} onValueChange={setMemoryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="episodic">Episodic</SelectItem>
                  <SelectItem value="semantic">Semantic</SelectItem>
                  <SelectItem value="procedural">Procedural</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[12px] text-muted-foreground">Store in</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags" className="text-[12px] text-muted-foreground">
              Tags (comma-separated)
            </Label>
            <Input
              id="tags"
              placeholder="bug, auth, deploy"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !text.trim()}>
              {submitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
