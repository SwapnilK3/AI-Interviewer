"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Props = {
  userId: string;
};

const DEFAULTS = {
  role: "Frontend Developer",
  level: "Mid",
  type: "Mixed",
  techstack: "React,TypeScript,Node.js",
  amount: 6,
};

const InterviewGenerateForm = ({ userId }: Props) => {
  const router = useRouter();
  const [role, setRole] = useState(DEFAULTS.role);
  const [level, setLevel] = useState(DEFAULTS.level);
  const [type, setType] = useState(DEFAULTS.type);
  const [techstack, setTechstack] = useState(DEFAULTS.techstack);
  const [amount, setAmount] = useState(DEFAULTS.amount);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!role.trim() || !level.trim() || !type.trim() || !techstack.trim()) {
      toast.error("Please complete all fields.");
      return;
    }

    if (amount < 1 || amount > 10) {
      toast.error("Number of questions must be between 1 and 10.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/interview/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: role.trim(),
          level: level.trim(),
          type: type.trim(),
          techstack: techstack.trim(),
          amount,
          userid: userId,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        interviewId?: string;
        error?: string;
      };

      if (!response.ok || !payload.success || !payload.interviewId) {
        throw new Error(payload.error || "Failed to generate interview.");
      }

      toast.success("Interview generated successfully.");
      router.push(`/interview/${payload.interviewId}`);
    } catch (error) {
      console.error("Interview generation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Unable to generate interview."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card-border w-full max-w-3xl">
      <div className="card p-8">
        <h3 className="mb-6">Create a New Interview</h3>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-light-100">Job Role</label>
            <input
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. Frontend Developer"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-light-100">Experience Level</label>
              <select
                className="input"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-light-100">Interview Type</label>
              <select
                className="input"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="Technical">Technical</option>
                <option value="Behavioral">Behavioral</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-light-100">Tech Stack (comma separated)</label>
            <input
              className="input"
              value={techstack}
              onChange={(event) => setTechstack(event.target.value)}
              placeholder="React,TypeScript,Node.js"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-light-100">Number of Questions</label>
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
            />
          </div>

          <Button className="btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Generating..." : "Start new interview"}
          </Button>
        </form>
      </div>
    </section>
  );
};

export default InterviewGenerateForm;
