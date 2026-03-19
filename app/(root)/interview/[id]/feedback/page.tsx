import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import {
  getInterviewById,
} from "@/lib/actions/general.action";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { db } from "@/firebase/admin";

const toPercent = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

const Feedback = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  if (!interview) redirect("/");

  const feedbackDoc = await db.collection("feedback").doc(id).get();
  const feedback = feedbackDoc.exists
    ? ({ id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback)
    : null;

  if (!feedback) {
    return (
      <section className="section-feedback">
        <div className="flex flex-col gap-6 items-center text-center">
          <h1 className="text-4xl font-semibold">Feedback not ready yet</h1>
          <p>We are still preparing your interview evaluation. Please try again.</p>

          <div className="buttons">
            <Button className="btn-secondary flex-1" asChild>
              <Link href="/">Back to dashboard</Link>
            </Button>

            <Button className="btn-primary flex-1" asChild>
              <Link href={`/interview/${id}/feedback`}>Retry</Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-feedback">
      <div className="flex flex-row justify-center text-center">
        <h1 className="text-4xl font-semibold leading-tight">
          Feedback on the Interview -{" "}
          <span className="capitalize">{interview.role}</span> Interview
        </h1>
      </div>

      <div className="card-border w-full max-w-3xl mx-auto">
        <div className="card p-8 text-center space-y-3">
          <p className="text-light-100">Total Score</p>
          <p className="text-6xl font-bold text-primary-200">{feedback.totalScore}</p>
          <p className="text-light-100">out of 100</p>

          <div className="flex items-center justify-center gap-2 text-sm">
            <Image src="/calendar.svg" width={18} height={18} alt="calendar" />
            <p>
              {feedback.createdAt
                ? dayjs(feedback.createdAt).format("MMM D, YYYY h:mm A")
                : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <hr />

      <div className="flex flex-col gap-3">
        <h2>Final Assessment</h2>
        <p>{feedback.finalAssessment}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h2>Category Scores</h2>
        {feedback.categoryScores.map((category, index) => (
          <div key={`${category.name}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <p className="font-bold">{category.name}</p>
              <p className="text-primary-200 font-bold">{category.score}/100</p>
            </div>

            <div className="h-2 w-full rounded-full bg-dark-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-200"
                style={{ width: toPercent(category.score) }}
              />
            </div>

            <p>{category.comment}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h3>Strengths</h3>
        <ul>
          {feedback.strengths.map((strength, index) => (
            <li key={index}>{strength}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h3>Areas for Improvement</h3>
        <ul>
          {feedback.areasForImprovement.map((area, index) => (
            <li key={index}>{area}</li>
          ))}
        </ul>
      </div>

      <div className="buttons">
        <Button className="btn-secondary flex-1">
          <Link href="/" className="flex w-full justify-center">
            <p className="text-sm font-semibold text-primary-200 text-center">
              Back to dashboard
            </p>
          </Link>
        </Button>

        <Button className="btn-primary flex-1">
          <Link
            href={`/interview/${id}`}
            className="flex w-full justify-center"
          >
            <p className="text-sm font-semibold text-black text-center">
              Retake Interview
            </p>
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default Feedback;
