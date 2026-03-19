import InterviewGenerateForm from "@/components/InterviewGenerateForm";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

const Page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <>
      <h3>Interview generation</h3>
      <InterviewGenerateForm userId={user.id} />
    </>
  );
};

export default Page;
