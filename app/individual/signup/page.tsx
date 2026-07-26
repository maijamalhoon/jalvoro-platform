import { redirect } from "next/navigation";

export default function IndividualSignupPage() {
  redirect("/login?mode=signup&realm=individual&next=%2Fdashboard");
}
