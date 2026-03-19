import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";
import { redirect } from "next/navigation";

const InterviewSectionSkeleton = ({ title }: { title: string }) => {
  return (
    <section className="flex flex-col gap-6 mt-8">
      <h2>{title}</h2>

      <div className="interviews-section">
        <div className="card-border w-full animate-pulse">
          <div className="card p-6 min-h-[170px]" />
        </div>
        <div className="card-border w-full animate-pulse max-sm:hidden">
          <div className="card p-6 min-h-[170px]" />
        </div>
      </div>
    </section>
  );
};

const UserInterviewsSection = async ({ userId }: { userId: string }) => {
  let userInterviews: Interview[] = [];

  try {
    const result = await getInterviewsByUserId(userId);
    userInterviews = result ?? [];
  } catch (error) {
    console.error("Failed to load user interviews:", error);
    userInterviews = [];
  }

  const hasPastInterviews = userInterviews.length > 0;

  return (
    <section className="flex flex-col gap-6 mt-8">
      <h2>Your Interviews</h2>

      <div className="interviews-section">
        {hasPastInterviews ? (
          userInterviews.map((interview) => (
            <InterviewCard
              key={interview.id}
              userId={userId}
              interviewId={interview.id}
              role={interview.role}
              type={interview.type}
              techstack={interview.techstack}
              createdAt={interview.createdAt}
            />
          ))
        ) : (
          <p>You haven&apos;t taken any interviews yet</p>
        )}
      </div>
    </section>
  );
};

const LatestInterviewsSection = async ({ userId }: { userId: string }) => {
  let allInterview: Interview[] = [];

  try {
    const result = await getLatestInterviews({ userId });
    allInterview = result ?? [];
  } catch (error) {
    console.error("Failed to load latest interviews:", error);
    allInterview = [];
  }

  const hasUpcomingInterviews = allInterview.length > 0;

  return (
    <section className="flex flex-col gap-6 mt-8">
      <h2>Take Interviews</h2>

      <div className="interviews-section">
        {hasUpcomingInterviews ? (
          allInterview.map((interview) => (
            <InterviewCard
              key={interview.id}
              userId={userId}
              interviewId={interview.id}
              role={interview.role}
              type={interview.type}
              techstack={interview.techstack}
              createdAt={interview.createdAt}
            />
          ))
        ) : (
          <p>There are no interviews available</p>
        )}
      </div>
    </section>
  );
};

async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <>
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>Get Interview-Ready with AI-Powered Practice & Feedback</h2>
          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Start an Interview</Link>
          </Button>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      <Suspense fallback={<InterviewSectionSkeleton title="Your Interviews" />}>
        <UserInterviewsSection userId={user.id} />
      </Suspense>

      <Suspense fallback={<InterviewSectionSkeleton title="Take Interviews" />}>
        <LatestInterviewsSection userId={user.id} />
      </Suspense>
    </>
  );
}

export default Home;
