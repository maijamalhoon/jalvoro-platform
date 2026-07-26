import { redirect } from "next/navigation";

export default function IndividualLoginPage() {
  redirect("/login?realm=individual&next=%2Fdashboard");
}
